
const mbgGameTimer = require('timer');

class NetCtrlProxy {
  constructor() {
    this.m_TimerOwnerID = mbgGameTimer.newOwnerID();
    this.m_Count = 1;
    this.m_Packets = [];
    this.m_Callbacks = { /* queIndex: callbackFunc  */ };
    this.setupPollTimer();
  }
  release() {
    delete this.m_Count;
    delete this.m_Packets;
    delete this.m_Callbacks;
    delete this.m_onReceivedServerMsg;
  }
  clean() {
    this.m_Packets = [];
  }
  setNetCtrlObj(obj) {
    this.m_CtrlObj = obj;
    this.m_CtrlObj.onConnected = this.onConnected.bind(this);
    this.m_CtrlObj.onDisconnected = this.onDisconnected.bind(this);
    this.m_CtrlObj.onConMessage = this.onConMessage.bind(this);
  }
  ctrlObj() {
    return this.m_CtrlObj;
  }
  onConnected() {
    if (this.m_onConnected) this.m_onConnected();
  }
  onDisconnected() {
    if (this.m_onDisconnected) this.m_onDisconnected();
  }
  isConnected() {
    return this.ctrlObj().isConnected();
  }
  reconnect() {
    return this.ctrlObj().reconnect();
  }
  disconnect() {
    return this.ctrlObj().disconnect();
  }
  getServerConfig() {
    return this.ctrlObj().m_serverConfig;
  }
  setServerConfig(serverConfig) {
    return this.ctrlObj().setServerConfig(serverConfig);
  }
  setupConnect() {
    return this.ctrlObj().setupConnect();
  }
  setupPollTimer() {
    mbgGameTimer.removeCallOut(this, "onPoll");
    mbgGameTimer.callOut(this, this.onPoll.bind(this), {
      time: 0.01,
      flag: "onPoll",
      forever: true,
    });
  }
  onPoll() {
    if (this.ctrlObj() && this.ctrlObj().onPoll) this.ctrlObj().onPoll();
  }
  onSendMsg(cmd, dPacketData) {
    return this.m_CtrlObj && this.m_CtrlObj.onSendMsg(cmd, dPacketData);
  }
  pushPacket(cmd, dData, dOption) {
    const _q = this.m_Count;
    this.m_Count += 1;
    const dPacketData = {
      header: {
        _cmd: cmd,
        _q,
      },
      data: dData,
    };
    if (dOption && dOption.fwdPair) {
      dPacketData.fwdPair = dOption.fwdPair;
    }
    if (this.m_onPushPacket) this.m_onPushPacket(dPacketData);
    this.m_Packets.push(dPacketData);
    return dPacketData;
  }
  flushMessage() {
    // 发送队列中的包
    const failPackages = [];
    for (let i = 0; i < this.m_Packets.length; i++) {
      const dPacketData = this.m_Packets[i];
      if (this.isConnected()) {
        const cmd = dPacketData.header._cmd;
        dPacketData._cmd = cmd;
        if (!this.onSendMsg(cmd, dPacketData)) {
          // 发送失败就缓存起来
          failPackages.push(dPacketData);
        }
      } else {
        mbgGameTimer.removeCallOut(this, "onFlushMessage");
        mbgGameTimer.callOut(this, this.onFlushMessage.bind(this), {
          time: 1,
          flag: "onFlushMessage",
          forever: true,
        });
        return;
      }
    }
    this.m_Packets = failPackages;
  }
  onFlushMessage() {
    if (this.isConnected()) {
      this.flushMessage();
    }
  }
  dispatchMessage(dData) {
    if (!dData.header) {
      return;
    }
    // mbgGame.log("[dispatchMessage] msg:\n", JSON.stringify(dData));
    if (dData.header._q) {
      const callback = this.m_Callbacks[dData.header._q];
      if (callback) {
        // mbgGame.log("[dispatchMessage.callback]");
        callback(dData.data, dData.header);
        delete this.m_Callbacks[dData.header._q];
      }
    } else if (this.m_onReceivedServerMsg) {  // 服务器主动发的包？
      this.m_onReceivedServerMsg(dData.header._cmd, dData.data);
    }
    // dData.header, dData.data
    // switch (msg.header._cmd);
  }
  // 发包：先放入m_Packets，网络可用时再发送
  sendMessage(cmd, dData, callback, dOption) {
    const dPacketData = this.pushPacket(cmd, dData, dOption);
    if (!dPacketData) {
      mbgGame.error("[sendMessage] no dPacketData");
      return;
    }
    if (callback) {
      this.m_Callbacks[dPacketData.header._q] = callback;
    }
    this.flushMessage();
  }
  sendMsg(cmd, dData, callback) {
    return this.sendMessage(cmd, dData, callback);
  }
  onConMessage(dNetHeader, dPacketData) {
    // 注意：dHeader可能为空
    if (dPacketData.header) {
      // mbgGame.log("[onConMessage] <" + dPacketData.header._cmd + ">, _q:" + dPacketData.header._q + ", PacketQueue.len:" + this.m_Packets.length);
    }
    this.dispatchMessage(dPacketData);
  }
}

module.exports = NetCtrlProxy;