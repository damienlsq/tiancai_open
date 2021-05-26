cc.Class({
  extends: cc.Component,

  properties: {
    fullBtn: cc.Node,
    smallBtn: cc.Node,
    centerTeach: cc.Node,
    energyTeach: cc.Node,
    skillTeach: cc.Node,
  },
  onLoad() {
    this.step = 0;
  },
  beginTeach(cb) {
    this.m_cb = cb;
    // 暂停战斗
    this.updateTeach();
  },
  onNextTeach() {
    this.step += 1;
    this.updateTeach();
  },
  updateTeach() {
    this.centerTeach.active = false;
    this.energyTeach.active = false;
    this.skillTeach.active = false;
    switch (this.step) {
      case 0:
        this.centerTeach.active = true;
        break;
      case 1:
        this.energyTeach.active = true;
        break;
      case 2:
        this.skillTeach.active = true;
        break;
      default:
        this.node.active = false;
        mbgGame.player.setLocalItem("warTeach", "ok");
        if (this.m_cb) {
          this.m_cb();
        }
        // 恢复战斗
        break;
    }
  },
});