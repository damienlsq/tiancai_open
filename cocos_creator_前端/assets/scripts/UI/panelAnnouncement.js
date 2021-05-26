cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.Node,
  },

  onAddBaseWin() {
    this.node._winBase.setTitle(mbgGame.getString('title_announcement'));
    mbgGame.setLabel(this.content, cc.sys.localStorage.getItem("announcement"));
    this.node._winBase.avoidBgClose();
    // 防止意外关闭，强制玩家看
    emitter.off(this, 'closeMe');
  },

  closeWin() {
    this.node._winBase.closeMe();
  },
});
