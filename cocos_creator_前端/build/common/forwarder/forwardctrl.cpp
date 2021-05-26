#include "forwardctrl.h"
#include "utils.h"
#include "aes_ctr.h"
#include "aes.h"
#include <errno.h>

namespace spd = spdlog;
using namespace std;
using namespace rapidjson;
using namespace forwarder;


size_t ForwardCtrl::bufferNum = 8;
UniqID ForwardCtrl::ForwardCtrlCount = 0;

ForwardCtrl::ForwardCtrl() :
	poolForwardServerENet(sizeof(ForwardServerENet)),
	poolForwardServerWS(sizeof(ForwardServerWS)),
	poolForwardServerTCP(sizeof(ForwardServerTcp)),
	serverNum(0),
	released(false),
	base64Codec(Base64Codec::get()),
	isExit(false),
	curProcessServer(nullptr),
	curProcessClient(nullptr),
	curProcessHeader(nullptr),
	curProcessData(nullptr),
    curProcessPacketWS(nullptr),
    curProcessPacketENet(nullptr),
	curProcessDataLength(0),
	id(0)
{
#ifdef DEBUG_MODE
	printf("[forwarder] ForwardCtrl created.\n");
#endif
	buffers = new uint8_t*[bufferNum];
    bufferSize = new size_t[bufferNum]{0};
    bufferOffset = new size_t[bufferNum]{0};
	for (size_t i = 0; i < bufferNum; i++) {
		bufferSize[i] = 0xff;
		buffers[i] = new uint8_t[bufferSize[i]]{ 0 };
	}
	//default
	handleFuncs[HandleRule::SysCmd] = &ForwardCtrl::handlePacket_SysCmd;
    handleFuncs[HandleRule::Forward] = &ForwardCtrl::handlePacket_Forward;
    handleFuncs[HandleRule::BatchForward] = &ForwardCtrl::handlePacket_BatchForward;
    handleFuncs[HandleRule::Process] = &ForwardCtrl::handlePacket_Process;
	id = ++ForwardCtrlCount;
}



ForwardCtrl::~ForwardCtrl() {
	release();
}


void ForwardCtrl::release() {
	if (released) {
		return;
	}
	released = true;
#ifdef DEBUG_MODE
	printf("[forwarder] ForwardCtrl released\n");
#endif
	for (size_t i = 0; i < bufferNum; i++) {
		if (buffers[i]) {
			delete[] buffers[i];
		}
	}
	delete[] buffers;
	delete[] bufferSize;
	while (servers.size() > 0) {
		ForwardServer* server = servers.back();
		servers.pop_back();
        server->release();
		if (server->netType == NetType::WS) {
			poolForwardServerWS.del(dynamic_cast<ForwardServerWS*>(server));
		} else if (server->netType == NetType::ENet) {
			poolForwardServerENet.del(dynamic_cast<ForwardServerENet*>(server));
		} else if (server->netType == NetType::TCP) {
			poolForwardServerTCP.del(dynamic_cast<ForwardServerTcp*>(server));
		}
	}
	poolForwardServerENet.clear();
	poolForwardServerWS.clear();
	poolForwardServerTCP.clear();
	handleFuncs.clear();
}


void ForwardCtrl::setupLogger(const char* filename) {
	std::vector<spdlog::sink_ptr> sinks;
	if (filename && strlen(filename) > 0) {
		sinks.push_back(make_shared<spdlog::sinks::rotating_file_sink_st>(filename, "txt", 1048576 * 5, 3));
	}
	//sinks.push_back(make_shared<spdlog::sinks::daily_file_sink_st>(filename, "txt", 0, 0));
#ifdef _MSC_VER
	sinks.push_back(make_shared<spdlog::sinks::wincolor_stdout_sink_st>());
#else
	sinks.push_back(make_shared<spdlog::sinks::stdout_sink_st>());
#endif
	std::string name("ctrl" + to_string(id));
	std::shared_ptr<spdlog::logger> obj = make_shared<spdlog::logger>(name, begin(sinks), end(sinks));
	if (spdlog::get(name)) {
		spdlog::drop(name);
	}
	spdlog::register_logger(obj);
    obj->flush_on(spdlog::level::debug);
	spdlog::set_pattern("[%D %H:%M:%S:%e][%l] %v");
    spdlog::set_level(spdlog::level::err); // Default
    setLogger(obj);
	logInfo("logger created successfully.");
    for (auto it = servers.begin(); it != servers.end(); it++) {
        ForwardServer* server = *it;
        if (server) {
            server->setLogger(obj);
        }
    }
}



void ForwardCtrl::setLogLevel(spdlog::level::level_enum lv) {
    if(logger) logger->set_level(lv);
}


void ForwardCtrl::setServerDebug(UniqID serverId, bool enabled) {
    ForwardServer* server = getServerByID(serverId);
    if (server) {
        server->setDebug(enabled);
    }
}

ForwardServer* ForwardCtrl::createServerByNetType(NetType& netType) {
	if (netType == NetType::ENet) {
		return static_cast<ForwardServer*>(poolForwardServerENet.add());
	} else if (netType == NetType::WS) {
		return static_cast<ForwardServer*>(poolForwardServerWS.add());
	} else if (netType == NetType::TCP) {
		return static_cast<ForwardServer*>(poolForwardServerTCP.add());
	}
	return nullptr;
}

void ForwardCtrl::initServers(rapidjson::Value& serversConfig) {
	serverNum = serversConfig.GetArray().Size();
	for (rapidjson::Value& serverConfig : serversConfig.GetArray()) {
		createServer(serverConfig);
	}

	// init dest host
	for (auto it = servers.begin(); it != servers.end(); it++) {
		ForwardServer* server = *it;
		int destId = server->destId;
		if (!destId){
			logDebug("Server[{0}] has no destId");
			continue;
		}
		for (auto it2 = servers.begin(); it2 != servers.end(); it2++) {
			ForwardServer* _server = *it2;
			if (_server->id == destId) {
				server->dest = _server;
				logDebug("Server[{0}] -> Server[{1}]", server->id, _server->id);
				break;
			}
		}
		if (!server->dest){
			logDebug("Server[{0}] has no dest server", server->id);
		}
	}
}
 
