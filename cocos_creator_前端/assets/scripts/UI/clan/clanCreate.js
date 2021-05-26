const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    clanName: cc.EditBox,
    clanNameModify: cc.RichText,
    clanDesc: cc.EditBox,
    modeInfo: cc.Label,
    scoreInfo: cc.Label,
    btnCreate: cc.Node,
    flag: cc.Node,
    isModify: false,
  },

  onLoad() {
    this.mode = 0;
    this.score = 0;
    if (this.isModify) {
      this.node._winTitle = mbgGame.getString('title_clanModify');
      this.btnCreate.getComponent('itemBtn').setBtnLabel(mbgGame.getString('ok'));
    } else {
      this.btnCreate.getComponent('itemBtn').setBtnLabel(`${mbgGame.getString("create")}<br />${mbgGame.getString('unitPrice', {
        unit: 'logo_diamonds',
        price: mbgGame.config.constTable.createClanNeed,
      })}`);
    }
    const minFrames = parseInt(mbgGame.config.constTable.flagMax[2] / 1000);
    const minFlags = parseInt(mbgGame.config.constTable.flagMax[2] % 1000);
    const maxFrames = parseInt(mbgGame.config.constTable.flagMax[3] / 1000);
    const maxFlags = parseInt(mbgGame.config.constTable.flagMax[3] % 1000);
    if (!this.isModify) {
      this.chooseFlag = (_.random(minFrames, maxFrames) * 1000) + _.random(minFlags, maxFlags);
      this.flagCom = mbgGame.managerUi.addIconFlag(this.flag, this.chooseFlag, this.clickFlag.bind(this));
    }
    this.showMode();
    this.showScore();
  },

  onAddBaseWin(detailData) {
    if (!detailData) return;
    // 修改模式
    this.mode = parseInt(detailData.mode);
    this.score = parseInt(detailData.score);
    this.clanNameModify.string = detailData.name;
    this.clanDesc.string = detailData.desc;
    this.showMode();
    this.showScore();
    if (this.clanName) {
      this.clanName.node.active = false;
    }
    this.chooseFlag = detailData.flag;
    mbgGame.managerUi.addIconFlag(this.flag, detailData.flag, this.clickFlag.bind(this));
  },

  doCreate() {
    const msg = this.clanName.string;
    if (!msg || msg.length > this.clanName.maxLength || msg.length < 2) {
      mbgGame.managerUi.floatMessage(mbgGame.getString("textLimit", {
        min: 2,
        max: this.clanName.maxLength,
        count: msg.length,
      }));
      return;
    }
    const sendData = {
      name: msg,
      desc: this.clanDesc.string,
      mode: this.mode || 0,
      score: this.score || 0,
      flag: this.chooseFlag,
    };


    // mbgGame.log("sendData", sendData);
    mbgGame.netCtrl.sendMsg("clan.createClan", sendData, (data) => {
      // mbgGame.managerUi.createBoxSure("创建成功");
      if (data.status === 0) {
        mbgGame.hasClan = true;
        mbgGame.player.removeLocalItem('clanExitTime');
        emitter.emit('refreshClan');
      }
    });
  },

  clickFlag() {
    mbgGame.resManager.loadPrefab('panelSelectFlag', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelSelectFlag', this.chooseFlag, true);
      node.getComponent('panelSelectFlag').onChoose = this.onChooseFlag.bind(this);
    });
  },

  onChooseFlag(id) {
    // mbgGame.log('[onChooseFlag]', id);
    this.chooseFlag = id;
    mbgGame.managerUi.addIconFlag(this.flag, this.chooseFlag);
  },

  clickCreate() {
    // 一定要设置呢称才能创建
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName();
      return;
    }
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("clanCreateMsg", {
        price: mbgGame.config.constTable.createClanNeed,
      }), this.doCreate.bind(this));
  },

  clickModify() {
    const sendData = {
      modify: 1,
      desc: this.clanDesc.string || '',
      mode: this.mode || 0,
      score: this.score || 0,
      flag: +this.chooseFlag,
    };
    mbgGame.netCtrl.sendMsg("clan.createClan", sendData, (data) => {
      if (data.status === 0) {
        // 这样可以马上清缓存
        mbgGame.getCache('clan.clanInfo', 1);
        emitter.emit('closeMe');
      }
    });
  },

  btnClick() {
    if (this.isModify) {
      this.clickModify();
      return;
    }
    this.clickCreate();
  },

  showMode() {
    switch (this.mode) {
      case 1:
        this.modeInfo.string = mbgGame.getString("clanMode1");
        break;
      case 2:
        this.modeInfo.string = mbgGame.getString("clanMode2");
        break;
      default:
        this.mode = 0;
        this.modeInfo.string = mbgGame.getString("clanMode0");
        break;
    }
  },
  showScore() {
    this.scoreInfo.string = mbgGame.getString("scoreRequired") + this.score;
  },
  modeLeft() {
    if (this.mode > 0) {
      this.mode -= 1;
    }
    this.showMode();
  },

  modeRight() {
    if (this.mode < 2) {
      this.mode += 1;
    }
    this.showMode();
  },

  scoreLeft() {
    if (this.score > 0) {
      this.score -= 500;
    }
    this.showScore();
  },

  scoreRight() {
    if (this.score < 10 * 500) {
      this.score += 500;
    }
    this.showScore();
  },

  setFlagBtnClick() {
    this.clickFlag();
  },
});
