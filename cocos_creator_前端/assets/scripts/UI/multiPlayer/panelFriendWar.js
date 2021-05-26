cc.Class({
  extends: cc.Component,

  properties: {
    btnLabel: cc.Label,
    codelabel0: cc.Label,
    inviteNode: cc.Node,
    acceptNode: cc.Node,
  },
  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('friendwar');
    this.codelabel0.string = "";
  },
  onToggle() {
    if (!this.m_matching) {
      this.startMatch();
    } else {
      this.stopMatch();
    }
  },
  // 开始匹配
  startMatch() {
    this.m_matching = true;
    this.acceptNode.active = false;
    const self = this;
    mbgGame.netCtrl.sendMsg("frdwar.startMatch", {}, (data) => {
      self.btnLabel.string = mbgGame.getString('frdwarEndMatch');
      self.setMyCode(data.code);
    });
  },
  // 停止匹配
  stopMatch() {
    const self = this;
    mbgGame.netCtrl.sendMsg("frdwar.stopMatch", {}, () => {
      self.m_matching = false;
      self.codelabel0.string = "";
      self.btnLabel.string = mbgGame.getString('frdwarMatch');
      self.acceptNode.active = true;
    });
  },
  onInputCode1(editbox) {
    const code = editbox.string;
    mbgGame.log("onInputCode", code);
    this.m_Code = code;
  },
  onBeginWar() {
    mbgGame.netCtrl.sendMsg("frdwar.enterCode", {
      code: this.m_Code,
    }, (data) => {
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      }
    });
  },
  setMyCode(code) {
    this.codelabel0.string = code || "";
    if (!code) {
      this.stopMatch();
    }
  },
});