uint32_t ForwardCtrl::createServer(rapidjson::Value& serverConfig) {
    auto sNetType = serverConfig["netType"].GetString();
    NetType netType;
    if (strcmp(sNetType, "enet") == 0) {
        netType = NetType::ENet;
    } else if (strcmp(sNetType, "ws") == 0) {
        netType = NetType::WS;
    } else if (strcmp(sNetType, "tcp") == 0) {
        netType = NetType::TCP;
    } else {
        logError("[forwarder] createServer failed, wrong netType:{0}", sNetType);
        return 0;
    }
	ForwardServer* server = createServerByNetType(netType);
	ReturnCode code = server->initCommon(serverConfig);
	if (code == ReturnCode::Err) {
		return  static_cast<uint32_t>(code);
	}
	server->id = serverConfig["id"].GetInt();
	servers.push_back(server);
	serverDict[server->id] = server;
    if (logger) {
        server->setLogger(logger);
    }

	if(server->netType == NetType::TCP) {
        ForwardServerTcp* tcpServer = dynamic_cast<ForwardServerTcp*>(server);
        tcpServer->setMessageHandler(std::bind(
                &ForwardCtrl::onTCPReceived,
                this,
                tcpServer,
                std::placeholders::_1,
                std::placeholders::_2));
        tcpServer->setOpenHandler(std::bind(
                &ForwardCtrl::onTCPConnected,
                this,
                tcpServer,
                std::placeholders::_1));
        tcpServer->setCloseHandler(std::bind(
                &ForwardCtrl::onTCPDisconnected,
                this,
                tcpServer,
                std::placeholders::_1));
    }
	server->init(serverConfig);

	for (auto it = servers.begin(); it != servers.end(); it++) {
		ForwardServer* _server = *it;
		if (_server->id == server->destId) {
			server->dest = _server;
			break;
		}
	}
	return server->id;
}

ReturnCode ForwardCtrl::removeServerByID(UniqID serverId) {
	auto it_server = serverDict.find(serverId);
	if (it_server == serverDict.end()) {
		return ReturnCode::Err;
	}
	for (auto it = servers.begin(); it != servers.end(); it++) {
		ForwardServer* server = *it;
		if (server->destId == serverId) {
			server->dest = nullptr;
		}
	}
	serverDict.erase(it_server);
	return ReturnCode::Ok;
}

ForwardServer* ForwardCtrl::getServerByID(UniqID serverId) const {
	auto it_server = serverDict.find(serverId);
	if (it_server == serverDict.end())
		return nullptr;
	return it_server->second;
}

void ForwardCtrl::registerCallback(Event evt, eventCallback callback) {

}

ReturnCode ForwardCtrl::sendPacket(ForwardParam& param) {
    return param.server->sendPacket(param.client, param.packet);
}

 

ReturnCode ForwardCtrl::broadcastPacket(ForwardParam& param) {
    logDebugS(param.server, "broadcastPacket begin");
    param.server->broadcastPacket(param.packet);
    logDebugS(param.server, "broadcast end,netType:{0}, len:{1}, clientNum:{2}", static_cast<int>(param.server->netType), param.packet->getTotalLength(), param.server->clients.size());
    return ReturnCode::Ok;
}

uint8_t* ForwardCtrl::getBuffer(uint8_t bufferID, size_t n) {
    if(n > MaxBufferSize) {
        logError("[forwarder] getBuffer[{0}], exceed max size: {1}", bufferID, n);
        return nullptr;
    }
    uint8_t* buffer = buffers[bufferID];
    size_t size = bufferSize[bufferID];
    if (!buffer || n > size) {
        while (n > size) {
            size = size << 1;
        }
        if (buffer) {
            delete[] buffer;
        }
        buffer = new uint8_t[size]{ 0 };
        logDebug("[forwarder] change buffer[{0}] size: {1}=>{2} success.", bufferID, bufferSize[bufferID], size);
        bufferSize[bufferID] = size;
        buffers[bufferID] = buffer;
    }
    return buffer;
}


void ForwardCtrl::beginBatchForward(UniqID serverId) {
    ForwardServer* outServer = getServerByID(serverId);
    if(!outServer) {
        return;
    }
    outServer->batchBufferOffset = 0;
}

ReturnCode ForwardCtrl::endBatchForward(UniqID serverId, UniqID clientId) {
    ForwardServer* outServer = getServerByID(serverId);
    if(!outServer) {
        // logError("[forwarder][endBatchForward] outServer not found, serverId={0}", serverId);
        return ReturnCode::Err;
    }
    size_t packetLength = outServer->batchBufferOffset;
    outServer->batchBufferOffset = 0;
    if(packetLength <= 0) {
        return ReturnCode::Err;
    }
    ForwardClient* outClient = nullptr;
    if (clientId) {
        outClient = outServer->getClient(clientId);
        if(!outClient) {
            logError("[forwarder][endBatchForward] outClient not found, clientId={0}", clientId);
            return ReturnCode::Err;
        }
    }
    uint8_t* buffer = outServer->batchBuffer;
    ForwardPacketPtr outPacket = createPacket(outServer->netType, packetLength);
    outPacket->setRaw(buffer, packetLength);
    ForwardParam param;
    param.header = nullptr;
    param.packet = outPacket;
    param.client = outClient;
    param.server = outServer;
    if (outClient) {
        return sendPacket(param);
    }
    else {
        return broadcastPacket(param);
    }

    
}


ReturnCode ForwardCtrl::sendBinary(UniqID serverId, UniqID clientId, uint8_t* data, size_t dataLength, SendFlags sendFlags) {
   	const bool forwardMode = false;
	const UniqID forwardServerId = 0;
	const UniqID forwardClientId = 0;
    return _sendBinary(serverId, clientId,
	 	data, dataLength,
	  	forwardMode, forwardServerId, forwardClientId,
	  	sendFlags);
}

ReturnCode ForwardCtrl::sendText(UniqID serverId, UniqID clientId, std::string& data, SendFlags sendFlags) {
   	const bool forwardMode = false;
	const UniqID forwardServerId = 0;
	const UniqID forwardClientId = 0;
    return _sendText(serverId, clientId, 		
		data,
	  	forwardMode, forwardServerId, forwardClientId,
	  	sendFlags);
}

ReturnCode ForwardCtrl::sendText(UniqID serverId, UniqID clientId, const char* data, SendFlags sendFlags) {
    const bool forwardMode = false;
	const UniqID forwardServerId = 0;
	const UniqID forwardClientId = 0;
	return _sendText(serverId, clientId, 
		data,
	  	forwardMode, forwardServerId, forwardClientId,
	  	sendFlags);
}

ReturnCode ForwardCtrl::broadcastBinary(UniqID serverId, uint8_t* data, size_t dataLength, SendFlags sendFlags) {
    const UniqID clientId = 0;
    sendFlags |= SendFlag_Broadcast;
    return sendBinary(serverId, clientId, data, dataLength, sendFlags);
}

