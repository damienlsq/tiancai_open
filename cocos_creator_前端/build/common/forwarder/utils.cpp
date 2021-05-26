# include "utils.h"

using namespace std;

namespace forwarder {

	std::string readFile(const string &fileName)
	{
		ifstream ifs(fileName.c_str(), ios::in | ios::binary | ios::ate);

		ifstream::pos_type fileSize = ifs.tellg();
		ifs.seekg(0, ios::beg);

		vector<char> bytes(fileSize);
		ifs.read(&bytes[0], fileSize);

		return string(&bytes[0], fileSize);
	}

	bool isFileExist(const char *fileName)
	{
		std::ifstream infile(fileName);
		return infile.good();
	}


	void debugDocument(const rapidjson::Document& d) {
		rapidjson::StringBuffer buffer;
		rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
		d.Accept(writer);
		const char* s = buffer.GetString();
		printf("%s\n", s);
	}


	void debugBytes(const char * msg, uint8_t* data, size_t len) {
		std::cout << msg << "[" << len <<"]:";
		for (int i = 0; i < len; i++) {
			std::cout << std::hex << (int)data[i] << std::dec << ",";
		}
		std::cout << std::endl;
	}

	std::string transIP(uint32_t ip) {
		char str[INET_ADDRSTRLEN];
		inet_ntop(AF_INET, &ip, str, INET_ADDRSTRLEN);
		return std::string(str);
	}

}