cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.RichText,
  },

  onLoad() {
    this.content.string = '';
  },
  setContent(str) {
    this.content.string = str;
  },
  onOpened(dData) {
    this.node.active = true;
    this.setContent(dData.content || "");
    const com = this.node.getComponent("effectWinOpenClose");
    this.m_CanClose = false;
    com.open(() => {
      this.m_CanClose = true;
      this.unschedule(this.closeMe);
      this.scheduleOnce(this.closeMe, 2);
    });
  },
  closeMe() {
    if (!this.m_CanClose) {
      return;
    }
    const com = this.node.getComponent("effectWinOpenClose");
    com.off(() => {
      mbgGame.uiLayerTop.checkNotifyList();
    });
  },
});
