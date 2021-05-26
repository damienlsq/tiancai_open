#ifndef FORWARDCTRL_H
#define FORWARDCTRL_H

#include "base.h"
#include "defines.h"
#include "forwardbase.h"
#include "forwardclient.h"
#include "forwardserver.h"
#include "forwardheader.h"
#include "forwardpacket.h"
#include "base64.h"



namespace forwarder {
	class ForwardParam {
    public:
        ~ForwardParam() {
            header = nullptr;
            server = nullptr;
            client = nullptr;
            packet = nullptr;
        }
	public:
		ForwardHeader* header = nullptr;
		ForwardServer* server = nullptr;
		ForwardClient* client = nullptr;
		ForwardPacketPtr packet = nullptr;
	};
    
    struct WSPacket {
        ForwardServerWS* server;
        websocketpp::connection_hdl hdl;
        ForwardServerWS::WebsocketServer::message_ptr msg;
    };
    
    class ForwardCtrl: public ForwardBase {
    private:
        ForwardCtrl();
	public:
		virtual ~ForwardCtrl();
        
        static ForwardCtrl* getInstance() {
            static ForwardCtrl obj;
            return &obj;
        }

		void release();
	
		int version() {
			return ForwarderVersion;
		}

		void setupLogger(const char* filename = nullptr);

        void setLogLevel(spdlog::level::level_enum lv);
        
        void setServerDebug(UniqID serverId, bool enabled);

		void initServers(rapidjson::Value& serversConfig);

		uint32_t createServer(rapidjson::Value& serverConfig);

		ReturnCode removeServerByID(UniqID serverId);

		ForwardServer* getServerByID(UniqID serverId) const;
        
        // single send
        ReturnCode sendBinary(UniqID serverId, UniqID clientId, uint8_t* data, size_t dataLength, SendFlags sendFlags = SendFlag_None);

        ReturnCode sendText(UniqID serverId, UniqID clientId, std::string& data, SendFlags sendFlags = SendFlag_None);
	
		ReturnCode sendText(UniqID serverId, UniqID clientId, const char* data, SendFlags sendFlags = SendFlag_None);
        
        // broadcast send
        ReturnCode broadcastBinary(UniqID serverId, uint8_t* data, size_t dataLength, SendFlags sendFlags = SendFlag_None);
        
        ReturnCode broadcastText(UniqID serverId, std::string& data, SendFlags sendFlags = SendFlag_None);

        ReturnCode broadcastText(UniqID serverId, const char* data, SendFlags sendFlags = SendFlag_None);
        
        // forward send
        ReturnCode forwardBinary(UniqID serverId, UniqID clientId, uint8_t* data, size_t dataLength,
                                UniqID forwardServerId,
                                UniqID forwardClientId,
                                SendFlags sendFlags = SendFlag_None);
        
        ReturnCode forwardText(UniqID serverId, UniqID clientId, std::string& data,
                                UniqID forwardServerId,
                                UniqID forwardClientId,
                                SendFlags sendFlags = SendFlag_None);
        
        ReturnCode forwardText(UniqID serverId, UniqID clientId, const char* data,
                                UniqID forwardServerId,
                                UniqID forwardClientId,
                                SendFlags sendFlags = SendFlag_None);
        
        void beginBatchForward(UniqID serverId);
        
        ReturnCode endBatchForward(UniqID serverId, UniqID clientId);
        
		typedef void(*eventCallback)();

		void registerCallback(Event evt, eventCallback callback);

		void exist() {
			isExit = true;
		}

		inline Event getCurEvent() const {
			return curEvent;
		}

		inline ForwardServer* getCurProcessServer() const {
			return curProcessServer;
		}
	
		inline ForwardClient* getCurProcessClient() const {
			return curProcessClient;
		}

		inline ForwardHeader* getCurProcessHeader() const {
			return curProcessHeader;
		}

		inline uint8_t* getCurProcessData() const {
			return curProcessData;
		}

		inline size_t getCurProcessDataLength() const {
			return curProcessDataLength;
		}

		void pollOnceByServerID(UniqID serverId, int ms = 0);
		
		void pollOnce(ForwardServer* server, int ms = 0);

		void pollAllOnce();

		void loop();

		rapidjson::Document stat() const;

		void SetDebugFunction(DebugFuncPtr fp);

	private:
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////
        void onTCPConnected(ForwardServer* server, int fd);
        
        void onTCPDisconnected(ForwardServer* server, int fd);
        
        void onTCPReceived(ForwardServer* server, int fd, uint8_t* msg);
        
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		void onENetConnected(ForwardServerENet* server, ENetPeer* peer);

		void onENetDisconnected(ForwardServerENet* server, ENetPeer* peer);

		void onENetReceived(ForwardServerENet* server, ENetPeer* peer, ENetPacket* inPacket);

		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
		void onWSConnected(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl);

		void onWSDisconnected(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl);

		void onWSError(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl);
        
        void onWSReceived(ForwardServerWS* wsServer, websocketpp::connection_hdl hdl, ForwardServerWS::WebsocketServer::message_ptr msg);
		
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////

