
class NetCtrlBase {
  setServerConfig(serverConfig) {
    this.m_serverConfig = serverConfig;
  }
  cleanServerConfig() {
    this.m_serverConfig = null;
  }
  getServerConfig() {
    return this.m_serverConfig;
  }
  releaseCommon() {
    delete this.m_serverConfig;
  }
  getHost() {
    if (!this.m_serverConfig) {
      return null;
    }
    return this.m_serverConfig.host;
  }
  getPort() {
    if (!this.m_serverConfig) {
      return null;
    }
    return this.m_serverConfig.port;
  }
  getWsURL() {
    if (!this.m_serverConfig) {
      return null;
    }
    return this.m_serverConfig.ws_url;
  }
  isConnected() { // override
  }
  disconnect() { // override
  }
  reconnect() { // override
  }
  onConMessage(dNetHeader, dPacketData) { // override

  }
  onDisconnected() { // override

  }
  onConnected() { // override

  }
  isConnecting() { // override
  }
}

module.exports = NetCtrlBase;