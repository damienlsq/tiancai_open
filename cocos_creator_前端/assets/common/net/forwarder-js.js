/*
|  1 byte	    |  1 byte			|		1   byte		|		1 byte				|
|  Version		|  Length of Header	|	ProtocolType		|		 hash				|
|									4 bytes												|
|									headerFlag											|
|                                   n bytes                                             |
|                           dynamic data sequence by flag                               |

*/
const Buffer = require('buffer').Buffer;

const Protocol = {
    Unknown: 0,
    SysCmd: 1,
    Forward: 2,
    Process: 3,
    BatchForward: 4,
};

const HeaderFlag = {
    IP: 1 << 0, // IPv4 address
    HostID: 1 << 1, // send from/to which host
    ClientID: 1 << 2, // send from/to which client of host
    SubID: 1 << 3, // SysCmd's subID
    // type flag
    Base64: 1 << 4,
    Encrypt: 1 << 5,
    Compress: 1 << 6,
    Broadcast: 1 << 7,
    ForceRaw: 1 << 8, // No Base64、Encrypt、Compress
    PacketLen: 1 << 9,
};

const HeaderVersion = 1;
const HeaderBaseLength = 8;
const HeaderDataLength = 0xff;

const FlagToBytes = {};

FlagToBytes[HeaderFlag.IP] = 4;
FlagToBytes[HeaderFlag.HostID] = 1;
FlagToBytes[HeaderFlag.ClientID] = 4;
FlagToBytes[HeaderFlag.SubID] = 1;
FlagToBytes[HeaderFlag.Base64] = 0;
FlagToBytes[HeaderFlag.Encrypt] = 0;
FlagToBytes[HeaderFlag.Compress] = 4;
FlagToBytes[HeaderFlag.Broadcast] = 0;
FlagToBytes[HeaderFlag.ForceRaw] = 0;
FlagToBytes[HeaderFlag.PacketLen] = 4;


const FlagToStr = {};
FlagToStr[HeaderFlag.IP] = "IP";
FlagToStr[HeaderFlag.HostID] = "HostID";
FlagToStr[HeaderFlag.ClientID] = "ClientID";
FlagToStr[HeaderFlag.SubID] = "SubID";
FlagToStr[HeaderFlag.Base64] = "Base64";
FlagToStr[HeaderFlag.Encrypt] = "Encrypt";
FlagToStr[HeaderFlag.Compress] = "Compress";
FlagToStr[HeaderFlag.Broadcast] = "Broadcast";
FlagToStr[HeaderFlag.ForceRaw] = "ForceRaw";
FlagToStr[HeaderFlag.PacketLen] = "PacketLen";

// small endian
class ForwardHeader {
    constructor(buf) {
        if (buf) {
            this.m_Buf = buf;
        } else {
            this.m_Buf = new Buffer(HeaderBaseLength + HeaderDataLength);
            this.m_Buf.fill(0);
            this.setVersion(HeaderVersion);
        }
    }
    setBuf(buf) {
        this.m_Buf = buf;
    }
    setVersion(version) {
        return this.m_Buf.writeInt8(version, 0);
    }
    getVersion() {
        return this.m_Buf.readInt8(0);
    }
    getHeaderLength() {
        return this.m_Buf.readInt8(1);
    }
    setHeaderLength(l) {
        this.m_Buf.writeInt8(l, 1);
    }
    resetHeaderLength() {
        const dataSize = this.calDataSize();
        const length = dataSize + HeaderBaseLength;
        this.setHeaderLength(length);
    }
    getProtocol() {
        return this.m_Buf.readInt8(2);
    }
    setProtocol(p) {
        this.m_Buf.writeInt8(p, 2);
    }
    isFlagOn(f) {
        const flag = this.m_Buf.readInt32LE(4);
        return (flag & f) > 0;
    }
    cleanFlag() {
        this.m_Buf.writeInt32LE(0, 4);
    }
    setFlag(f, on) {
        let flag = this.m_Buf.readInt32LE(4);
        if (on) {
            flag |= f;
        } else {
            flag &= (~f);
        }
        this.m_Buf.writeInt32LE(flag, 4);
    }
    getFlagPos(f) {
        const flag = this.m_Buf.readInt32LE(4);
        let count = 0;
        for (let i = 0; i < 32; i++) {
            const _f = 1 << i;
            if (_f === f) {
                return count;
            } else if (flag & _f) {
                count += FlagToBytes[_f];
            }
        }
        return 0;
    }
    calDataSize() {
        const flag = this.m_Buf.readInt32LE(4);
        let bytesNum = 0;
        for (let i = 0; i < 32; i++) {
            const _f = 1 << i;
            if (flag & _f) {
                bytesNum += FlagToBytes[_f];
            }
        }
        return bytesNum;
    }
    getHostID() {
        return this.m_Buf.readInt8(HeaderBaseLength + this.getFlagPos(HeaderFlag.HostID));
    }
    setHostID(hostID) {
        this.m_Buf.writeInt8(hostID, HeaderBaseLength + this.getFlagPos(HeaderFlag.HostID));
    }
    getClientID() {
        return this.m_Buf.readInt32LE(HeaderBaseLength + this.getFlagPos(HeaderFlag.ClientID));
    }
    setClientID(clientID) {
        this.m_Buf.writeInt32LE(clientID, HeaderBaseLength + this.getFlagPos(HeaderFlag.ClientID));
    }
    getSubID() {
        return this.m_Buf.readInt8(this.getFlagPos(HeaderFlag.HostID));
    }
    setSubID(subID) {
        this.m_Buf.writeInt8(subID, this.getFlagPos(HeaderFlag.HostID));
    }
    getIP() {
        return this.m_Buf.readInt32LE(HeaderBaseLength + this.getFlagPos(HeaderFlag.IP));
    }
    setIP(ip) {
        this.m_Buf.writeInt32LE(ip, HeaderBaseLength + this.getFlagPos(HeaderFlag.IP));
    }
    getUncompressedSize() {
        return this.m_Buf.readInt32LE(HeaderBaseLength + this.getFlagPos(HeaderFlag.Compress));
    }
    setUncompressedSize(size) {
        this.m_Buf.writeInt32LE(size, HeaderBaseLength + this.getFlagPos(HeaderFlag.Compress));
    }
    getPacketLength() {
        return this.m_Buf.readInt32LE(HeaderBaseLength + this.getFlagPos(HeaderFlag.PacketLen));
    }
    setPacketLength(len) {
        this.m_Buf.writeInt32LE(len, HeaderBaseLength + this.getFlagPos(HeaderFlag.PacketLen));
    }
    getHeaderDebugInfo() {
        let info = "";
        for (const flag in FlagToBytes) {
            info += FlagToStr[flag];
            if (this.isFlagOn(flag)) {
                info += " on";
            } else {
                info += " off";
            }
            info += "\n";
        }
        info += `headerLen = ${this.getHeaderLength()}`;
        info += `packetLen = ${this.getPacketLength()}`;
        return info;
    }
}


module.exports = {
    Protocol,
    HeaderFlag,
    HeaderBaseLength,
    HeaderDataLength,
    FlagToBytes,
    ForwardHeader,
};