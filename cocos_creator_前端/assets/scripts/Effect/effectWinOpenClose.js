cc.Class({
  extends: cc.Component,

  properties: {
    shrink: 16,
  },
  // use this for initialization
  onLoad() {
    this.openType = 'popup';
    // this.open();
  },
  onEnable() {
    this.open();
  },
  onDisEnable() {
    this.off();
  },
  setOpenType(type) {
    // popup, up, down
    this.openType = type;
  },
  open(cb) {
    switch (this.openType) {
      case 'popup':
        this.node.stopAllActions();
        this.node.opacity = 0;
        this.scheduleOnce(function () {
          this.node.opacity = 255;
          const scale = (this.node.width - this.shrink) / this.node.width;
          this.node.setScale(scale, scale);
          this.node.runAction(
            cc.sequence(cc.scaleTo(0.2, 1, 1).easing(cc.easeExponentialInOut()),
              cc.callFunc(() => {
                if (cb) cb();
              })));
        }.bind(this), 0);

        break;

      default:
        break;
    }
  },
  off(cb) {
    switch (this.openType) {
      case 'popup':
        this.node.runAction(cc.fadeOut(0.3));
        this.node.runAction(
          cc.sequence(cc.scaleTo(0.3, 0.9, 0.9),
            cc.callFunc(() => {
              if (cb) cb();
            })));
        break;

      default:
        break;
    }
  },
});