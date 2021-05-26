#ifndef BASE64_H
#define BASE64_H

#include "base.h"


namespace forwarder {
	class Base64Codec {
	public:
		static Base64Codec& get() {
			static Base64Codec instance;
			return instance;
		}
		size_t calculateDataLength(const char * b64, size_t len) {
			size_t placeHolders = placeHoldersCount(b64, len);
			return len * 3 / 4 - placeHolders;
		}

		void toByteArray(const char * b64, size_t len, uint8_t* &data, size_t * dataLength) {
			uint32_t i, j, l, tmp;
			//tmp, placeHolders, data
			size_t placeHolders = placeHoldersCount(b64, len);

			*dataLength = len * 3 / 4 - placeHolders;
			if(data == nullptr)
				data = new uint8_t[*dataLength];

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? len - 4 : len;

			uint32_t L = 0;

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (revLookup[charCodeAt(b64, i)] << 18) |
					(revLookup[charCodeAt(b64, i + 1)] << 12) |
					(revLookup[charCodeAt(b64, i + 2)] << 6) |
					revLookup[charCodeAt(b64, i + 3)];
				data[L++] = (tmp >> 16) & 0xFF;
				data[L++] = (tmp >> 8) & 0xFF;
				data[L++] = tmp & 0xFF;
			}

			if (placeHolders == 2) {
				tmp = (revLookup[charCodeAt(b64, i)] << 2) | (revLookup[charCodeAt(b64, i + 1)] >> 4);
				data[L++] = tmp & 0xFF;
			}
			else if (placeHolders == 1) {
				tmp = (revLookup[charCodeAt(b64, i)] << 10) |
					(revLookup[charCodeAt(b64, i + 1)] << 4) |
					(revLookup[charCodeAt(b64, i + 2)] >> 2);
				data[L++] = (tmp >> 8) & 0xFF;
				data[L++] = tmp & 0xFF;
			};
		}

		std::string fromByteArray(uint8_t* data, size_t len) {
			uint32_t tmp;
			uint8_t extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
			std::string output("");
			std::string parts("");
			size_t maxChunkLength = 16383; // must be multiple of 3
										   // go through the array every three bytes, we'll deal with trailing stuff later
			for (size_t i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
				std::string tmp;
				encodeChunk(data,
					i,
					(i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength),
					tmp);
				parts += tmp;
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			if (extraBytes == 1) {
				tmp = data[len - 1];
				output += std::string(1, code[tmp >> 2]);
				output += std::string(1, code[(tmp << 4) & 0x3F]);
				output += std::string("==");
			}
			else if (extraBytes == 2) {
				tmp = (data[len - 2] << 8) + (data[len - 1]);
				output += std::string(1, code[tmp >> 10]);
				output += std::string(1, code[(tmp >> 4) & 0x3F]);
				output += std::string(1, code[(tmp << 2) & 0x3F]);
				output += std::string("=");
			}
			parts += output;
            lastB64 = parts;
			return parts;
		}
        
        const std::string& getLastB64() const {
            return lastB64;
        }

	private:
		Base64Codec() {
			code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
			for (size_t i = 0; i < strlen(code); ++i) {
				revLookup[charCodeAt(code, i)] = i;
			}
			revLookup[charCodeAt("-", 0)] = 62;
			revLookup[charCodeAt("_", 0)] = 63;
		}

		inline uint8_t charCodeAt(const char * str, uint32_t i) {
			return (uint8_t)str[i];
		}

		size_t placeHoldersCount(const char * b64, size_t len = 0) {
			if (!len)
				len = strlen(b64);
			if (len % 4 > 0) {
				printf("Invalid string. Length must be a multiple of 4");
				return 0;
			}
			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			char last2 = b64[len - 2];
			char last1 = b64[len - 1];
			return last2 == '=' ? 2 : (last1 == '=' ? 1 : 0);
		}

		size_t byteLength(const char * b64, size_t len = 0) {
			if (!len)
				len = strlen(b64);
			// base64 is 4/3 + up to two characters of the original data
			return len * 3 / 4 - placeHoldersCount(b64);
		}

		std::string tripletToBase64(uint32_t num) {
			return std::string(
				std::string(1, code[num >> 18 & 0x3F]) +
				std::string(1, code[num >> 12 & 0x3F]) +
				std::string(1, code[num >> 6 & 0x3F]) +
				std::string(1, code[num & 0x3F]));
		}

		void encodeChunk(uint8_t * data, uint32_t start, uint32_t end, std::string& output) {
			uint32_t idx = 0;
			for (uint32_t i = start; i < end; i += 3) {
				uint32_t num = (data[i] << 16) + (data[i + 1] << 8) + (data[i + 2]);
				output += tripletToBase64(num);
			}
		}

	private:
		const char * code;
        std::string lastB64;
		std::map<uint32_t, uint32_t> revLookup;
	};
};

/*

Base64Codec base64;

const char * data = "has a constructor that will do it for you";
std::string b64 = base64.fromByteArray((uint8_t*)data, strlen(data));

std::cout << "b64:[" << b64 <<"]"<< std::endl;

uint8_t * ret = nullptr;
size_t len;
base64.toByteArray(b64.c_str(), b64.size(), ret, &len);

for (int i = 0; i < len; i++) {
	std::cout << "[" << (int)ret[i] << "]" << std::endl;
}
*/
#endif