        ReturnCode _sendBinary(UniqID serverId, UniqID clientId, uint8_t* data, size_t dataLength,
                             bool forwardMode = false,
                             UniqID forwardServerId = 0,
                             UniqID forwardClientId = 0,
                             SendFlags sendFlags = SendFlag_None);
        
        ReturnCode _sendText(UniqID serverId, UniqID clientId, std::string& data,
                             bool forwardMode = false,
                             UniqID forwardServerId = 0,
                             UniqID forwardClientId = 0,
                             SendFlags sendFlags = SendFlag_None);
        
        ReturnCode _sendText(UniqID serverId, UniqID clientId, const char* data,
                             bool forwardMode = false,
                             UniqID forwardServerId = 0,
                             UniqID forwardClientId = 0,
                             SendFlags sendFlags = SendFlag_None);
        
		ForwardPacketPtr createPacket(NetType netType, size_t len, size_t flags = 0);

		ForwardPacketPtr createPacket(const std::string& packet);

		ForwardPacketPtr createPacket(ENetPacket* packet);

		void encodeData(ForwardServer* outServer, ForwardHeader* outHeader, uint8_t* data, size_t dataLength,
                        uint8_t* &outData, size_t& outDataLength);

		void decodeData(ForwardServer* inServer, ForwardHeader* inHeader, uint8_t* data, size_t dataLength,
                        uint8_t* &outData, size_t& outDataLength);
		
		ReturnCode validHeader(ForwardHeader* header);

		ReturnCode getHeader(ForwardHeader* header, const std::string& packet);

		ReturnCode getHeader(ForwardHeader* &header, ENetPacket * packet);

		ForwardPacketPtr convertPacket(ForwardPacketPtr packet, ForwardServer* inServer, ForwardServer* outServer, ForwardHeader* outHeader, size_t flags = 0);

		/* ----  protocol   ----- */
		// System Cmd
		ReturnCode handlePacket_SysCmd(ForwardParam& param);
		// Auto Forward to next server
		ReturnCode handlePacket_Forward(ForwardParam& param);
        // Auto Forward to next servers (Batch mode)
        ReturnCode handlePacket_BatchForward(ForwardParam& param);
		// process the packet locally
		ReturnCode handlePacket_Process(ForwardParam& param);

		ForwardServer* createServerByNetType(NetType& netType);

		ForwardClient* getOutClient(ForwardHeader* inHeader, ForwardServer* inServer, ForwardServer* outServer) const;

		ForwardServer* getOutServer(ForwardHeader* inHeader, ForwardServer* inServer) const;

		ReturnCode sendPacket(ForwardParam& param);

		ReturnCode broadcastPacket(ForwardParam& param);

        uint8_t* getBuffer(uint8_t bufferID, size_t n);
        
        inline size_t getBufferSize(uint8_t bufferID) {
            return bufferSize[bufferID];
        }
    
    public:
        template <typename... Args>
        void logDebugS(ForwardServer* server, const char* fmt, const Args&... args) {
            logDebug(fmt, args...);
            if (server) {
                server->logDebug(fmt, args...);
            }
        }
        
        template <typename... Args>
        void logInfoS(ForwardServer* server, const char* fmt, const Args&... args) {
            logInfo(fmt, args...);
            if (server) {
                server->logInfo(fmt, args...);
            }
        }
        
        template <typename... Args>
        void logWarnS(ForwardServer* server, const char* fmt, const Args&... args) {
            logWarn(fmt, args...);
            if (server) {
                server->logWarn(fmt, args...);
            }
        }
        
        template <typename... Args>
        void logErrorS(ForwardServer* server, const char* fmt, const Args&... args) {
            logError(fmt, args...);
            if (server) {
                server->logError(fmt, args...);
            }
        }
        
	private:
		typedef ReturnCode(ForwardCtrl::*handlePacketFunc)(ForwardParam& param);
		Pool<ForwardServerENet> poolForwardServerENet;
		Pool<ForwardServerWS> poolForwardServerWS;
		Pool<ForwardServerTcp> poolForwardServerTCP;
		// Pool<ForwardClientTCP> poolForwardClientTCP;
		std::vector<ForwardServer*> servers;
		std::map<UniqID, ForwardServer*> serverDict;
		std::map<HandleRule, handlePacketFunc> handleFuncs;
		UniqIDGenerator idGenerator;
		uint8_t** buffers;
		size_t* bufferSize;
        size_t* bufferOffset;
        int serverNum;
        UniqID id;
		bool released;
		bool isExit;
		Base64Codec& base64Codec;
        
        // theses vars need to be checked after pollOnce
		Event curEvent;
		ForwardServer* curProcessServer;
		ForwardClient* curProcessClient;
        ForwardHeader* curProcessHeader;
        ForwardPacketPtr curProcessPacketWS;
        ForwardPacketPtr curProcessPacketENet; // will be destroyed after process!
		uint8_t* curProcessData;
		size_t curProcessDataLength;
        
        /* 
            special use
        */
        // websocket:
        std::list<WSPacket> wsPackets;
    
        // static members
        static const size_t ivSize = 16;
		static size_t bufferNum;
		static UniqID ForwardCtrlCount;
	};
}

#endif
