const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    container: cc.Node,
    btnGetAll: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_mailBox');
    emitter.on(this, "newMailCome", this.refreshMe);

    // 保存模版
    this.mailInfoItemTemplate = cc.instantiate(this.container.children[0]);
    this.container.removeAllChildren();
  },
  onDestroy() {
    emitter.off(this, "newMailCome");
  },
  onAddBaseWin() {
    this.refreshMe();
  },

  print(id) {
    const node = cc.instantiate(this.mailInfoItemTemplate);
    this.container.addChild(node);

    const com = node.getComponent("mailInfo");
    com.initMe(id);
  },

  refreshMe() {
    if (!this.isValid) {
      return;
    }
    const self = this;
    const data = mbgGame.getCache('player.mailList', 60);
    if (!data) {
      mbgGame.checkNetCache('player.mailList', this.refreshMe.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    // mbgGame.log('[mail] refresh', data);
    this.container.removeAllChildren();
    // 排序
    const sortMap = [];
    let hasAttachment = false;
    _.mapKeys(data, (mailData, key) => {
      let score = mailData.time;
      if (mailData.gf === 0) {
        score *= 2;
        // 只要有未领取附件，就需要显示领取全部
        hasAttachment = true;
      }
      sortMap.push({
        id: key,
        score,
      });
    });
    const sortedMap = _.sortBy(sortMap, 'score');
    sortedMap.forEach((x) => {
      self.print(x.id);
    });

    this.btnGetAll.getComponent('itemBtn').setStatus(hasAttachment);
  },

  getAll() {
    const mailsData = mbgGame.getCache('player.mailList');
    if (!mailsData) return;
    mbgGame.netCtrl.sendMsg("player.mailOp", {
      op: 4,
    }, (data) => {
      // mbgGame.log("getAll mailOp", data);
      data.keys.forEach((x) => {
        delete mailsData[x];
      });
      emitter.emit("newMailCome");
      emitter.emit("closeMe");
    });
  },

});
