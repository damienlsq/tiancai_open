const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    container: cc.Node,
  },

  onLoad() {
    // 保存模版
    this.clanInfoTemplate = cc.instantiate(this.container.children[0]);
    this.container.removeAllChildren();
    this.getRanklist();
  },

  refreshMe() {
    const list = mbgGame.getCache('clan.clanRank');
    if (!list) return;
    mbgGame.gameScene && mbgGame.gameScene.setWaitOver();

    this.container.removeAllChildren();

    for (let i = 0; i < list.length; i++) {
      const data = list[i];
      const node = cc.instantiate(this.clanInfoTemplate);
      this.container.addChild(node);

      const com = node.getComponent("clanInfo");
      com.initMe(data, true);
    }
  },

  getRanklist() {
    const data = mbgGame.getCache('clan.clanRank', 600);
    if (!data) {
      mbgGame.gameScene && mbgGame.gameScene.setWait(mbgGame.getString("waitStr_data"));
      mbgGame.checkNetCache('clan.clanRank', this.refreshMe.bind(this));
      return;
    }
    mbgGame.gameScene && mbgGame.gameScene.setWaitOver();
    // mbgGame.log('getRanklist', data);
    if (!this.node || !this.node.isValid) {
      return;
    }
    this.refreshMe();
  },
});
