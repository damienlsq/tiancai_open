const mbgGame = require('mbgGame');
const warDefines = require('warDefines');
const assert = require('assert');


cc.Class({
  extends: cc.Component,

  properties: {
    btnLeft: cc.Node,
    btnRight: cc.Node,
    btnReplay: cc.Node,
    leftPlayerName: cc.Label,
    rightPlayerName: cc.Label,
    titleLabel: cc.RichText,
    timeNode: cc.Node,
    timeLabel: cc.RichText,
    numLeftLabel: cc.RichText,
    numRightLabel: cc.RichText,
    beginLabel: cc.Node,
    bar: cc.ProgressBar,
    itemPanelPos1: cc.Node,
    itemPanelPos2: cc.Node,
    tipsNode: cc.Node,
  },
  /*
  {
  left:
  right:
  }
  */
  initMe(matchType, matchUUID, dMatchData) {
    this.m_MatchType = matchType;
    this.m_MatchUUID = matchUUID;
    this.m_MatchData = dMatchData;
    if (_.isEmpty(dMatchData)) {
      this.node.active = false;
      return;
    }
    this.node.active = true;
    if (!this.m_ItemPanelComs) {
      this.m_ItemPanelComs = {};
    }
    // mbgGame.log('initMe dMatch:', dMatchData);
    this.onUpdateTime();
    this.tipsNode.getComponent('autoTooltips').setTipsStr(mbgGame.getString(`matchdesc${this.m_MatchType}`));
    this.titleLabel.string = mbgGame.getString(`title_match${this.m_MatchType}`);

    this.m_Hide = true;
    const dTeamLeft = this.getTeamData(warDefines.TEAM_LEFT);
    const dTeamRight = this.getTeamData(warDefines.TEAM_RIGHT);
    this.leftPlayerName.string = dTeamLeft.name || '';
    this.rightPlayerName.string = dTeamRight.name || '';
    this.btnLeft.active = true;
    this.btnRight.active = true;
    const ended = this.m_MatchData.e === 1;
    this.btnReplay.active = ended;
    if (ended) {
      assert(this.m_MatchData.r != null);
    }
    this.beginLabel.active = !ended;
    this.itemPanelPos1.active = false;
    this.itemPanelPos2.active = false;
    if (this.m_MatchData.d) { // 已下注
      this.btnRight.active = false;
      this.btnLeft.active = false;
      const result = this.m_MatchData.d.in.r;
      this.setItem(result === warDefines.WarWin ? warDefines.TEAM_LEFT : warDefines.TEAM_RIGHT, this.m_MatchData.d.in.sid);
    }
    /*
    if (!ended && !this.m_MatchData.d) { // 未结束
      // 检测金币是否足够
      this.btnLeft.getComponent('itemBtn').setStatus(false);
      this.btnRight.getComponent('itemBtn').setStatus(false);
    }
    */
    const sidList = mbgGame.player.getItemsCanGamble(this.m_MatchType);
    if (sidList.length < 1) {
      // 没有可堵道具
      this.btnLeft.getComponent('itemBtn').setStatus(false, '你没有道具可以参与');
      this.btnRight.getComponent('itemBtn').setStatus(false, '你没有道具可以参与');
    }
    const lc = +this.m_MatchData.lc || 0;
    const rc = +this.m_MatchData.rc || 0;
    this.numLeftLabel.string = `${this.m_MatchData.lc || 0}`;
    this.numRightLabel.string = `${this.m_MatchData.rc || 0}`;
    const ratio = lc / (lc + rc);
    // mbgGame.log("lc", lc, "rc", rc, "ratio", ratio, lc + rc);
    this.bar.progress = (lc + rc) > 0 ? ratio : 0.5;
  },
  getTeamData(iTeam) {
    return iTeam === warDefines.TEAM_LEFT ? this.m_MatchData.b.left : this.m_MatchData.b.right;
  },
  onShowScheme() {
    mbgGame.resManager.loadPrefab('panelMatchDetail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNoFrameWin(node, 'panelMatchDetail', this.m_MatchType, this.m_MatchUUID, this.m_MatchData, this);
    });
  },
  setItem(iTeam, sid) {
    // 赌局变了才刷新道具
    const posNode = iTeam === warDefines.TEAM_LEFT ? this.itemPanelPos1 : this.itemPanelPos2;
    if (!this.m_ItemPanelComs[iTeam]) {
      const itemPanel = mbgGame.managerUi.getIconItem();
      posNode.addChild(itemPanel);
      posNode.setScale(0.8);
      this.m_ItemPanelComs[iTeam] = itemPanel.getComponent("itemPanel");
    }
    posNode.active = true;
    this.m_ItemPanelComs[iTeam].initMe({
      sid,
      style: 'gamble',
      equipCB: () => {
        mbgGame.log("itemGamble equip", this.m_MatchType);
        this.onCancelStake();
      },
    });
  },
  onCancelStake() {
    mbgGame.netCtrl.sendMsg("gamble.cancelStake", {
      type: this.m_MatchType,
    }, (data) => {
      mbgGame.log("onCancelStake", data);
      if (data.code === "ok") {
        emitter.emit('refreshGamble', true);
      } else {
        mbgGame.errMsg(data.err);
      }
    });
  },
  onUpdateTime() {
    if (!this.m_MatchData || this.m_MatchData.e) {
      this.timeLabel.string = '';
      this.timeNode.active = false;
      return;
    }
    this.timeNode.active = true;
    const duration = Math.random(60) + this.m_MatchData.s + mbgGame.player.getGambleInterval(this.m_MatchType) - moment().unix();
    let timeCom = this.timeLabel.node.getComponent('effectTimerString');
    if (!timeCom) {
      timeCom = this.timeLabel.node.addComponent('effectTimerString');
    }
    if (duration > 0) {
      timeCom.initMe({
        duration,
        interval: 1,
        endFunc: () => {
          emitter.emit('refreshGamble', true);
        },
      });
    }
  },
  onReplay() {
    if (mbgGame.getLock('net', 'gamble.replay')) {
      return;
    }
    mbgGame.setLock('net', 'gamble.replay');
    // mbgGame.log("onReplay");
    mbgGame.netCtrl.sendMsg("gamble.replay", {
      uuid: this.m_MatchUUID,
    }, (data) => {
      // mbgGame.log("onReplay data", data);
      mbgGame.clearLock('net', 'gamble.replay');
      if (data.code === "ok") {
        mbgGame.player.setReplayType("gamble");
        mbgGame.player.setReplayParam([this.m_MatchType, this.m_MatchUUID]);
      } else {
        // 回放不了？直接出结果确认界面试试
        this.afterWatch();
      }
    });
  },
  onStakeLeft() {
    this.onOpenPanelStakeItem(1);
  },
  onStakeRight() {
    this.onOpenPanelStakeItem(2);
  },
  onOpenPanelStakeItem(result) {
    if (mbgGame.player.getOwnedItemList_Belong().length === 0) {
      mbgGame.managerUi.floatMessage(mbgGame.getString('noitems'));
      return;
    }
    mbgGame.resManager.loadPrefab('panelStakeItem', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelStakeItem', this.m_MatchType, result);
    });
  },
  isWin() {
    const myresult = this.m_MatchData.d.in.r;
    const realresult = this.m_MatchData.r;
    if (myresult == null || realresult == null) {
      mbgGame.player.sendLog(`[gamble] wrongdata, ${this.m_MatchUUID}, ${this.m_MatchType}, ${JSON.stringify(this.m_MatchData)}`);
    }
    return +myresult === +realresult;
  },
  afterWatch(result) {
    if (result != null) {
      const realresult = this.m_MatchData.r;
      mbgGame.log("afterWatch", result, realresult);
      if (result !== realresult) {
        mbgGame.player.sendLog(`[gamble] wrongresult, ${result}, ${realresult}, ${this.m_MatchUUID}, ${this.m_MatchType}`);
        mbgGame.managerUi.floatMessage("本地回放异常，将按照服务器记录做结算");
      }
    }
    // 弹确认窗
    this.showConfirmUI();
  },
  showConfirmUI() {
    const self = this;
    if (this.isWin()) {
      // 显示赎回按钮
      mbgGame.resManager.loadPrefab('panelMatchConfirm', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addTinyWin(node, 'panelMatchConfirm', self);
      });
    } else {
      mbgGame.resManager.loadPrefab('panelMatchRedeem', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addTinyWin(node, 'panelMatchRedeem', self);
      });
    }
  },
  onConfirmMatch(redeem, cb) {
    mbgGame.netCtrl.sendMsg("gamble.confirm", {
      uuid: this.m_MatchUUID,
      type: this.m_MatchType,
      redeem: redeem ? 1 : 0,
    }, (data) => {
      // mbgGame.log("onConfirmGamble", data);
      if (cb) {
        cb(data);
      }
      if (data.code === "ok") {
        emitter.emit('refreshGamble', true);
      }
    });
  },
});