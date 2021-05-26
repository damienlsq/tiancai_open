cc.Class({
  extends: cc.Component,

  properties: {
    msg: cc.RichText,
  },
  initMe(str, atlas) {
    if (atlas) {
      this.msg.imageAtlas = atlas;
    }
    this.msg.string = str;
    this.msg.node.off(cc.Node.EventType.TOUCH_END);
    this.node.setPosition(0, 250);
    this.floatNow();
  },

  floatNow() {
    const self = this;
    // 动画
    this.node.setScale(0.8, 0.8);
    const action = cc.sequence(
      cc.scaleTo(0.05, 1, 1),
      cc.delayTime(1),
      cc.fadeOut(1),
      cc.callFunc(() => {
        self.node.destroy();
      }));
    this.node.runAction(action);
    this.node.runAction(cc.moveBy(1, 0, 30));
  },

  onDestroy() {
    const idx = mbgGame.floatMessageList.indexOf(this.node);
    if (idx === -1) {
      return;
    }
    mbgGame.floatMessageList.splice(idx, 1);
  },
});