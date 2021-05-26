cc.Class({
  extends: cc.Component,

  properties: {
  },
  onLoad() {
  },
  warUtils() {
    return this.node.getComponent('warUtils');
  },
  warEvt() {
    return this.node.getComponent('warEvent');
  },
  warMgr() {
    return this.node.getComponent('warManager');
  },
});