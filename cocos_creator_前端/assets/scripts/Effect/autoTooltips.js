cc.Class({
  extends: cc.Component,

  properties: {
    autoEnable: true,
    upMode: false,
  },

  // use this for initialization
  onLoad() {
    if (this.autoEnable) {
      this.node.on(cc.Node.EventType.TOUCH_END, this.showTips, this);
    }
  },

  setTipsStr(str) {
    this.tipsStr = str;
  },

  showTips() {
    let str;
    if (!this.autoEnable) return;
    if (this.tipsStr) {
      str = this.tipsStr;
    } else {
      str = mbgGame.getString(`tooltips_${this.node.name}`);
    }

    if (!str) return;
    mbgGame.uiLayerTop.setTooltips(str, this.node, this.upMode);
  },
});