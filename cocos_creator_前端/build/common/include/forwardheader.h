#ifndef FORWARDHEADER_H
#define FORWARDHEADER_H

#include "base.h"
#include "defines.h"
#include "utils.h"


namespace forwarder {
/*
|  1 byte		|  1 byte			|		1   byte		|		1 byte				| 
|  Version		|  Length of Header	|	ProtocolType		|		 hash				| 
|									4 bytes												|
|									headerFlag											|
|                                   n bytes                                             |
|                           dynamic data sequence by flag                               |

*/
	enum class HeaderFlag: uint32_t {
		IP			= 1 << 0, // IPv4 address
		HostID		= 1 << 1, // send from/to which host
		ClientID	= 1 << 2, // send from/to which client of host
		SubID		= 1 << 3, // SysCmd's subID
		// type flag
		Base64		= 1 << 4,
		Encrypt		= 1 << 5,
        Compress	= 1 << 6,
        Broadcast	= 1 << 7,
        ForceRaw	= 1 << 8,  // No Base64、Encrypt、Compress
        PacketLen   = 1 << 9
	};

	constexpr size_t HeaderBaseLength = 8;
    constexpr size_t HeaderDataLength = 0xff;

	static std::map<HeaderFlag, size_t> FlagToBytes {
		{ HeaderFlag::IP,			4 },
		{ HeaderFlag::HostID,		1 },
		{ HeaderFlag::ClientID,		4 },
		{ HeaderFlag::SubID,		1 },
		{ HeaderFlag::Base64,		0 },
		{ HeaderFlag::Encrypt,		0 },
        { HeaderFlag::Compress,		4 }, // record the uncompressed size
        { HeaderFlag::Broadcast,	0 },
        { HeaderFlag::ForceRaw,     0 },
        { HeaderFlag::PacketLen,    4 }, // record packet size ( slice )
	};

    // for debug
    static std::map<HeaderFlag, std::string> FlagToStr {
        { HeaderFlag::IP,			"IP"        },
        { HeaderFlag::HostID,		"HostID"    },
        { HeaderFlag::ClientID,		"ClientID"  },
        { HeaderFlag::SubID,		"SubID"     },
        { HeaderFlag::Base64,		"Base64"    },
        { HeaderFlag::Encrypt,		"Encrypt"   },
        { HeaderFlag::Compress,		"Compress"  },
        { HeaderFlag::Broadcast,	"Broadcast" },
        { HeaderFlag::ForceRaw,     "ForceRaw"  },
        { HeaderFlag::PacketLen,    "PacketLen" },
    };
    
	// small endian
	class ForwardHeader
	{
	public:
        ForwardHeader() {
            memset(data, 0, HeaderDataLength);
        }
        
        inline uint8_t getVersion() {
			return version;
		}

		inline Protocol getProtocol() {
			return static_cast<Protocol>(protocol);
		}

		inline void setProtocol(Protocol p) {
			protocol = static_cast<uint8_t>(p);
		}

		inline uint8_t getHeaderLength() {
			return length;
		}

		inline void setHeaderLength(uint8_t l) {
			length = l;
		}

		void resetHeaderLength() {
			length = calDataSize() + HeaderBaseLength;
		}

		bool isFlagOn(HeaderFlag f) {
			return (flag & (uint32_t)f) > 0;
		}

		void cleanFlag() {
			flag = 0;
		}

		void setFlag(HeaderFlag f, bool on) {
			if (on) {
				flag = flag | uint32_t(f);
			}
			else {
				flag = flag & (~uint32_t(f));
			}
		}

		size_t getFlagPos(HeaderFlag f) {
			size_t count = 0;
			for (size_t i = 0; i < 32; i++) {
				HeaderFlag _f = HeaderFlag(1 << i);
				if (_f == f) {
					return count;
				}
				else if (flag & (uint32_t)_f) {
					count += FlagToBytes[_f];
				}
			}
			return 0;
		}

		size_t calDataSize() {
			size_t bytesNum = 0;
			for (size_t i = 0; i < 32; i++) {
				HeaderFlag _f = HeaderFlag(1 << i);
				if (flag & (uint32_t)_f) {
					bytesNum += FlagToBytes[_f];
				}
			}
			return bytesNum;
		}


		inline uint8_t getHostID() {
			return *(data + getFlagPos(HeaderFlag::HostID));
		}

		inline void setHostID(uint8_t hostID) {
			*(data + getFlagPos(HeaderFlag::HostID)) = hostID;
		}
        /*
		inline uint16_t getClientID() {
			return *((uint16_t*)(data + getFlagPos(HeaderFlag::ClientID)));
		}

		inline void setClientID(uint16_t clientID) {
			*(data + getFlagPos(HeaderFlag::ClientID)) = clientID;
		}
        */

        inline uint32_t getClientID() {
            return ntohl(*((uint32_t*)(data + getFlagPos(HeaderFlag::ClientID))));
        }
        
        inline void setClientID(uint32_t clientID) {
            *((uint32_t*)(data + getFlagPos(HeaderFlag::ClientID))) = ntohl(clientID);
        }

		inline uint8_t getSubID() {
			return *(data + getFlagPos(HeaderFlag::SubID));
		}

		inline void setSubID(uint8_t subID) {
			*(data + getFlagPos(HeaderFlag::SubID)) = subID;
		}

		inline uint32_t getIP() {
			return *((uint32_t*)(data + getFlagPos(HeaderFlag::IP)));
		}

		inline void setIP(uint32_t ip) {
			*((uint32_t*)(data + getFlagPos(HeaderFlag::IP))) = ip;
		}

        inline uint32_t getUncompressedSize() {
            return ntohl(*((uint32_t*)(data + getFlagPos(HeaderFlag::Compress))));
        }
        
        inline void setUncompressedSize(uint32_t size) {
            *((uint32_t*)(data + getFlagPos(HeaderFlag::Compress))) = htonl(size);
        }
        
        inline uint32_t getPacketLength() {
            return ntohl(*((uint32_t*)(data + getFlagPos(HeaderFlag::PacketLen))));
        }
        
        inline void setPacketLength(uint32_t len) {
            *((uint32_t*)(data + getFlagPos(HeaderFlag::PacketLen))) = htonl(len);
        }
        
        std::string getHeaderDebugInfo() {
            std::string info = "\n";
            for(auto it = FlagToBytes.begin(); it != FlagToBytes.end(); it++) {
                info += FlagToStr[it->first];
                if(isFlagOn(it->first)) {
                    info += " on";
                } else {
                    info += " off";
                }
                info += "\n";
            }
            info += "headerLen = " + to_string(getHeaderLength());
            info += "packetLen = " + to_string(getPacketLength());
            return info;
        }
        
	public:
		uint8_t version = HeaderVersion;
		uint8_t length = 0;
		uint8_t protocol = 0;
		uint8_t hash = 0;
		uint32_t flag = 0;
		uint8_t data[HeaderDataLength];
	};
}
#endif
