#ifndef FORWARDSERVER_H
#define FORWARDSERVER_H

#include "uniqid.h"
#include "forwardbase.h"
#include "forwardclient.h"
#include "forwardpacket.h"
#include "aes_ctr.h"
#include "aes.h"
#include "utils.h"



namespace forwarder {
    class ForwardServer: public ForwardBase {
	protected:
		ForwardServer(NetType p_netType) :
			id(0),
			destId(0),
			peerLimit(0),
			desc(""),
			admin(false),
			base64(false),
			encrypt(false),
            compress(false),
			netType(p_netType),
			dest(nullptr),
			isClientMode(false),
			clientID(0),
			reconnect(false),
            reconnectdelay(1000),
            timeoutMin(0),
            timeoutMax(0),
            batchBuffer(nullptr),
            batchBufferSize(0),
            batchBufferOffset(0),
            released(false)
		{
#ifdef DEBUG_MODE
			printf("[forwarder] ForwardServer created, netType:%d\n", int(netType));
#endif
            ruleDict[Protocol::SysCmd] = HandleRule::SysCmd;
			ruleDict[Protocol::Forward] = HandleRule::Forward;
			ruleDict[Protocol::Process] = HandleRule::Process;
		}

		~ForwardServer() {
#ifdef DEBUG_MODE
			printf("[forwarder] ForwardServer released, netType:%d\n", int(netType));
#endif
			dest = nullptr;
			admin = false;
			release();
			clients.clear();
		}
	public:
		virtual void release() {};
        
		virtual ReturnCode initCommon(rapidjson::Value& serverConfig) final;
        
		virtual void init(rapidjson::Value& serverConfig) = 0;
        
		void initCipherKey(const char* key);
        
		bool hasConsistConfig(ForwardServer*);
        
		ForwardClient* getClient(UniqID clientId);
        
		void setRule(Protocol p, HandleRule rule);
        
		HandleRule getRule(Protocol p);
        
        // use buffer as a cache list
        // will auto realloc when there's no enough room for push,
        // and rewrite the prev data into new buffer memory
        void pushToBuffer(uint8_t* data, size_t len);
        
		// used for client mode
		virtual void doReconnect() {};
        
		virtual void doDisconnect() {};
        
		virtual bool isConnected() { return false; };
        
        virtual bool isClientConnected(UniqID targetClientID) { return false; };
        
        virtual bool doDisconnectClient(UniqID targetClientID) { return false; };

        virtual void poll() {};
        
        virtual ReturnCode broadcastPacket(ForwardPacketPtr outPacket) {};

        virtual ReturnCode sendPacket(ForwardClient* client, ForwardPacketPtr outPacket) { return ReturnCode::Err; };
        
        virtual ForwardClient* createClientFromPool() { return nullptr; }

	public:
		UniqID id;
		int destId;
		bool admin;
		bool encrypt;
		bool base64;
        bool compress;
        int peerLimit;
        int timeoutMin;
        int timeoutMax;
		AES_KEY encryptkey;
		NetType netType;
		ForwardServer* dest;
		UniqIDGenerator idGenerator;
		std::map<UniqID, ForwardClient*> clients;
		std::string desc;
		uint16_t port;
		std::map<Protocol, HandleRule> ruleDict;
        uint8_t* batchBuffer;
        size_t batchBufferSize;
        size_t batchBufferOffset;

		// used for client mode
		bool isClientMode;
		std::string address;
		UniqID clientID;
		bool reconnect; // auto reconncet to target host when disconnected
		size_t reconnectdelay; // ms
        bool released;
	};


class ForwardServerTcp: public ForwardServer {
    public:
    ForwardServerTcp():
            m_sfd(0),
#if defined(linux)
			MAXEVENTS(64),
    		m_efd(0),
    		m_events(nullptr),
#endif
            ForwardServer(NetType::TCP)
        {}
        ForwardServerTcp(const ForwardServerTcp& x) = delete;
        ForwardServerTcp& operator=(const ForwardServerTcp& x) = delete;
    
        virtual void release();
    
        virtual void init(rapidjson::Value& serverConfig);
    
        virtual void doReconnect();
    
        virtual void doDisconnect();
    
        virtual bool isConnected();
    
        virtual bool isClientConnected(UniqID targetClientID);
    
        virtual bool doDisconnectClient(UniqID targetClientID);
    
        virtual void poll();
    
        virtual ReturnCode broadcastPacket(ForwardPacketPtr outPacket);
    
        virtual ReturnCode sendPacket(ForwardClient* client, ForwardPacketPtr outPacket);
    
        virtual ForwardClient* createClientFromPool();
    
        typedef std::function<void(int fd, uint8_t* msg)> MsgHandler;
        typedef std::function<void(int fd)> OpenHandler;
        typedef std::function<void(int fd)> CloseHandler;
    
