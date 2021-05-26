const forwarderjs = require('forwarder-js');
const websocket = require('websocket');
const NetCtrlBase = require('netctrlbase');
const Buffer = require('buffer').Buffer;

const Status = {
  Connected: 1,
  Error: -1,
};

const Protocol = forwarderjs.Protocol;
const HeaderFlag = forwarderjs.HeaderFlag;
const ForwardHeader = forwarderjs.ForwardHeader;


class NetCtrlWS extends NetCtrlBase {
  constructor() {
    super();
  }
  release() {
    this.releaseCommon();
    this.disconnect();
  }
  getPort() {
    if (!this.m_serverConfig) {
      return null;
    }
    return this.m_serverConfig.port_ws;
  }
  fromBuffer(bytesData) {
    const buf = new Buffer(bytesData);
    const header = new ForwardHeader(buf);
    const dataBuf = buf.slice(header.getHeaderLength());
    const sPacketData = dataBuf.toString();
    const dPacketData = JSON.parse(sPacketData);
    const dNetHeader = {};
    if (dPacketData._meta) {
      dNetHeader.meta = dPacketData._meta;
      delete dPacketData._meta;
    }
    const result = {
      dNetHeader,
      dPacketData,
    };
    return result;
  }
  onSendMsg(cmd, dPacketData) {
    const outHeader = new ForwardHeader();
    outHeader.setProtocol(Protocol.Forward);
    outHeader.setFlag(HeaderFlag.Broadcast, true);
    if (dPacketData.fwdPair) {
      const [forwardServerId, forwardClientId] = dPacketData.fwdPair;
      delete dPacketData.fwdPair;
      outHeader.setFlag(HeaderFlag.HostID, true);
      outHeader.setHostID(forwardServerId);
      outHeader.setFlag(HeaderFlag.ClientID, true);
      outHeader.setClientID(forwardClientId);
    }
    outHeader.resetHeaderLength();
    const sData = JSON.stringify(dPacketData);
    const dataBuf = new Buffer(sData);
    const buf = Buffer.concat([outHeader.m_Buf.slice(0, outHeader.getHeaderLength()), dataBuf]);
    const arrBuf = this.toArrayBuffer(buf);
    const ret = this.onSendBytes(arrBuf);
    // ws的ret返回值都是undefined，没有参考的意义，都返回正确就是了
    return true;
  }
  // https://www.npmjs.com/package/to-arraybuffer
  toArrayBuffer(buf) {
    // If the buffer is backed by a Uint8Array, a faster version will work
    if (buf instanceof Uint8Array) {
      // If the buffer isn't a subarray, return the underlying ArrayBuffer
      if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
      } else if (typeof buf.buffer.slice === 'function') {
        // Otherwise we need to get a proper copy
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
    }

    if (Buffer.isBuffer(buf)) {
      // This is the slow version that will work with any Buffer
      // implementation (even in old browsers)
      const arrayCopy = new Uint8Array(buf.length);
      const len = buf.length;
      for (let i = 0; i < len; i++) {
        arrayCopy[i] = buf[i];
      }
      return arrayCopy.buffer;
    } else {
      throw new Error('Argument must be a Buffer');
    }
  }
  isConnecting() {
    const connectObj = this.connectObj();
    if (connectObj && connectObj.isConnecting()) {
      return true;
    }
    return false;
  }
  isConnected() {
    const connectObj = this.connectObj();
    if (connectObj && connectObj.isConnected()) {
      return true;
    }
    return false;
  }
  connectObj() {
    return this.m_wsCon;
  }
  disconnect() {
    if (this.m_wsCon) {
      this.m_wsCon.destroy();
    }
    delete this.m_wsCon;
    this.onDisconnected();
  }
  onSendJson(textData) {
    const connectObj = this.connectObj();
    return connectObj.netSendText(textData);
  }
  onSendBytes(bytesData) {
    const connectObj = this.connectObj();
    return connectObj.netSendBytes(bytesData);
  }
  setupConnect() {
    if (!this.m_wsCon) {
      this.m_wsCon = new websocket();
    }
    if (!this.m_wsCon.isConnected()) {
      if (!this.m_wsCon.isConnecting()) {
        this.m_wsCon.createWebSockClient(this);
      }
    }
  }
  connected() {
    this.m_serverConfig.status = Status.Connected; // 连接成功
    this.onConnected();
  }
  onConOpen(wsCon) {
    this.connected();
  }
  onConError(e) {
    mbgGame.log("[onConError] Error = ");
    mbgGame.log(e.toString());
    this.disconnect(); // 出错了就关闭吧，由上层逻辑去恢复连接
  }
  onConClose() {
    mbgGame.log("[onConClose]");
    this.disconnect(); // 出错了就关闭吧，由上层逻辑去恢复连接
  }
  base64Encode(str) {
    return Base64.encode(str);
  }
  base64Decode(str) {
    return Base64.decode(str);
  }
}

module.exports = NetCtrlWS;