ReturnCode ForwardCtrl::broadcastText(UniqID serverId, std::string& data, SendFlags sendFlags) {
    const UniqID clientId = 0;
    sendFlags |= SendFlag_Broadcast;
    return sendText(serverId, clientId, data, sendFlags);
}

ReturnCode ForwardCtrl::broadcastText(UniqID serverId, const char* data, SendFlags sendFlags) {
    const UniqID clientId = 0;
    sendFlags |= SendFlag_Broadcast;
    return sendText(serverId, clientId, data, sendFlags);
}

ReturnCode ForwardCtrl::forwardBinary(UniqID serverId, UniqID clientId, uint8_t* data, size_t dataLength,
                                      UniqID forwardServerId,
                                      UniqID forwardClientId,
                                      SendFlags sendFlags) {
    const bool forwardMode = true;
    return _sendBinary(serverId, clientId, data, dataLength,
                       forwardMode,
                       forwardServerId,
                       forwardClientId,
                       sendFlags);
}

ReturnCode ForwardCtrl::forwardText(UniqID serverId, UniqID clientId, std::string& data,
                                    UniqID forwardServerId,
                                    UniqID forwardClientId,
                                    SendFlags sendFlags) {
    const bool forwardMode = true;
    return _sendText(serverId, clientId, data,
                       forwardMode,
                       forwardServerId,
                       forwardClientId,
                       sendFlags);
}

ReturnCode ForwardCtrl::forwardText(UniqID serverId, UniqID clientId, const char* data,
                                    UniqID forwardServerId,
                                    UniqID forwardClientId,
                                    SendFlags sendFlags) {
    const bool forwardMode = true;
    return _sendText(serverId, clientId, data,
                       forwardMode,
                       forwardServerId,
                       forwardClientId,
                       sendFlags);
}



ReturnCode ForwardCtrl::_sendBinary(UniqID serverId,
                                    UniqID clientId,
                                    uint8_t* data,
                                    size_t dataLength,
                                    bool forwardMode,
                                    UniqID forwardServerId,
                                    UniqID forwardClientId,
                                    SendFlags sendFlags) {
    ForwardServer* outServer = getServerByID(serverId);
    if (!outServer) {
        logError("[forwarder][sendBinary] outServer not found, serverId={0}", serverId);
        return ReturnCode::Err;
    }
    ForwardClient* outClient = nullptr;
    if (clientId) {
        outClient = outServer->getClient(clientId);
        if(!outClient) {
            logError("[forwarder][sendBinary] outClient not found, clientId={0}", clientId);
            return ReturnCode::Err;
        }
    }
    ForwardHeader outHeader;
    outHeader.setProtocol(forwardMode?Protocol::Forward:Protocol::Process);
    outHeader.cleanFlag();
    if (outServer->base64)
        outHeader.setFlag(HeaderFlag::Base64, true);
    if (outServer->encrypt)
        outHeader.setFlag(HeaderFlag::Encrypt, true);
    if (outServer->compress)
        outHeader.setFlag(HeaderFlag::Compress, true);
    if (hasFlag(sendFlags, SendFlag_BatchMode)) {
        outHeader.setProtocol(Protocol::BatchForward);
        outHeader.setFlag(HeaderFlag::PacketLen, true);
    }
    // forward config
    if(forwardMode) {
        if (forwardServerId > 0) {
            outHeader.setFlag(HeaderFlag::HostID, true);
            outHeader.setHostID((uint8_t)(forwardServerId));
        }
        
        if (hasFlag(sendFlags, SendFlag_Broadcast)) {
            outHeader.setFlag(HeaderFlag::Broadcast, true);
        } else {
            if (forwardClientId > 0) {
                outHeader.setFlag(HeaderFlag::ClientID, true);
                outHeader.setClientID((UniqID)(forwardClientId));
            } else {
                logError("[forwarder][sendBinary] forward single but no forwardClientId");
                return ReturnCode::Err;
            }
        }
        if(hasFlag(sendFlags, SendFlag_ForceRaw)) {
            outHeader.setFlag(HeaderFlag::ForceRaw, true);
        }
    }

    outHeader.resetHeaderLength();
    uint8_t* encodedData;
    size_t encodedDataLength;
    encodeData(outServer, &outHeader, data, dataLength, encodedData, encodedDataLength);
    if(!encodedData || encodedDataLength <= 0) {
        return ReturnCode::Err;
    }
    size_t packetLength = outHeader.getHeaderLength() + encodedDataLength;
    if (hasFlag(sendFlags, SendFlag_BatchMode)) {
        outHeader.setPacketLength(packetLength);
        outServer->pushToBuffer((uint8_t*)(&outHeader), outHeader.getHeaderLength());
        outServer->pushToBuffer(encodedData, encodedDataLength);
        return ReturnCode::Ok;
    } else {
        ForwardPacketPtr outPacket = createPacket(outServer->netType, packetLength, sendFlags);
        outPacket->setHeader(&outHeader);
        outPacket->setData(encodedData, encodedDataLength);
        ForwardParam param;
        param.header = nullptr;
        param.packet = outPacket;
        param.client = outClient;
        param.server = outServer;
        if (outClient) {
            return sendPacket(param);
        }
        else {
            return broadcastPacket(param);
        }
    }
}

ReturnCode ForwardCtrl::_sendText(UniqID serverId, UniqID clientId, std::string& data,
                                  bool forwardMode,
                                  UniqID forwardServerId,
                                  UniqID forwardClientId,
                                  SendFlags sendFlags) {
    return _sendBinary(serverId, clientId, (uint8_t*)data.c_str(), data.size(),
                       forwardMode,
                       forwardServerId,
                       forwardClientId,
                       sendFlags);
}

ReturnCode ForwardCtrl::_sendText(UniqID serverId, UniqID clientId, const char* data,
                                  bool forwardMode,
                                  UniqID forwardServerId,
                                  UniqID forwardClientId,
                                  SendFlags sendFlags) {
    return _sendBinary(serverId, clientId, (uint8_t*)data, strlen(data),
                       forwardMode,
                       forwardServerId,
                       forwardClientId,
                    sendFlags);
}