        void setMessageHandler(MsgHandler h) { m_msgHandler = h; }
        void setOpenHandler(OpenHandler h)   { m_openHandler = h; }
        void setCloseHandler(CloseHandler h) { m_closeHandler = h; }
    private:
        int initSocket();
        int makeSocketNonBlocking(int sfd);
    public:
        MsgHandler m_msgHandler;
        OpenHandler m_openHandler;
        CloseHandler m_closeHandler;
#if defined(linux)
    const int MAXEVENTS;
    int m_efd;
    epoll_event* m_events;
#endif
    int m_sfd;
};


class ForwardServerENet : public ForwardServer {
	public:
		ForwardServerENet() :
            ForwardServer(NetType::ENet),
            host(nullptr),
            poolForwardClientENet(sizeof(ForwardClientENet))
		{}
		ForwardServerENet(const ForwardServerENet& x) = delete;
		ForwardServerENet& operator=(const ForwardServerENet& x) = delete;

		virtual void release();

		virtual void init(rapidjson::Value& serverConfig);

		virtual void doReconnect();

		virtual void doDisconnect();

		virtual bool isConnected();
    
        virtual bool isClientConnected(UniqID targetClientID);
    
        virtual bool doDisconnectClient(UniqID targetClientID);
    
        ForwardClientENet* destroyClientByPtr(ForwardClientENet*);
    
        virtual ReturnCode broadcastPacket(ForwardPacketPtr outPacket);
    
        virtual ReturnCode sendPacket(ForwardClient* client, ForwardPacketPtr outPacket);
    
        virtual ForwardClient* createClientFromPool();

	public:
		ENetHost * host = nullptr;
		uint8_t broadcastChannelID = 0;
    private:
        Pool<ForwardClientENet> poolForwardClientENet;
	};




class ForwardServerWS : public ForwardServer {
	public:
		typedef websocketpp::server<websocketpp::config::asio> WebsocketServer;
		typedef websocketpp::client<websocketpp::config::asio_client> WebsocketClient;
        enum class WSEventType {
            Connected = 1,
            Disconnected = 2,
            Msg = 3,
            Error = 4
        };
        class WSEvent {
            public:
            WSEvent(WSEventType _event,
                    websocketpp::connection_hdl _hdl,
                    ForwardServerWS::WebsocketServer::message_ptr _msg):
                event(_event),
                hdl(_hdl),
                msg(_msg)
                {}
            public:
            WSEventType event;
            websocketpp::connection_hdl hdl;
            ForwardServerWS::WebsocketServer::message_ptr msg;
            
        };
	public:
		ForwardServerWS() :
            ForwardServer(NetType::WS),
            poolForwardClientWS(sizeof(ForwardClientWS))
		{}
		ForwardServerWS(const ForwardServerWS& x) = delete;
		ForwardServerWS& operator=(const ForwardServerWS& x) = delete;
    
        void setupReconnectTimer();

		virtual void release();

		virtual void init(rapidjson::Value& serverConfig);
		
		virtual void doReconnect();

		virtual void doDisconnect();

		virtual bool isConnected();
    
        virtual bool isClientConnected(UniqID targetClientID);
    
        virtual bool doDisconnectClient(UniqID targetClientID);
    
		virtual void poll();
    
        virtual ReturnCode broadcastPacket(ForwardPacketPtr outPacket);

        virtual ReturnCode sendPacket(ForwardClient* client, ForwardPacketPtr outPacket);
    
        virtual ForwardClient* createClientFromPool();
    
        ForwardClientWS* destroyClientByHDL(websocketpp::connection_hdl hdl);
    
        UniqID getClientIDByHDL(websocketpp::connection_hdl hdl) {
            auto it = hdlToClientId.find(hdl);
            if (it != hdlToClientId.end()) {
                UniqID id = it->second;
                return id;
            }
            return 0;
        }
    private:
		std::string getUri() {
			if (address == "127.0.0.1" || address == "localhost") {
				return "http://localhost:" + to_string(port);
			}
			return "ws://" + address + ":" + to_string(port) + "/";
		}
    
        void onWSReconnectTimeOut(websocketpp::lib::error_code const & ec);
    
        void onWSConnected(websocketpp::connection_hdl hdl);
        
        void onWSDisconnected(websocketpp::connection_hdl hdl);
    
        void onWSError(websocketpp::connection_hdl hdl);

        void onWSReceived(websocketpp::connection_hdl hdl, ForwardServerWS::WebsocketServer::message_ptr msg);
    public:
		WebsocketServer server;
		WebsocketClient serverAsClient;
		std::map<websocketpp::connection_hdl, UniqID, std::owner_less<websocketpp::connection_hdl> > hdlToClientId;
        std::list<WSEvent> eventQueue;
        Pool<ForwardClientWS> poolForwardClientWS;
	};

}
#endif
