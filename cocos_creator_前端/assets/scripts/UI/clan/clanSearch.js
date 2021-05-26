const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    container: cc.Node,
    editBox: cc.EditBox,
  },

  onLoad() {
    // 保存模版
    this.clanInfoTemplate = cc.instantiate(this.container.children[0]);
    this.container.removeAllChildren();

    mbgGame.removeCache('clan.searchClan');
    this.recommendSearch();
  },

  refreshMe() {
    const list = mbgGame.getCache('clan.searchClan');
    if (!list) return;
    this.container.removeAllChildren();

    for (let i = 0; i < list.length; i++) {
      const data = list[i];
      const node = cc.instantiate(this.clanInfoTemplate);
      this.container.addChild(node);

      const com = node.getComponent("clanInfo");
      com.initMe(data);
    }
  },

  clickSearch() {
    const msg = this.editBox.string;
    // if (!msg) return;
    // 防止同一数据多次发送
    if (this.lastMsg && this.lastMsg === msg) return;
    this.lastMsg = msg;
    mbgGame.gameScene && mbgGame.gameScene.setWait(mbgGame.getString("waitStr_data"));
    mbgGame.netCtrl.sendMsg("clan.searchClan", {
      str: msg,
    }, (data) => {
      mbgGame.gameScene && mbgGame.gameScene.setWaitOver();
      if (data.code === 'ok') {
        mbgGame.setCache('clan.searchClan', data.data);
      }
      if (!this.node || !this.node.isValid) {
        return;
      }
      this.refreshMe();
    });
  },

  recommendSearch() {
    const data = mbgGame.getCache('clan.searchClan', 60);
    if (!data) {
      mbgGame.checkNetCache('clan.searchClan', this.refreshMe.bind(this), {
        recommend: 1,
      });
      return;
    }
    if (!this.node || !this.node.isValid) {
      return;
    }
    this.refreshMe();
  },
});