ForwardPacketPtr ForwardCtrl::createPacket(NetType netType, size_t len, SendFlags sendFlags) {
	if (netType == NetType::ENet) {
        enet_uint32 enet_flags = 0;
        if(sendFlags == 0) {
            // default
            enet_flags |= ENET_PACKET_FLAG_RELIABLE;
        } else if(hasFlag(sendFlags, SendFlag_Reliable)) {
            enet_flags |= ENET_PACKET_FLAG_RELIABLE;
        } else if(hasFlag(sendFlags, SendFlag_Unreliable)) {
            enet_flags = 0;
        }
		return std::make_shared<ForwardPacketENet>(len, enet_flags);
	}else if (netType == NetType::WS) {
		return std::make_shared<ForwardPacketWS>(len);
	}
	return nullptr;
}

ForwardPacketPtr ForwardCtrl::createPacket(const std::string& packet) {
	return std::make_shared<ForwardPacketWS>(packet);
}

ForwardPacketPtr ForwardCtrl::createPacket(ENetPacket* packet) {
	return std::make_shared<ForwardPacketENet>(packet);
}

void ForwardCtrl::encodeData(
	ForwardServer* outServer, ForwardHeader* outHeader, 
	uint8_t* data, size_t dataLength, uint8_t* &outData, size_t& outDataLength) 
{
	//if (debug) debugBytes("encodeData, raw Data", data, dataLength);
    if (outHeader->isFlagOn(HeaderFlag::Compress)) {
		size_t bufferLen = compressBound(dataLength);
		logDebugS(outServer, "encodeData, compressBound={0}, dataLength={1}", bufferLen, dataLength);
		uint8_t* newData = getBuffer(0, bufferLen);
        if(!newData) {
            logErrorS(outServer, "[encodeData] step_Compress no newData");
            return;
        }
		uLongf realLen = bufferLen;
        outHeader->setUncompressedSize(static_cast<uint32_t>(dataLength));// used for uncompression
		int ret = compress((Bytef*)newData, &realLen, data, dataLength);
		if (ret == Z_OK) {
			data = newData;
            dataLength = realLen;
            logDebugS(outServer, "[encodeData] after step_Compress dataLength:{0}", dataLength);
			//if (debug) debugBytes("encodeData, compressed", data, dataLength);
		}
		else {
            logErrorS(outServer, "[encodeData] step_Compress, compress failed.");
			if (ret == Z_MEM_ERROR)
				logErrorS(outServer, "Z_MEM_ERROR");
			else if (ret == Z_BUF_ERROR)
				logErrorS(outServer, "Z_BUF_ERROR");
			else if (ret == Z_DATA_ERROR)
				logErrorS(outServer, "Z_DATA_ERROR");
			return;
		}
	}

    if (outHeader->isFlagOn(HeaderFlag::Encrypt)) {
		static std::random_device rd;
		static std::mt19937 gen(rd());
		static std::uniform_int_distribution<> dis(0, int(std::pow(2, 8)) - 1);
		uint8_t* newData = getBuffer(1, dataLength + ivSize);
        if(!newData) {
            logErrorS(outServer, "[encodeData] step_Encrypt no newData");
            return;
        }
        uint8_t* iv = newData;
		uint8_t ivTmp[ivSize];
		for (int i = 0; i < ivSize; i++) {
			iv[i] = dis(gen);
		}
		memcpy(ivTmp, iv, ivSize);
		uint8_t* encryptedData = newData + ivSize;
		unsigned char ecount_buf[AES_BLOCK_SIZE];
		unsigned int num = 0;
		AES_ctr128_encrypt(data, encryptedData, dataLength, &outServer->encryptkey, ivTmp, ecount_buf, &num);
		data = newData;
        dataLength = dataLength + ivSize;
        logDebugS(outServer, "[encodeData] after step_Encrypt dataLength:{0}", dataLength);
		//if (debug) debugBytes("encodeData, encrypted", data, dataLength);
	}

    if (outHeader->isFlagOn(HeaderFlag::Base64)) {
		base64Codec.fromByteArray(data, dataLength);
        const std::string& b64 = base64Codec.getLastB64();
		data = (uint8_t*)b64.c_str();
        dataLength = b64.size();
        logDebugS(outServer, "[encodeData] after step_Base64 dataLength:{0}", dataLength);
		//if (debug) debugBytes("encodeData, b64", data, dataLength);
	}
    if(!data || !dataLength){
        logErrorS(outServer, "[encodeData] final, no data");
        return;
    }
    outData = data;
    outDataLength = dataLength;
}

void ForwardCtrl::decodeData(ForwardServer* inServer, ForwardHeader* inHeader, uint8_t* data, size_t dataLength, uint8_t* &outData, size_t& outDataLength) {
	outData = data;
	outDataLength = dataLength;
    if(!outData || !outDataLength) {
        return;
    }
	//logDebug("inHeader,ver={0},len={1},ip={2}",
    //    inHeader->getVersion(), inHeader->getHeaderLength(), inHeader->getIP());
	//if (debug) debugBytes("decodeData, inHeader'data", inHeader->data, inHeader->getHeaderLength() - HeaderBaseLength);
	if (inHeader->isFlagOn(HeaderFlag::Base64)) {
		//if (debug) debugBytes("decodeData, originData", data, dataLength);
		size_t newDataLength = base64Codec.calculateDataLength((const char*)data, dataLength);
        uint8_t* newData = nullptr;
        if (newDataLength > 0) {
           newData = getBuffer(0, newDataLength);
        }
        if(!newData) {
            logErrorS(inServer, "[decodeData] step_Base64 no newData");
            outData = nullptr;
            outDataLength = 0;
            return;
        }
		base64Codec.toByteArray((const char*)data, dataLength, newData, &newDataLength);
		outData = newData;
		outDataLength = newDataLength;
		//if (debug) debugBytes("decodeData, base64decoded Data", outData, outDataLength);
        logDebugS(inServer, "[decodeData] after step_Base64 outDataLength:{0}", outDataLength);
	}
    if(!outData || !outDataLength) {
        logErrorS(inServer, "[decodeData] err");
        return;
    }
	if (inHeader->isFlagOn(HeaderFlag::Encrypt)) { // DO decrypt
		size_t newDataLength = outDataLength - ivSize;
		uint8_t* encryptedData = outData + ivSize;
        uint8_t* newData = nullptr;;
        if (newDataLength > 0) {
            newData = getBuffer(1, newDataLength);
        }
        if(!newData) {
            logErrorS(inServer, "[decodeData] step_Encrypt no newData");
            outData = nullptr;
            outDataLength = 0;
            return;
        }
		uint8_t* iv = outData;
		unsigned char ecount_buf[AES_BLOCK_SIZE];
		unsigned int num = 0;
		AES_ctr128_encrypt(encryptedData, newData, newDataLength, &inServer->encryptkey, iv, ecount_buf, &num);
		outData = newData;
		outDataLength = newDataLength;
        logDebugS(inServer, "[decodeData] after step_Encrypt outDataLength:{0}", outDataLength);
		//if (debug) debugBytes("decodeData, decrypted Data", outData, outDataLength);
	}
    if(!outData || !outDataLength) {
        logErrorS(inServer, "[decodeData] err");
        return;
    }
	if (inHeader->isFlagOn(HeaderFlag::Compress)) {
		uLongf newDataLength = inHeader->getUncompressedSize();
        uint8_t* newData = nullptr;;
        if (newDataLength > 0) {
            newData = getBuffer(2, newDataLength);
        }
        if(!newData) {
            logErrorS(inServer, "[decodeData] step_Compress, no newData");
            outData = nullptr;
            outDataLength = 0;
            return;
        }
		uLongf realLen = newDataLength;
		int ret = uncompress((Bytef*)newData, &realLen, outData, outDataLength);
		//logInfo("uncompress, bufferLen={0},realLen={1},outDataLength={2}",
		//	bufferLen, realLen, outDataLength);
		if (ret == Z_OK) {
			outData = newData;
            outDataLength = realLen;
            logDebugS(inServer, "[decodeData] after step_Compress outDataLength:{0}", outDataLength);
			//if (debug) debugBytes("decodeData, uncompressed Data", outData, outDataLength);
		}
        else {
            outData = nullptr;
            outDataLength = 0;
			logErrorS(inServer, "[decodeData] step_Compress, uncompress failed");
			if (ret == Z_MEM_ERROR)
				logErrorS(inServer, "Z_MEM_ERROR");
			else if (ret == Z_BUF_ERROR)
				logErrorS(inServer, "Z_BUF_ERROR");
			else if (ret == Z_DATA_ERROR)
				logErrorS(inServer, "Z_DATA_ERROR");
		}
	}

}

