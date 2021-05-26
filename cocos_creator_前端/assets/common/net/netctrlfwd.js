const NetCtrlBase = require('netctrlbase');

const EventType = {
  Nothing: 0,
  Connected: 1,
  Diconnected: 2,
  Message: 3,
};

let gCtrl = null;

class NetCtrlForwarder extends NetCtrlBase {
  constructor(fwdType) {
    super();
    this.m_ServerID = 0;
    this.m_FwdType = fwdType || "enet";
    /*
    if (!gCtrl) {
      gCtrl = new forwarder.ForwardCtrl();
      gCtrl.setDebug(false);
      gCtrl.setupLogger("");
    }
    */
    this.m_Ctrl = gCtrl;
  }
  release() {
    this.releaseCommon();
    this.disconnect();
    delete this.m_TimerOwnerID;
    if (this.m_ServerID) {
      if (this.m_Ctrl && this.m_Ctrl.removeServer) this.m_Ctrl.removeServer(this.m_ServerID);
      delete this.m_ServerID;
    }
    delete this.m_Ctrl;
  }
  setupConnect() {
    mbgGame.log("[forwarder] setupConnect ", this.getHost(), this.getPort());

    const serverID = this.m_Ctrl.createServer(JSON.stringify({
      id: 1, // doesn't matter
      desc: "C2FS_Host",
      netType: this.m_FwdType,
      encrypt: true,
      encryptkey: "88888888",
      compress: true,
      base64: true,
      debug: true,
      peers: 1,
      port: this.getPort(),
      isClient: true,
      address: this.getHost(),
      reconnect: false,
    }));
    this.m_Ctrl.setProtocolRule(serverID, 2, "Process");
    this.m_ServerID = serverID;
    if (!(this.m_ServerID > 0)) {
      mbgGame.log("[forwarder] wrong m_ServerID", this.m_ServerID);
    }
    mbgGame.log("[netctrlfwd] setupConnect", this.getHost(), this.getPort());
  }
  isConnected() {
    return this.m_Ctrl.isConnected(this.m_ServerID);
  }
  disconnect() {
    return this.m_Ctrl.disconnect(this.m_ServerID);
  }
  reconnect() {
    this.setupConnect();
  }
  getPort() {
    if (this.m_FwdType === "ws") {
      return this.m_serverConfig.port_ws;
    }
    return this.m_serverConfig.port_enet;
  }
  onPoll() {
    if (!this.m_ServerID) {
      return;
    }
    this.m_Ctrl.pollOnce(this.m_ServerID);
    const evt = this.m_Ctrl.getCurEvent();
    if (evt === EventType.Nothing) {
      return;
    }
    // mbgGame.log("[forwarder] evt ", evt);
    const sID = this.m_Ctrl.getCurProcessServerID();
    if (this.m_ServerID !== sID) {
      return;
    }
    const cID = this.m_Ctrl.getCurProcessClientID();
    if (evt === EventType.Message) {
      const sData = this.m_Ctrl.getCurProcessPacket();
      const dPacketData = JSON.parse(sData);
      // mbgGame.log("[forwarder] msg:", sData);
      this.onConMessage(null, dPacketData);
    } else if (evt === EventType.Connected) {
      this.m_Ctrl.setTimeout(sID, 0, 2000, 5000);
      this.m_Ctrl.setPingInterval(sID, 1000);
      this.onConnected();
    } else if (evt === EventType.Diconnected) {
      this.onDisconnected();
    }
  }
  onSendMsg(cmd, dPacketData) {
    let isBroadcast = true;
    const isForceRaw = false;
    const isBatchMode = false;
    const isUnreliable = false;
    let forwardServerId = 0;
    let forwardClientId = 0;
    if (dPacketData.fwdPair) {
      [forwardServerId, forwardClientId] = dPacketData.fwdPair;
      delete dPacketData.fwdPair;
      isBroadcast = false;
    }
    const sData = JSON.stringify(dPacketData);
    const ret = this.m_Ctrl.forwardText(this.m_ServerID, 0, sData, forwardServerId, forwardClientId,
      isBroadcast, isForceRaw, isBatchMode, isUnreliable);

    // OK 1 ERR 2
    if (ret === 2) return false;
    return true;
  }
  base64Encode(str) {
    if (cc.sys.isNative) {
      mbgGame.log("forwarder base64 encode");
      return this.m_Ctrl.base64Encode(str);
    }
    return Base64.encode(str);
  }
  base64Decode(str) {
    if (cc.sys.isNative) {
      mbgGame.log("forwarder base64 decode");
      return this.m_Ctrl.base64Decode(str);
    }
    return Base64.decode(str);
  }
}


module.exports = NetCtrlForwarder;