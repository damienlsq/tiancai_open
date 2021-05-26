const facFloorBase = require('facFloorBase');
const warDefines = require('warDefines');

cc.Class({
  extends: facFloorBase,
  properties: {
    receptMTPL: 2003, // 胡十三
    mailMTPL: 1018, // 快递机器人

    mailBox: cc.Node,
    mailSpine: sp.Skeleton,

    monitor: sp.Skeleton,
  },
  onLoad() {
    this.mailBox.active = false;
    this.initMe();
    emitter.on(this, "newMailCome", this.checkMailNpc);
    emitter.on(this, "beginPlot", this.onBeginPlot);
    emitter.on(this, "endPlot", this.onEndPlot);
    this.scheduleOnce(this.checkMail, 3);

    cc.loader.loadRes(`spine/monitor`, sp.SkeletonData, (err, d) => {
      this.monitor.skeletonData = d;
      this.monitor.setAnimation(0, 'monitor', true);
    });
    cc.loader.loadRes(`spine/mailBox`, sp.SkeletonData, (err, d) => {
      this.mailSpine.skeletonData = d;
      this.mailSpine.setAnimation(0, 'mailBox', true);
    });
  },
  initMe() {
    this.initCommon();
    const actionList = [
      { action: 'stand', weight: 90 },
    ];
    if (mbgGame.player.hasFinishPlot(5)) {
      actionList.push({ action: 'say', weight: 10, type: "rant" });
    }

    const opt = {
      mTplID: this.receptMTPL,
      spineName: mbgGame.config[`mtpl${this.receptMTPL}`].spine,
      charaID: this.receptMTPL,
      scene: 'hall',
      sceneCom: this,
      mode: 'actionList',
      actionList,
      posID: 1,
    };
    this._receptNPC = this.addCharacter(opt);
    // this.checkAchieve(); bug
  },
  checkMail() {
    mbgGame.netCtrl.sendMsg("player.mailCheck", {}, (data) => {
      emitter.emit("newMailCome", data.count);
    });
  },
  refreshFloor() {
    this.randAdv();
  },
  onBeginPlot() {
    if (this._mailNPC) this._mailNPC.node.active = false;
  },
  onEndPlot() {
    if (this._mailNPC) this._mailNPC.node.active = true;
  },
  checkMailNpc(newMailCount) {
    if (!mbgGame.player.hasFinishPlot(5)) {
      return;
    }
    let hasNewMail = false;
    const mailsData = mbgGame.getCache('player.mailList');
    if (newMailCount == null) {
      if (mailsData) {
        newMailCount = _.filter(mailsData, { rf: 0 }).length;
      }
    }
    // mbgGame.log('checkMailNpc', newMailCount, mailsData);
    if (newMailCount) {
      hasNewMail = true;
    } else {
      hasNewMail = false;
    }
    if (this._mailNPC) {
      return;
    }
    if (!hasNewMail) {
      // 没新邮件了
      this.mailBox.active = false;
      return;
    }
    if (this.mailBox.active) {
      return;
    }
    this._mailNPC = this.addCharacter({
      mTplID: this.mailMTPL,
      spineName: mbgGame.config[`mtpl${this.mailMTPL}`].spine,
      scene: 'hall',
      sceneCom: this,
      mode: 'holeIn',
      posID: 2,
      clickDisable: true,
    });
    // 3秒后放箱
    this.scheduleOnce(this.mailNPCMail, 3);
  },

  mailNPCMail() {
    if (!this._mailNPC || !this._mailNPC.isValid) return;
    this._mailNPC.spineCtrl().setComplteCB(() => {
      // mbgGame.log("find nextExAction");
      this.showMailBox();
    });
    this._mailNPC.spineCtrl().doAction('mail', false);
    // this._mailNPC.say('你有一个快递');
    // 3秒后走人
    this.scheduleOnce(this.mailNPCOut, 6);
  },
  mailNPCOut() {
    if (!this._mailNPC || !this._mailNPC.isValid) return;
    this._mailNPC.holeOut();
    delete this._mailNPC;
  },

  showMailBox() {
    this.mailBox.active = true;
    // 说句话
    // this._mailNPC.say('收快递啦喂', 3);
    this.mailSpine.setAnimation(0, 'mailBox', true);
  },

  clickClock() {
    // mbgGame.managerUi.teach.showTeach('talent');
    if (!mbgGame.player.hasFinishPlot(5)) {
      return;
    }
    // 每1分钟才会说一次
    const now = moment().unix();
    if (this._lastBaoShiTime && (this._lastBaoShiTime + 60 > now)) {
      return;
    }
    this._lastBaoShiTime = now;
    const self = this;
    mbgGame.netCtrl.sendMsg("player.aiMsg", {
      ask: '报时',
    }, (data) => {
      // mbgGame.log('data', data);
      if (data.code !== 'ok') return;
      self._receptNPC.say(data.msg, 5);
    });
  },

  clickMailBox() {
    this.mailSpine.setAnimation(0, 'mailBoxOpen', true);
    mbgGame.resManager.loadPrefab('panelMail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelMail');
    });
  },
  clickCharacter() {
    if (!mbgGame.player.hasFinishPlot(5)) {
      return;
    }
    // 每10分钟才会说一次
    const now = moment().unix();
    if (this._lastSayTime && (this._lastSayTime + 600 > now)) {
      return;
    }
    this._lastSayTime = now;
    let ask = '';
    const hour = moment().hour();
    if (hour >= 6 && hour <= 9) {
      ask = '求卦'; // 只有早上6～9点，才求卦
    }
    if (!ask) {
      return;
    }
    mbgGame.netCtrl.sendMsg("player.aiMsg", {
      ask,
    }, (data) => {
      // mbgGame.log('data', data);
      if (data.code !== 'ok') return;
      if (this._receptNPC) {
        this._receptNPC.say(data.msg, 30);
      }
    });
  },

  randAdv() {
    let advList = ['bs', 'tehui', 'tc'];
    if (mbgGame.isIOS()) {
      advList.push('video');
    }
    if (mbgGame.channel_id === 'aligames') {
      advList = ['tehui', 'tc'];
    }

    this.advType = _.sample(advList);
    if (this.advType === 'tehui') {
      this.monitor.setSkin('skin1');
    } else if (this.advType === 'bs') {
      this.monitor.setSkin('skin2');
    } else if (this.advType === 'video') {
      this.monitor.setSkin('skin3');
    } else if (this.advType === 'wove') {
      this.monitor.setSkin('skin4');
    } else if (this.advType === 'tc') {
      this.monitor.setSkin('skin5');
    }
  },

  onMonitor() {
    if (!mbgGame.player.hasFinishPlot(5)) {
      return;
    }
    if (this.advType === 'video') {
      const shopItems = mbgGame.getCache('shop.list');
      if (shopItems) {
        const advItem = _.find(shopItems, { act: 'video' });
        if (!advItem) return;
        if (mbgGame.advertisement.isVideoCanPlay()) {
          mbgGame.managerUi.createConfirmDialog(
            mbgGame.getString('advvideo'),
            () => {
              mbgGame.netCtrl.sendMsg("shop.showVideo", {
                id: advItem.id,
                status: mbgGame.advertisement.getVideoStatus(),
              }, (data) => {
                // mbgGame.log("[mbgGame.showVideo]", data);
                if (data.code === "ok") {
                  mbgGame.advertisement.showRewardVideo(data);
                }
              });
            });
        }
      }
      return;
    }

    if (this.advType === 'bs') {
      let url;
      if (mbgGame.isIOS()) {
        url = 'https://itunes.apple.com/cn/app/id967573281';
      } else {
        url = 'https://www.taptap.com/app/11836';
      }
      mbgGame.managerUi.createBoxSure(mbgGame.getString('advbs'), 'link', url);
      return;
    }
    if (this.advType === 'wove') {
      let url;
      if (mbgGame.isIOS()) {
        url = 'https://itunes.apple.com/cn/app/id1256967054';
      } else {
        url = 'https://www.taptap.com/app/80041';
      }
      mbgGame.managerUi.createBoxSure(mbgGame.getString('advwove'), 'link', url);
      return;
    }

    if (this.advType === 'tc') {
      mbgGame.managerUi.createBoxSure(mbgGame.getString('advtc'), 'link', 'https://www.bilibili.com/bangumi/play/ss5770');
      return;
    }

    if (this.advType === 'tehui') {
      // 跑去特惠商品
      mbgGame.sceneMenu.onClickBtn5();
    }
  },
});