ForwardPacketPtr ForwardCtrl::convertPacket(ForwardPacketPtr packet, ForwardServer* inServer, ForwardServer* outServer, ForwardHeader* outHeader, SendFlags sendFlags) {
	uint8_t* rawData;
	size_t rawDataLength;
	decodeData(
		inServer, packet->getHeader(),
		packet->getDataPtr(), packet->getDataLength(),
		rawData, rawDataLength);
	logDebugS(inServer, "decodeData, dataLength:{0}, rawDataLength:{1}", packet->getDataLength(), rawDataLength);
	if (!rawData || rawDataLength <= 0) {
		logErrorS(inServer, "[convertPacket] decodeData failed");
		return nullptr;
    }
    uint8_t* encodedData = nullptr;
    size_t encodedDataLength = 0;
	encodeData(outServer, outHeader, rawData, rawDataLength, encodedData, encodedDataLength);
    if(!encodedData || encodedDataLength <= 0) {
        logDebugS(inServer, "[convertPacket] encodeData failed");
        return nullptr;
    }
    ForwardPacketPtr outPacket = createPacket(outServer->netType, outHeader->getHeaderLength() + encodedDataLength, sendFlags);
    outPacket->setHeader(outHeader);
    outPacket->setData(encodedData, encodedDataLength);
    //if (debug) debugBytes("encodeData, final", (uint8_t*)newPacket->getHeaderPtr(), newPacket->getTotalLength());
	return outPacket;
}

ReturnCode ForwardCtrl::handlePacket_SysCmd(ForwardParam& param) {
	if(!param.server->admin)
		return ReturnCode::Err;
	ForwardHeader outHeader;
    outHeader.setProtocol(Protocol::SysCmd);
	int subID = param.header->getSubID();
	if (subID == 1) {
		//stat
		const rapidjson::Document& d = stat();
		rapidjson::StringBuffer buffer;
		rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
		d.Accept(writer);
		const char* statJson = buffer.GetString();
		size_t statJsonLength = strlen(statJson);
		size_t totalLength = outHeader.getHeaderLength() + statJsonLength + 1;
		ForwardPacketPtr packet = createPacket(param.server->netType, totalLength);
		packet->setHeader(&outHeader);
		packet->setData((uint8_t*)(statJson), statJsonLength);
		param.packet = packet;
		sendPacket(param);
		logInfo("SysCmd finish");
	}
	else if (subID == 2){
		//force disconnect
	}
	return ReturnCode::Ok;
}

ReturnCode ForwardCtrl::handlePacket_Forward(ForwardParam& param) {
	ForwardServer* inServer = param.server;
	ForwardClient* inClient = param.client;
	ForwardPacketPtr inPacket = param.packet;
	ForwardHeader* inHeader = param.header;
  
    logDebugS(inServer, "forward begin");
    
    curProcessServer = inServer;
    curProcessClient = inClient;
    curProcessHeader = inHeader;
    curEvent = Event::Forward;
    
	ForwardServer* outServer = getOutServer(inHeader, inServer);
	if (!outServer) {
		logWarn("[forward] no outServer");
		return ReturnCode::Err;
	}
    logDebugS(inServer, "forward from server[{0}] to server[{1}]", inServer->id, outServer->id);
    ForwardClient* outClient;
    if(inHeader->isFlagOn(HeaderFlag::Broadcast)) {
        outClient = nullptr; // no outClient means Broadcast
    } else {
        if(!inHeader->isFlagOn(forwarder::HeaderFlag::ClientID)){
            logWarnS(inServer, "[forward.single] clientID is off, can't forward.");
            return ReturnCode::Err;
        }
        // check if outClient exists
        int clientID = inHeader->getClientID();
        if(clientID <= 0) {
            logWarnS(inServer, "[forward.single] wrong clientID = {0}", clientID);
            return ReturnCode::Err;
        }
        outClient = getOutClient(inHeader, inServer, outServer);
        if(!outClient) {
            logWarnS(inServer, "[forward.single] outClient[{0}] not found.", clientID);
            return ReturnCode::Err;
        }
    }

	ForwardHeader outHeader;
    outHeader.setProtocol(Protocol::Forward);
	outHeader.cleanFlag();
    if(!inHeader->isFlagOn(HeaderFlag::ForceRaw)) {
        // outServer's flag
        if (outServer->base64)
            outHeader.setFlag(HeaderFlag::Base64, true);
        if (outServer->encrypt)
            outHeader.setFlag(HeaderFlag::Encrypt, true);
        if (outServer->compress)
            outHeader.setFlag(HeaderFlag::Compress, true);
    }
	// Default flag
	outHeader.setFlag(HeaderFlag::IP, true);
	outHeader.setFlag(HeaderFlag::HostID, true);
	outHeader.setFlag(HeaderFlag::ClientID, true);
	if (outHeader.isFlagOn(HeaderFlag::IP)) {
		outHeader.setIP(inClient->ip);
	}
	if (outHeader.isFlagOn(HeaderFlag::HostID)) {
		outHeader.setHostID(param.server->id);
	}
	if (outHeader.isFlagOn(HeaderFlag::ClientID)) {
		outHeader.setClientID(param.client->id);
	}

	outHeader.resetHeaderLength();

	ForwardPacketPtr outPacket;

	outPacket = convertPacket(inPacket, inServer, outServer, &outHeader);

	if (!outPacket) {
		logWarnS(inServer, "[forward] convertPacket failed, server: {0}", inServer->id);
		return ReturnCode::Err;
	}
	param.header = nullptr;
	param.packet = outPacket;
	param.client = outClient;
	param.server = outServer;

    ReturnCode ret = ReturnCode::Ok;
	if (outClient) {
		//single send
        ret = sendPacket(param);
        if (ret != ReturnCode::Ok) {
            logErrorS(inServer, "[forwarder] forward sendPacket error, server: {0}", inServer->id);
        }
    }
    else {
        // broadcast the incoming packet to dest host's peers
        broadcastPacket(param);
    }
    logDebug("forward finish");
	return ret;
}


