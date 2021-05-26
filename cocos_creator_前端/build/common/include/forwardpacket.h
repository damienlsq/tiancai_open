#ifndef FORWARDPACKET_H
#define FORWARDPACKET_H

#include "forwardbase.h"
#include "forwardheader.h"



namespace forwarder {

	class ForwardPacket {
	public:
		virtual uint8_t* getHeaderPtr() const = 0;
		virtual uint8_t* getDataPtr() const = 0;
		virtual void* getRawPtr() const = 0;
		virtual ForwardHeader* getHeader() const {
			return (ForwardHeader*)getHeaderPtr();
		}
		size_t getTotalLength() const {
			return length;
        }
        void setTotalLength(size_t l) {
            length = l;
        }
        size_t getDataLength() const;
        virtual void setHeader(ForwardHeader* header) = 0;
        virtual void setHeader(uint8_t* p, size_t len) {
            
        }
		virtual void setData(uint8_t* p, size_t len) = 0;
        virtual void setRaw(uint8_t* p, size_t len) = 0;
		ForwardPacket() {
		}
		~ForwardPacket() {
		}
	protected:
		size_t length = 0; // the packet's total length
	};

	typedef std::shared_ptr<ForwardPacket> ForwardPacketPtr;

    
    class ForwardPacketConst: public ForwardPacket {
    public:
        ForwardPacketConst(uint8_t* pH = nullptr, size_t lenH = 0, uint8_t* pD = nullptr, size_t lenD = 0):
            headerPtr(pH),
            headerLen(lenH),
            dataPtr(pD),
            dataLen(lenD)
        {
            length = lenH + lenD;
        }
        
        ~ForwardPacketConst() {
            headerPtr = nullptr;
            headerLen = 0;
            dataPtr = nullptr;
            dataLen = 0;
        }
        
        virtual uint8_t* getHeaderPtr() const {
            return headerPtr;
        }
        
        virtual uint8_t* getDataPtr() const {
            return dataPtr;
        }
        
        virtual void* getRawPtr() const {
            return static_cast<void*>(headerPtr);
        }
        
        virtual void setHeader(ForwardHeader* header) {

        }
        
        virtual void setHeader(uint8_t* p, size_t len) {
            headerPtr = p;
            headerLen = len;
        }
        
        virtual void setData(uint8_t* p, size_t len) {
            dataPtr = p;
            dataLen = len;
        }
        
        virtual void setRaw(uint8_t* p, size_t len) {
            
        }

    public:
        uint8_t* headerPtr;
        size_t headerLen;
        uint8_t* dataPtr;
        size_t dataLen;
    };

    

	class ForwardPacketENet : public ForwardPacket {
	public:
		ForwardPacketENet(ENetPacket* p_packet) :
			owned(false),
			packet(p_packet)
		{
			length = p_packet->dataLength;
		}

		ForwardPacketENet(size_t len, enet_uint32 flags) :
			owned(true)
		{
			packet = enet_packet_create(NULL, len, flags);
			memset(packet->data, '\0', len);
			length = len;
		}

        ~ForwardPacketENet() {
			packet = nullptr;
		}
        
        ENetPacket* getENetPacket() {
            return packet;
        }
        
        size_t referenceCount() const {
            return packet->referenceCount;
        }

		virtual uint8_t* getHeaderPtr() const {
			return static_cast<uint8_t*>(packet->data);
		}		

		virtual uint8_t* getDataPtr() const {
			return static_cast<uint8_t*>(packet->data + getHeader()->getHeaderLength());
		}

		virtual void* getRawPtr() const {
			return static_cast<void*>(packet);
		}

		virtual void setHeader(ForwardHeader* header) {
			memcpy(packet->data, header, header->getHeaderLength());
		}

		virtual void setData(uint8_t* data, size_t dataLength) {
			size_t headerLength = getHeader()->getHeaderLength();
			if ((dataLength + headerLength) > packet->dataLength) {
				printf("[error] setData");
				return;
			}
			memcpy(packet->data + headerLength, data, dataLength);
			if (!length) {
				length = headerLength + dataLength;
			}
		}
        
        virtual void setRaw(uint8_t* p, size_t len) {
            memcpy(packet->data, p, len);
        }
        
	public:
		bool owned;
		ENetPacket* packet = nullptr;
	};

	class ForwardPacketWS : public ForwardPacket {
	public:
		ForwardPacketWS(const std::string& packet) :
			owned(false),
			packetString(packet)
		{
			length = packet.size();
			packetData = (uint8_t*)(packetString.c_str());
		}
	
		ForwardPacketWS(void* p_data) :
			owned(false),
			packetData(static_cast<uint8_t*>(p_data))
		{}

		ForwardPacketWS(uint8_t* p_data) :
			owned(false),
			packetData(p_data)
		{}

		ForwardPacketWS(size_t len) :
			owned(true)
		{
			length = len;
			packetData = new uint8_t[len]{ 0 };
		}

		~ForwardPacketWS() {
			if (owned && packetData) {
				delete packetData;
				packetData = nullptr;
			}
		}

		virtual uint8_t* getHeaderPtr() const {
			return packetData;
		}

		virtual uint8_t* getDataPtr() const {
			return packetData + getHeader()->getHeaderLength();
		}

		virtual void* getRawPtr() const {
			return static_cast<void*>(packetData);
		}

		virtual void setHeader(ForwardHeader* header) {
			memcpy(packetData, header, header->getHeaderLength());
		}

		virtual void setData(uint8_t* data, size_t len) {
			memcpy(packetData + getHeader()->getHeaderLength(), data, len);
			if (!length) {
				length = getHeader()->getHeaderLength() + len;
			}
		}
        
        virtual void setRaw(uint8_t* p, size_t len) {
            memcpy(packetData, p, len);
        }
        
	public:
		bool owned = false;
		uint8_t* packetData = nullptr;
		std::string packetString;
	};
}

#endif
