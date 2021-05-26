cc.Class({
  extends: cc.Component,

  properties: {
    icon: cc.Sprite,
    round: cc.Label,
    roundSp: cc.Sprite,
  },

  // use this for initialization
  initMe(dOption) {
    this.node.stopAllActions();
    // 按时间的
    if (dOption && dOption.lt) { // lefttime
      this.setFadeTimer(dOption.lt);
    }
    // 按回合的
    if (dOption && dOption.lr) { // leftround
      this.setLeftRound(dOption.lr);
    }
    // 第一次载入才读图片
    this.setIcon(dOption.icon);
  },
  refreshBuffIcon(dOption) {
    // 按时间的
    if (dOption && dOption.lt) { // lefttime
      this.setFadeTimer(dOption.lt);
    }
    // 按回合的
    if (dOption && dOption.lr) { // leftround
      this.setLeftRound(dOption.lr);
    }
  },
  setFadeTimer(lefttime) {
    if (lefttime > 0) {
      this.node.opacity = 255;
      this.node.stopAllActions();
      this.unschedule(this.doFade);
      const flashTime = Math.max(0.01, lefttime - 3);
      this.scheduleOnce(this.doFade, flashTime);
    }
  },
  setLeftRound(leftround) {
    // this.round.string = `${leftround || ''}`;
    mbgGame.resManager.setAutoAtlasFrame(this.roundSp, 'uiBase', `buff_${leftround}`);
  },
  setIcon(image) {
    mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', image);
  },
  doFade() {
    if (!this.node || !this.node.isValid) return;
    this.node.runAction(cc.sequence(
      cc.fadeOut(0.2),
      cc.fadeIn(0.2)).repeatForever());
  },
});