ReturnCode ForwardCtrl::handlePacket_BatchForward(ForwardParam& param) {
    size_t offset = 0;
    ForwardPacketPtr batchPacket = param.packet;
    ForwardPacketPtr subPacket = std::make_shared<ForwardPacketConst>();
    ForwardParam sub_param;
    logDebug("[BatchForward] batchPacket len={0}", batchPacket->getTotalLength());
    uint8_t* pStart = (uint8_t*)batchPacket->getHeaderPtr();
    //logDebug(batchPacket->getHeader()->getHeaderDebugInfo().c_str());
    while(offset < batchPacket->getTotalLength()) {
        uint8_t* pCur = pStart + offset;
        ForwardHeader* pHeader = (ForwardHeader*)pCur;
        if(validHeader(pHeader) == ReturnCode::Err) {
            logError("[BatchForward] err, validHeader failded");
            debugBytes("ddd=", pCur, 30);
            break;
        }
        size_t headerLen = pHeader->getHeaderLength();
        subPacket->setHeader(pCur, headerLen);
        uint8_t* pData = pCur + headerLen;
        size_t packetLen = subPacket->getHeader()->getPacketLength();
        size_t dataLen = packetLen - headerLen;
        // logDebug(pHeader->getHeaderDebugInfo().c_str());
        logDebug("[BatchForward] headerLen={0}, packetLen={1}, dataLen={2}", headerLen, packetLen, dataLen);
        subPacket->setData(pData, dataLen);
        size_t totalLen = headerLen + dataLen;
        if(totalLen <= 0) {
            logError("[BatchForward] err, totalLen<=0");
            break;
        }
        subPacket->setTotalLength(totalLen);
        sub_param.header = subPacket->getHeader();
        sub_param.packet = subPacket;
        sub_param.client = param.client;
        sub_param.server = param.server;
        offset += totalLen;
        logDebug("offset={0}", offset);
        handlePacket_Forward(sub_param);
    }
    return ReturnCode::Ok;
}

ReturnCode ForwardCtrl::handlePacket_Process(ForwardParam& param) {
	ForwardServer* inServer = param.server;
	ForwardClient* inClient = param.client;
    ForwardPacketPtr inPacket = param.packet;
    logDebugS(inServer, "Process from server[{0}]", inServer->id);
	ForwardHeader* inHeader = inPacket->getHeader();
	uint8_t * data = inPacket->getDataPtr();
	size_t dataLength = inPacket->getDataLength();
    decodeData(inServer, inHeader, data, dataLength, curProcessData, curProcessDataLength);
    logDebugS(inServer, "Process result len ={0}", dataLength);
	curProcessServer = inServer;
	curProcessClient = inClient;
	curProcessHeader = inHeader;
	curEvent = Event::Message;
	return ReturnCode::Ok;
}


void ForwardCtrl::onTCPConnected(ForwardServer* server, int fd) {
    logInfo("onTCPConnected, fd: {0}", fd);
}

void ForwardCtrl::onTCPDisconnected(ForwardServer* server, int fd) {
    logInfo("onTCPDisconnected, fd: {0}", fd);
}

void ForwardCtrl::onTCPReceived(ForwardServer* server, int fd, uint8_t* msg) {
    logInfo("onTCPReceived, fd: {0}", fd);
}

void ForwardCtrl::onWSConnected(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl) {
	ForwardServerWS::WebsocketServer::connection_ptr con = wsServer->server.get_con_from_hdl(hdl);
	ForwardClientWS* client = (ForwardClientWS*)wsServer->createClientFromPool();
    client->hdl = hdl;
    uint16_t port = con->get_port();
    std::string host = con->get_remote_endpoint();
    if (host == "localhost") {
        host = "127.0.0.1";
    } else {
        auto p1 = host.find("[::ffff:");
        auto p2 = host.find("]:");
        if (p1 != std::string::npos && p2 != std::string::npos) {
            host = host.substr(p1 + 8, p2 - (p1 + 8));
        } else {
            host = "1.2.3.4";
        }
    }
	asio::ip::address_v4::bytes_type ip = asio::ip::address_v4::from_string(host).to_bytes();
	memcpy(&client->ip, ip.data(), 4);
    if (wsServer->isClientMode) {
        wsServer->clientID = client->id;
    }
	wsServer->clients[client->id] = static_cast<ForwardClient*>(client);
	wsServer->hdlToClientId[hdl] = client->id;
	logDebug("[WS,c:{0}] connected, from {1}:{2}", client->id, host, port);
	curEvent = Event::Connected; 
	curProcessServer = wsServer;
	curProcessClient = client;
}

void ForwardCtrl::onWSDisconnected(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl) {
    curProcessClient = wsServer->destroyClientByHDL(hdl);
    if (!curProcessClient) {
        return;
    }
    if (wsServer->isClientMode) {
        wsServer->clientID = 0;
        wsServer->setupReconnectTimer();
    }
	curProcessServer = wsServer;
	curEvent = Event::Disconnected;
}


