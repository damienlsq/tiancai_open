const panelGradeInfo = require('panelGradeInfo');

cc.Class({
  extends: cc.Component,

  properties: {
    cd: cc.Node,
    targetContent: cc.Node,
    redTipZhengba: cc.Node,
    pvpbonusLabel: cc.RichText,
    bonusChecked: cc.Node,
    gradeInfo: panelGradeInfo,
  },
  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_zhengba');
    this.node._winTooltips = mbgGame.getString('tooltips_zhengbaDesc');

    // 保存模版
    this.targetTemplate = cc.instantiate(this.targetContent.children[0]);
    this.targetContent.removeAllChildren();

    emitter.on(this, "zhengbaUpdateFlag", this.updateTargetFlag);
    emitter.on(this, "refreshGradeInfo", this.refreshGradeInfo);
    emitter.on(this, "setPVPData", this.onRefreshTime);

    mbgGame.resManager.playMusic("drama", true);
  },
  onDestroy() {
    emitter.off(this, "zhengbaUpdateFlag");
    emitter.off(this, "refreshGradeInfo");
    emitter.off(this, "setPVPData");
    mbgGame.resManager.playMusic("battleLoop3", true);
  },
  onAddBaseWin() {
    this.getTargets();
    this.refreshGradeInfo();
    this.updateTargetFlag();
    this.pvpbonusLabel.string = mbgGame.getString('pvpbonus', {
      n: mbgGame.config.constTable.PVPBonusScore,
    });
    this.checkRedTip();
    this.onRefreshTime();
  },
  checkRedTip() {
    this.redTipZhengba.active = false;
    const data = mbgGame.getCache('arena.rank');
    if (data) {
      if (data.diamonds) {
        this.redTipZhengba.active = true;
      }
    }
  },
  getTargets(force, cb) {
    if (force) {
      mbgGame.removeCache('arena.getTargets');
    }
    const data = mbgGame.getCache('arena.getTargets', 30);
    if (!data) {
      mbgGame.checkNetCache('arena.getTargets', this.getTargets.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    this.addTargets(data.targets);
  },
  refreshGradeInfo() {
    this.gradeInfo.refreshGradeInfo();
    if (this.checkGradeChange()) {
      return;
    }
    this.checkRecvChest();
  },
  checkGradeChange() {
    const ginfo = mbgGame.player.getPVPGradeChangeInfo();
    if (!ginfo) {
      return false;
    }
    mbgGame.log("checkGradeChange", ginfo);
    mbgGame.managerUi.openWinGradeAnim(...ginfo);
    mbgGame.netCtrl.sendMsg("arena.cleanMark");
    return true;
  },
  checkRecvChest() {
    const dChest = mbgGame.player.getPVPChestInfo();
    for (const g in dChest) {
      if (dChest[g] === 1) {
        mbgGame.netCtrl.sendMsg("arena.recvChest", {
          grade: +g,

        }, () => {
        });
        break;
      }
    }
  },
  // 距离目标过期还剩多少秒
  getRefreshLeftCD() {
    const dPVPInfo = mbgGame.player && mbgGame.player.pvpData;
    if (!dPVPInfo) {
      // 未刷新到正确事件
      return -1;
    }
    const nowtime = mbgGame.netCtrl.getServerNowTime();
    const iLeftCD = (dPVPInfo.rtime * 0.001) + (mbgGame.config.PVPData.expire * 60) - nowtime;
    return Math.max(0, iLeftCD);
  },
  onRefreshTime() {
    const duration = this.getRefreshLeftCD();
    const timeCom = this.cd.addComponent('effectTimerString');
    timeCom.initMe({
      duration,
      interval: 1,
      endFunc: () => {
        this.refreshTargets();
      },
    });
  },
  updateTargetFlag() {
    const idx2flag = mbgGame.player.getPVPFlag();
    this.bonusChecked.active = this.isAllWin(idx2flag);
  },
  isAllWin(idx2flag) {
    let count = 0;
    for (const i in idx2flag) {
      const flag = idx2flag[i];
      if (flag === 1) {
        count += 1;
      }
    }
    return count === 3;
  },
  // 点了PVP主界面的刷新小按钮
  onRefresh() {
    const iLeftCD = this.getRefreshLeftCD();
    const minutes = Math.ceil(iLeftCD / 60);
    if (iLeftCD > 0) {
      mbgGame.managerUi.createConfirmDialog(mbgGame.getString("refreshfree", {
        price: minutes,
      }),
        () => {
          this.refreshTargets(true);
        });
    } else {
      this.refreshTargets();
    }
  },
  onFrdPVP() {
    mbgGame.resManager.loadPrefab('panelFriendWar', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelFriendWar', this.id);
    });
  },
  addTargets(targets) {
    if (!this.isValid) {
      return;
    }
    mbgGame.log("addTargets:", targets);
    if (!targets) return;
    this.targetContent.removeAllChildren();
    const self = this;
    _.mapKeys(targets, (v, idx) => {
      // mbgGame.log("target:", idx, v);
      const tar = cc.instantiate(this.targetTemplate);
      this.targetContent.addChild(tar);
      const com = tar.getComponent('targetInfo');
      com.initMe(self, idx, v);
    });
  },
  refreshTargets(useDiamond) {
    mbgGame.log("[refreshTargets]");
    if (mbgGame.getLock('net', 'refreshTargets')) {
      mbgGame.log("[refreshTargets] getLock");
      return;
    }
    mbgGame.setLock('net', 'refreshTargets');
    // 请求刷新pvp目标
    // callback(dTargetdata)
    // dTargetdata: {
    // idx: dData
    // }
    mbgGame.netCtrl.sendMsg("arena.refresh", {
      useDiamond: useDiamond || false,
    }, (data) => {
      mbgGame.clearLock('net', 'refreshTargets');
      mbgGame.log("[refreshTargets]", data);

      // todo 刷新后需要立刻更新pvpdata里面的rtime，防止重复刷新
      if (data.code === "ok") {
        // 清空重新加
        if (this.node && this.node.isValid) {
          this.addTargets(data.data.targets);
        }
      } else if (data.err) {
        // 刷新失败
        mbgGame.managerUi.floatMessage(data.err);
      }
      if (this.node && this.node.isValid) {
        this.onRefreshTime();
      }
    });
  },
  showMultiPlayerRecord() {
    emitter.emit('closeMe');
    mbgGame.resManager.loadPrefab('panelPVPLog', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelPVPLog');
    });
  },

  onRanking() {
    if (!mbgGame.player.isArenaUnlocked()) {
      mbgGame.errMsg(mbgGame.config.ErrCode.Arena_Locked);
      return;
    }
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName(() => {
        this.onRanking();
      });
      return;
    }
    emitter.emit('closeMe');
    const data = mbgGame.getCache('arena.rank', 60);
    if (!data) {
      mbgGame.checkNetCache('arena.rank', this.onRanking.bind(this));
      return;
    }
    mbgGame.resManager.loadPrefab('panelRanking', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelRanking');
    });
  },

  onSchemeDef() {
    emitter.emit('closeMe');
    mbgGame.managerUi.openSchemeTeamEditor({
      worldIdx: 99,
      isDefense: true,
      bottomBtnLabel: mbgGame.getString('ok'),
    });
  },
});