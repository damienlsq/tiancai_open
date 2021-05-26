// 单个连接 WebsocketConnection
// 不要改动这个类。自定义的操作，通过继承NetCtrl来实现。
class WSCon {
  constructor() {
    this.m_wsClient = null;
    this.m_netCtrl = null;
  }
  // public
  disconnect() {
    if (this.m_wsClient) {
      this.m_wsClient.close();
    }
    this.m_wsClient = null;
  }
  destroy() {
    this.disconnect();
    this.m_netCtrl = null;
  }
  isConnecting() {
    return this.m_wsClient && this.m_wsClient.readyState === WebSocket.CONNECTING;
  }
  isConnected() {
    return this.m_wsClient && this.m_wsClient.readyState === WebSocket.OPEN;
  }
  createSocketObj(url) {
    const self = this;
    let obj;
    if (mbgGame.isWechatGame()) {
      obj = wx.connectSocket({
        url,
      });
      obj.onOpen(() => {
        self.onOpen();
      });
      obj.onClose(() => {
        self.onClose();
      });

      obj.onError((msg) => {
        self.onError(msg);
      });
      // 接收数据
      obj.onMessage((data) => {
        self.handleNetPacket(data);
      });
    } else {
      if (cc.sys.isNative && mbgGame.isAndroid()) {
        let pemUrl = cc.assetManager.utils.getUrlWithUuid(cc.resources.getInfoWithPath(cc.path.mainFileName('cacert')).uuid, {
          isNative: true,
          ext: '.pem',
        });
        pemUrl = pemUrl.replace('.json', '.pem');
        obj = new WebSocket(url, [], pemUrl);
      } else {
        obj = new WebSocket(url);
      }
      obj.onerror = function (e) {
        self.onError(e);
      };
      obj.onopen = function () {
        self.onOpen();
      };
      obj.onmessage = function (data) {
        self.handleNetPacket(data);
      };
      obj.onclose = function () {
        self.onClose();
      };
    }
    return obj;
  }
  createWebSockClient(netCtrl) {
    if (!netCtrl) {
      mbgGame.log("[createWebSockClient] netCtrl is null.");
      return;
    }
    this.m_netCtrl = netCtrl; // netCtrl binding

    if (this.m_wsClient) {
      mbgGame.log("[createWebSockClient] m_wsClient not null, disconnect it.");
      this.disconnect();
    }
    const url = netCtrl.getWsURL();
    if (!url) {
      mbgGame.log('[createWebSockClient] url unvalid');
      return;
    }
    mbgGame.log(`[createWebSockClient] connect to ${url}`);
    this.m_wsClient = this.createSocketObj(url);
  }
  onError(e) {
    if (!this.m_netCtrl) {
      return;
    }
    if (this.m_netCtrl.onConError) {
      this.m_netCtrl.onConError(e);
    } else {
      mbgGame.log('[m_wsClient.onerror] no m_netCtrl.onConError');
    }
  }
  onOpen() {
    if (!this.m_netCtrl) {
      return;
    }
    if (this.m_netCtrl.onConOpen) {
      this.m_netCtrl.onConOpen(this);
    } else {
      mbgGame.log('[m_wsClient.onopen] no m_netCtrl.onConOpen');
    }
  }
  onClose() {
    if (!this.m_netCtrl) {
      return;
    }
    if (this.m_netCtrl.onConClose) {
      this.m_netCtrl.onConClose();
    } else {
      mbgGame.log('[m_wsClient.onclose] no m_netCtrl.onConClose');
    }
  }
  handleNetPacket(e) {
    // mbgGame.log('[m_wsClient.onmessage] new msg. len: ' + e.data.length);
    // mbgGame.log('[m_wsClient.onmessage] msg: ' + e.data);
    let result;
    if (typeof (e.data) === "object") { // buffer
      result = this.handleBytesPacket(e.data, this.onHandlePacketSuccess.bind(this));
    }
    return result;
  }
  onHandlePacketSuccess(dNetHeader, dPacketData) {
    if (!dNetHeader || !dPacketData || !this.m_netCtrl) {
      return;
    }
    if (this.m_netCtrl.onConMessage) {
      this.m_netCtrl.onConMessage(dNetHeader, dPacketData);
    } else {
      mbgGame.log('[client_common.net.handleNetPacket] no m_netCtrl.onConMessage');
    }
  }
  handleBytesPacket(arrayBuffer, callback) {
    if (cc.sys.isNative) {
      const arr = new Uint8Array(arrayBuffer);
      // mbgGame.log("arr", arr);
      const result = this.parseBytesData(arr);

      callback(result.dNetHeader, result.dPacketData);
    } else {
      const self = this;
      const reader = new FileReader();
      if (reader.readAsArrayBuffer) {
        reader.onload = function () {
          if (this.error) {
            mbgGame.error("[ws] reader error", this.error);
          }
          if (!this.result) {
            mbgGame.error("[ws] reader error, no result");
            return;
          }
          const result = self.parseBytesData(this.result);
          // mbgGame.log("cmd", msgobj.get_cmd());
          // mbgGame.log("data", typeof(baseinfo));
          // mbgGame.log("baseinfo.encodeJSON", baseinfo.encodeJSON());
          // mbgGame.log("baseinfo.get_lang", baseinfo.get_lang());
          callback(result.dNetHeader, result.dPacketData);
        };
        reader.readAsArrayBuffer(arrayBuffer);
      } else {
        const arr = new Uint8Array(arrayBuffer);
        const result = this.parseBytesData(arr);
        callback(result.dNetHeader, result.dPacketData);
      }
    }
  }
  validWSState() {
    if (!this.m_wsClient || this.m_wsClient.readyState !== WebSocket.OPEN) {
      mbgGame.error("[netSendJson] m_wsClient not open, netSendJson failed.");
      return false;
    }
    return true;
  }
  netSendText(textData) {
    if (mbgGame.isWechatGame()) {
      return this.m_wsClient.send({ data: textData });
    }
    return this.m_wsClient.send(textData);
  }
  netSendBytes(bytesData) {
    if (mbgGame.isWechatGame()) {
      return this.m_wsClient.send({ data: bytesData });
    }
    return this.m_wsClient.send(bytesData);
  }
  parseBytesData(bytesData) {
    return this.m_netCtrl.fromBuffer(bytesData);
  }
}


module.exports = WSCon;