void ForwardCtrl::onWSError(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl) {
	UniqID clientID = wsServer->getClientIDByHDL(hdl);
	if (!clientID) {
		return;
	}
	auto con = wsServer->server.get_con_from_hdl(hdl);
	logDebug("[forwarder] onWSError:");
	logDebug("get_state:{0}", con->get_state());
	logDebug("local_close_code:{0}", con->get_local_close_code());
	logDebug("local_close_reason:{0}", con->get_local_close_reason());
	logDebug("remote_close_code:{0}", con->get_remote_close_code());
	logDebug("remote_close_reason:{0}", con->get_remote_close_reason());
	logDebug("get_ec:{0} ,msg:{1}", con->get_ec().value(), con->get_ec().message());
	// wsServer->doDisconnectClient(wsServer->getClientIDByHDL(hdl));
}


void ForwardCtrl::onWSReceived(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl, ForwardServerWS::WebsocketServer::message_ptr msg) {
	auto it1 = wsServer->hdlToClientId.find(hdl);
	if (it1 == wsServer->hdlToClientId.end()) {
		logError("[forwarder][ws.recv] no such hdl");
		return;
	}
	UniqID clientID = it1->second;
	ForwardClient* client = wsServer->getClient(clientID);
	if (!client) {
		logError("[forwarder][ws.recv] no such cli:{0}", clientID);
		return;
	}
	logDebug("[forwarder][ws.recv][{0}][cli:{1}][len:{2}]", wsServer->desc, clientID, msg->get_payload().size());
	ForwardHeader header;
	const std::string& payload = msg->get_payload();
	ReturnCode code = getHeader(&header, payload);
	if (code == ReturnCode::Err) {
		logWarn("[forwarder][ws.recv] getHeader err");
		return;
	}
	HandleRule rule = wsServer->getRule(header.getProtocol());
	if (rule == HandleRule::Unknown) {
		logWarn("[forwarder][ws.recv] wrong protocol:{0}", (int)header.getProtocol());
		return;
	}
	handlePacketFunc handleFunc = handleFuncs[rule];
	ForwardParam param;
	param.header = &header;
	param.packet = createPacket(payload);
	param.client = client;
	param.server = static_cast<ForwardServer*>(wsServer);
    curProcessPacketWS = param.packet;
	(this->*handleFunc)(param);
}

void ForwardCtrl::onENetConnected(ForwardServerENet* enetServer, ENetPeer* peer) {
	ForwardClientENet* client = (ForwardClientENet*)enetServer->createClientFromPool();
	client->peer = peer;
	client->ip = peer->address.host;
	peer->data = client;
	enetServer->clients[client->id] = static_cast<ForwardClient*>(client);
	char str[INET_ADDRSTRLEN];
	inet_ntop(AF_INET, &peer->address.host, str, INET_ADDRSTRLEN);
	curEvent = Event::Connected;
	if (enetServer->isClientMode) {
		enetServer->clientID = client->id;
	}
    client->setPeerTimeout(0, enetServer->timeoutMin, enetServer->timeoutMax);
	logDebug("[forwarder][enet][c:{0}] connected, from {1}:{2}.",
             client->id,
             str,
             peer->address.port);
	curProcessClient = client;
}

void ForwardCtrl::onENetDisconnected(ForwardServerENet* enetServer, ENetPeer* peer) {
	ForwardClientENet* client = peer->data ? (ForwardClientENet*)peer->data : nullptr;
	peer->data = nullptr;
	if (!client) {
        return;
    }
    enetServer->destroyClientByPtr(client);
	if (enetServer->isClientMode && enetServer->reconnect) {
		enetServer->doReconnect();
	}
	if (enetServer->isClientMode) {
		enetServer->clientID = 0;
	}
	curEvent = Event::Disconnected;
	curProcessClient = client;
}

void ForwardCtrl::onENetReceived(ForwardServerENet* enetServer, ENetPeer* peer, ENetPacket* inPacket) {
	ForwardClient* client = (ForwardClient*)peer->data;
	logDebug("[forwarder][enet.recv][{0}][cli:{1}][len:{2}]", enetServer->desc, client->id, inPacket->dataLength);
	ForwardHeader* header;
	ReturnCode err = getHeader(header, inPacket);
	if (err == ReturnCode::Err) {
		logWarn("[forwarder][enet.recv] getHeader err");
		return;
	}
	HandleRule rule = enetServer->getRule(header->getProtocol());
	if (rule == HandleRule::Unknown) {
		logWarn("[forwarder][enet.recv] wrong protocol:{0}", (int)header->getProtocol());
		return;
	}
	handlePacketFunc handleFunc = handleFuncs[rule];
	ForwardParam param;
	param.header = header;
	param.packet = createPacket(inPacket);
	param.client = client;
	param.server = static_cast<ForwardServer*>(enetServer);
    curProcessPacketENet = param.packet;
	(this->*handleFunc)(param);
}

ReturnCode ForwardCtrl::validHeader(ForwardHeader* header) {
	if (header->getVersion() != HeaderVersion) {
		logWarn("[validHeader] wrong version {0} != {1}", header->getVersion(), HeaderVersion);
		return ReturnCode::Err;
	}
	return ReturnCode::Ok;
}

ReturnCode ForwardCtrl::getHeader(ForwardHeader* header, const std::string& packet) {
	uint8_t* data = (uint8_t*)packet.c_str();
    if(packet.size() < HeaderBaseLength) {
        return ReturnCode::Err;
    }
	memcpy(header, data, HeaderBaseLength);
    if(header->getHeaderLength() <= 0 || header->getHeaderLength() > HeaderDataLength) {
        return ReturnCode::Err;
    }
	memcpy(header->data, data + HeaderBaseLength, header->getHeaderLength() - HeaderBaseLength);
	return validHeader(header);
}

ReturnCode ForwardCtrl::getHeader(ForwardHeader* &header, ENetPacket* packet) {
    if(packet->dataLength < HeaderBaseLength) {
        return ReturnCode::Err;
    }
    uint8_t* data = packet->data;
    header = (ForwardHeader*)data;
    if(header->getHeaderLength() <= 0 || header->getHeaderLength() > HeaderDataLength) {
        return ReturnCode::Err;
    }
	// memcpy(header->data, data + HeaderBaseLength, header->getHeaderLength() - HeaderBaseLength);
	return validHeader(header);
}

ForwardClient* ForwardCtrl::getOutClient(ForwardHeader* inHeader, ForwardServer* inServer, ForwardServer* outServer) const {
	ForwardClient* outClient = nullptr;
	int clientID = inHeader->getClientID();
	outClient = outServer->getClient(clientID);
	return outClient;
}

