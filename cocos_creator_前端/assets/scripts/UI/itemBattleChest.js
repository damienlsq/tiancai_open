const spineObject = require('spineObject');

cc.Class({
  extends: cc.Component,

  properties: {
    bg: cc.Node,
    so: spineObject,
    stars: {
      default: [],
      type: cc.Node,
    },
  },
  onLoad() {
    // emitter.on(this, "refreshChestInfo", this.refreshChestInfo);
  },
  onDestroy() {
    // emitter.off(this, "refreshChestInfo");
  },
  getChestID() {
    const dData = mbgGame.player.getBattleLabChestDict();
    return dData[this.m_Idx];
  },
  getBattleChestImage() {
    return mbgGame.player.getBattleChestImage(this.getChestID());
  },
  getChestTypeIdx() {
    const dChest = this.getChestData();
    return dChest && dChest.idx;
  },
  getChestTitle() {
    return mbgGame.getString(`awdtitleclanchest${this.getChestTypeIdx()}`);
  },
  getChestConfig() {
    return mbgGame.config.constTable[`clanchest${this.getChestTypeIdx()}`];
  },
  getChestData() {
    return mbgGame.player.getBattleChestDataByID(this.getChestID());
  },
  isNewChest() {
    return this.getChestData() && this.getChestData().new;
  },
  cleanNewFlag() {
    if (this.getChestData() && this.getChestData().new) {
      delete this.getChestData().new;
    }
  },
  refreshChestInfo(idx) {
    if (mbgGame.winChestBox) {
      this.onClick(); // Note: 只是为了刷新弹窗的信息
    }
    if (idx != null) {
      this.m_Idx = idx;
    }
    this.bg.active = false;
    if (mbgGame.sceneMenu.curPageIdx() !== mbgGame.PageLab) {
      return;
    }
    this.unschedule(this.refreshLeftTime);
    const dData = this.getChestData();
    if (!dData) {
      for (let i = 0; i < 3; i++) {
        this.stars[i].active = false;
      }
      this.so.node.active = false;
      return;
    }
    this.bg.active = false;
    const bl = dData.bl || 0;
    for (let i = 0; i < 3; i++) {
      this.stars[i].active = i < bl;
    }
    this.so.node.active = true;
    this.so.m_SpineLoaded = true;
    this.so.setSkin(`skin_${this.getChestTypeIdx() === 1 ? 2 : 1}`);
    this.node.y = 0;
    if (this.isNewChest()) {
      this.node.y = -10;
      this.so.doOnceAction('start', 'idle');
      this.cleanNewFlag();
    } else if (mbgGame.player.getUnlockingBattleChestID() && mbgGame.player.getUnlockingBattleChestID() === this.getChestID()) {
      this.so.doAction('work', true);
    } else {
      this.so.doAction('idle', true);
      this.node.y = -10;
    }
    /*
    if (!dData.t) {
        if (mbgGame.player.isUnlockingBattleChest()) {
            this.bg.node.color = mbgGame.hex2color('aaaaaa');
        }
        return;
    }
    */
    if (dData.t) {
      this.schedule(this.refreshLeftTime, 1, cc.macro.REPEAT_FOREVER);
      this.refreshLeftTime();
    }
  },
  refreshLeftTime() {
    emitter.emit("refreshChestInfo2");
    const dData = this.getChestData();
    if (!dData) {
      this.unschedule(this.refreshLeftTime);
      return;
    }
    const lefttime = mbgGame.player.getBattleChestLefttime(this.getChestID());
    if (lefttime <= 0) {
      this.unschedule(this.refreshLeftTime);
      this.so.doActionNoClear('loop', true);
    }
  },
  openLabConfirm(cb, subTitle, fast, needDiamonds) {
    mbgGame.resManager.loadPrefab('winChestBox', (prefab) => {
      const node = cc.instantiate(prefab);

      const rightBtnDisabled = false;
      let leftBtnDisabled = false;

      const dData = this.getChestData();
      // mbgGame.log('openLabConfirm', dData, subTitle, fast, needDiamonds);
      // 已经发送求助的，就不能再发送
      if (dData.c || !mbgGame.hasClan) {
        leftBtnDisabled = '加入联盟后，才能请求盟友帮助解密哦';
      }
      let left = mbgGame.config.constTable.clanRequestCount;
      if (mbgGame.timeVar.clanRequestCount) {
        left = mbgGame.config.constTable.clanRequestCount - +mbgGame.timeVar.clanRequestCount.d;
      }
      if (left < 1) {
        leftBtnDisabled = '今天的请求帮助次数已达到上限，请明天再来';
      }
      const dOpenData = {
        id: this.getChestID(),
        name: this.getChestTitle(),
        subTitle,
        needDiamonds,
        leftBtn: mbgGame.getString('clanRequest'),
        leftBtnDisabled,
        rightBtn: mbgGame.getString('hackChest'),
        rightBtnDisabled,
        desc: mbgGame.getString(`unlockchest`, {
          name: this.getChestTitle(),
          fast: fast ? mbgGame.getString('immediate') : '',
        }),
        image: this.getBattleChestImage(),
      };
      mbgGame.log("openLabConfirm", dOpenData);
      if (!mbgGame.winChestBox) {
        mbgGame.managerUi.addSmallWin(node, 'winChestBox', dOpenData,
          cb,
          this.requestChest.bind(this));
      } else {
        mbgGame.winChestBox.refreshChestBox(dOpenData,
          cb,
          this.requestChest.bind(this));
      }
    });
  },
  dropChest() {
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("dropChestAsk", {
        name: this.getChestTitle(),
      }), () => {
        mbgGame.netCtrl.sendMsg("battle.deleteChest", {
          id: this.getChestID(),
        }, (data) => {
          mbgGame.log("battle.deleteChest", data);
        });
      });
  },
  // 求助
  requestChest() {
    let left = mbgGame.config.constTable.clanRequestCount;
    if (mbgGame.timeVar.clanRequestCount) {
      left = mbgGame.config.constTable.clanRequestCount - +mbgGame.timeVar.clanRequestCount.d;
    }

    let requestInfo = cc.sys.localStorage.getItem("requestInfo");
    const defaultRequestInfo = mbgGame.getString('clanRequestInfo');
    if (!requestInfo) {
      requestInfo = defaultRequestInfo;
    }
    mbgGame.managerUi.createLineEditor({
      title: mbgGame.getString('sendDialog'),
      info: mbgGame.getString("chestRequestAsk", {
        name: this.getChestTitle(), left,
      }),
      defaultStr: requestInfo,
      limit: 30,
    }, (msg) => {
      const sendData = {
        id: this.getChestID(),
      };
      if (!msg || msg === '' || msg === defaultRequestInfo) {
        cc.sys.localStorage.removeItem("requestInfo");
      } else {
        sendData.msg = msg;
        cc.sys.localStorage.setItem("requestInfo", msg);
      }
      mbgGame.netCtrl.sendMsg("clan.clanRequest", sendData, (data) => {
        mbgGame.log("player.clanRequest", data);
      });
    });
  },
  onClick() {
    const dData = this.getChestData();
    mbgGame.log("onClick chest", dData);
    if (!dData) {
      return;
    }
    const dConfig = this.getChestConfig();
    if (mbgGame.player.isBattleLabChest(this.getChestID())) {
      if (!mbgGame.player.isUnlockingBattleChest()) {
        this.openLabConfirm(
          () => {
            mbgGame.netCtrl.sendMsg("battle.unlockChest", {
              id: this.getChestID(),
            }, (data) => {
              mbgGame.log("battle.unlockChest", data);
              if (data.code === 'ok') {
                emitter.emit('closeMe');
                mbgGame.player.makeBattleChestPush();
                mbgGame.playSound('UI_BoxGet');
                this.refreshChestInfo();
              }
            });
          }, mbgGame.getString('unlocktime', {
            t: mbgGame.transTime(dConfig[0]),
          }));
      } else {
        let fast = false;
        const lefttime = mbgGame.player.getBattleChestLefttime(this.getChestID());
        if (lefttime > 0) {
          const needDiamonds = Math.ceil(mbgGame.config.constTable.TCBattleFastRatio * lefttime / 3600);
          fast = true;
          const self = this;
          this.openLabConfirm(
            () => {
              mbgGame.log("openLabConfirm this.getChestID()", this.getChestID(), mbgGame.player.getBattleChestDataByID(this.getChestID()));
              if (mbgGame.player.getBattleChestDataByID(this.getChestID()).f) {
                self.onRecvChest(fast);
              } else {
                mbgGame.managerUi.createConfirmDialog(mbgGame.getString("chestFastAsk", {
                  price: needDiamonds,
                }),
                  () => {
                    self.onRecvChest(fast);
                  });
              }
            }, "", fast, needDiamonds);
        } else {
          this.onRecvChest(fast);
        }
      }
    }
  },
  onRecvChest(fast, chestId) {
    chestId = chestId || this.getChestID();
    mbgGame.log("onRecvChest", fast, chestId);
    mbgGame.netCtrl.sendMsg("battle.recvChest", {
      id: chestId,
      fast,
    }, (data) => {
      mbgGame.log("battle.recvChest", data);
      if (data.code === 'ok') {
        emitter.emit('closeMe');
        if (fast) {
          // 重置推送
          mbgGame.player.makeBattleChestPush();
        }
        this.refreshChestInfo();
      } else {
        const str = mbgGame.getString(`errcode${data.err}`);
        mbgGame.managerUi.floatMessage(str);
      }
    });
  },
});