ForwardServer* ForwardCtrl::getOutServer(ForwardHeader* inHeader, ForwardServer* inServer) const {
	ForwardServer* outServer = nullptr;
    if (inHeader->isFlagOn(HeaderFlag::HostID)) {
        int outHostID = inHeader->getHostID();
        if(outHostID > 0) {
            outServer = getServerByID(outHostID);
        }
    } else if (inServer->dest) {
		outServer = inServer->dest;
	}
	return outServer;
}

void ForwardCtrl::pollOnceByServerID(UniqID serverId, int ms) {
	ForwardServer* pServer = getServerByID(serverId);
	if (!pServer) {
		return;
	}
	pollOnce(pServer, ms);
}

void ForwardCtrl::pollOnce(ForwardServer* pServer, int ms) {
	ENetEvent event;
	curEvent = Event::Nothing;
	curProcessServer = nullptr;
	curProcessClient = nullptr;
	curProcessHeader = nullptr;
	curProcessData = nullptr;
	curProcessDataLength = 0;
    curProcessPacketWS = nullptr;
    if(curProcessPacketENet) {
        ENetPacket* enetPacket = static_cast<ENetPacket*>(curProcessPacketENet->getRawPtr());
        enet_packet_destroy(enetPacket);
        curProcessPacketENet = nullptr;
    }
	if (pServer->netType == NetType::ENet) {
		ForwardServerENet* server = dynamic_cast<ForwardServerENet*>(pServer);
		int ret = enet_host_service(server->host, &event, ms);
		if (ret > 0) {
			//logDebug("event.type = {0}", event.type);
			curProcessServer = pServer;
			switch (event.type) {
			case ENET_EVENT_TYPE_CONNECT: {
                logDebug("[forwarder] enet.evt = connected");
				onENetConnected(server, event.peer);
				break;
			}
			case ENET_EVENT_TYPE_RECEIVE: {
				onENetReceived(server, event.peer, event.packet);
				break;
			}
			case ENET_EVENT_TYPE_DISCONNECT: {
                logDebug("[forwarder] enet.evt = disconnected");
				onENetDisconnected(server, event.peer);
				break;
			}
			case ENET_EVENT_TYPE_NONE:
				break;
			}
			if (isExit)
				return;
		}
		else if (ret == 0) {
			// nothing happened
			return;
		}
		else if (ret < 0) {
			// error
#ifdef _MSC_VER
			logError("[forwarder][server {0} {1}] WSAGetLastError(): {2}", server->id, server->desc, WSAGetLastError());
#else
            logError("[forwarder][server {0} {1}] enet.evt = error, errno:{2}", server->id, server->desc, errno);
#endif
		}
		//std::this_thread::sleep_for(std::chrono::milliseconds(20));
	}
    else if (pServer->netType == NetType::WS) {
        ForwardServerWS* wsServer = dynamic_cast<ForwardServerWS*>(pServer);
        if(wsServer->eventQueue.size() == 0) {
            wsServer->poll();
        }
        
        while(wsServer->eventQueue.size() > 0) {
            auto it = wsServer->eventQueue.front();
            wsServer->eventQueue.pop_front();
            switch(it.event) {
                case ForwardServerWS::WSEventType::Connected: {
                    onWSConnected(wsServer, it.hdl);
                    break;
                }
                case ForwardServerWS::WSEventType::Disconnected: {
                    onWSDisconnected(wsServer, it.hdl);
                    break;
                }
                case ForwardServerWS::WSEventType::Msg: {
                    onWSReceived(wsServer, it.hdl, it.msg);
                    break;
                }
                case ForwardServerWS::WSEventType::Error: {
                    onWSError(wsServer, it.hdl);
                    break;
                }
                default: {
                    break;
                }
            }
            if (curProcessPacketWS) {
                break;
            }
        }
	}
    else if (pServer->netType == NetType::TCP) {
         ForwardServerTcp* tcpServer = dynamic_cast<ForwardServerTcp*>(pServer);
         tcpServer->poll();
    }

}

void ForwardCtrl::pollAllOnce() {
	for (ForwardServer* pServer : servers) {
        pollOnce(pServer);
	}
}

void ForwardCtrl::loop() {
	while (!isExit) {
		pollAllOnce();
	}
}

Document ForwardCtrl::stat() const {
	/*
	{
		servers:[
			{
				config:{
                    desc: str,
					id: int,
					destId: int,
					port: int,
					peerLimit: int,
					admin: bool,
					encrypt: bool,
                    compress: bool,
                    base64: bool
				},
				peers: int,
				idGenerator: {
					max: int,
					recyled: int
				}
			},
		]
	}
	*/
	Document d(kObjectType);
	Value lstServers(kArrayType);
	for (auto it = servers.begin(); it != servers.end(); it++) {
		ForwardServer * server = *it;
		Value dServer(kObjectType);	
		auto addToServer = [&](Value::StringRefType k, Value& v) {
			dServer.AddMember(k, v, d.GetAllocator());
		}; 
		{
			Value dConfig(kObjectType);
			auto add = [&](Value::StringRefType k, Value& v) {
				dConfig.AddMember(k, v, d.GetAllocator());
			};
            Value desc;
            desc.SetString(server->desc.c_str(), server->desc.size(), d.GetAllocator());
            add("desc", desc);
            Value id(server->id);
			add("id", id);
			Value destId(server->destId);
            add("destId", destId);
            Value port(server->port);
            add("port", port);
			Value peerLimit(server->peerLimit);
			add("peerLimit", peerLimit);
			Value isAdmin(server->admin);
			add("admin", isAdmin);
			Value isEncrypt(server->encrypt);
            add("encrypt", isEncrypt);
            Value isCompress(server->compress);
            add("compress", isCompress);
            Value isBase64(server->base64);
            add("base64", isBase64);
			addToServer("config", dConfig);
		}
		{
			Value dIdGenerator(kObjectType);
			auto add = [&](Value::StringRefType k, Value& v) {
				dIdGenerator.AddMember(k, v, d.GetAllocator());
			}; 
			Value maxCount((int)server->idGenerator.getCount());
			Value recyled((int)server->idGenerator.getRecycledLength());
			add("max", maxCount);
			add("recyled", recyled);
			addToServer("idGenerator", dIdGenerator);
		}
		Value peers(int(server->clients.size()));
		addToServer("peers", peers);
		lstServers.PushBack(dServer.Move(), d.GetAllocator());
	}
	d.AddMember("servers", lstServers.Move(), d.GetAllocator());
	return d;
}

void ForwardCtrl::SetDebugFunction(DebugFuncPtr fp) {
	debugFunc = fp;
}
