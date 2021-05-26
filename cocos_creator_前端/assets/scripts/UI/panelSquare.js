const defines = require('warDefines');
const labdefines = require('labdefines');

cc.Class({
  extends: cc.Component,
  properties: {
    redTipZhengba: cc.Node,
    btnGamble: cc.Node,
    btnPVP: cc.Node,
    charaCotent: cc.Node,
  },
  onLoad() {
    this.redTipZhengba.active = false;
    this.characterCom = {};
    emitter.on(this, "enterGame", this.onEnterGame);
    this.schedule(this.onHeartbeat, 1, cc.macro.REPEAT_FOREVER);
    this.onOpened();
  },
  onDestroy() {
    emitter.off(this);
  },
  getBattleInfo() {
    return this.m_BattleInfo;
  },
  loadBattleInfo(cb) {
    if (!mbgGame.player.isTCBattleUnlocked()) {
      return;
    }
    const cmd = 'battle.getInfo';
    if (mbgGame.getLock('net', cmd, true)) {
      return;
    }
    mbgGame.setLock('net', cmd);
    mbgGame.netCtrl.sendMsg(cmd, {}, (data) => {
      mbgGame.clearLock('net', cmd);
      if (data.code === "err" && data.err) {
        mbgGame.managerUi.floatMessage(data.err);
        return;
      }
      if (data.code === "ok") {
        this.m_BattleInfo = data.data;
        if (cb) cb();
      }
    });
  },
  removeBattleInfo() {
    delete this.m_BattleInfo;
  },
  onEnterGame(data, enterGameType) {
    mbgGame.log("onEnterGame", enterGameType);
    this.checkBattleInfoIsExpire();
    // 请求存活数量
    mbgGame.netCtrl.sendMsg('battle.alives', {}, (_data) => {
      if (_data.code === "ok") {
        const idxes = _data.data.n;
        mbgGame.log('battle.alives', idxes);
        for (let i = 0; i < 5; i++) {
          const hasTarget = idxes && idxes.indexOf(`${i}`) !== -1;
          if (!hasTarget) {
            const com = this.getBattleChara(i);
            if (com) {
              com.cData.out = 1;
              com.scheduleOnce(com.squareOut.bind(com, 0.5), 2);
            }
          }
        }
      }
    });
  },
  onOpened() {
    emitter.emit('closeMe');
    // this.btnPVP.active = mbgGame.player.isArenaUnlocked();
    // this.btnGamble.active = mbgGame.player.isGambleUnlocked();

    let itemBtn = this.btnGamble.getComponent('itemBtn');
    itemBtn.setStatus(mbgGame.player.isGambleUnlocked(), mbgGame.getString('locked_gamble'));
    itemBtn = this.btnPVP.getComponent('itemBtn');
    itemBtn.setStatus(mbgGame.player.isArenaUnlocked(), mbgGame.getString('locked_zhengba'));

    this.checkRedTip();
  },
  checkRedTip() {
    this.redTipZhengba.active = false;
    const data = mbgGame.getCache('arena.rank', 60);
    if (data) {
      if (data.diamonds) {
        this.redTipZhengba.active = true;
      }
    }
  },
  // 随机NPC出来
  randNPC() {
    const npdList = [];
    const maxLv = mbgGame.player.getCurWorldMaxLv(defines.mainWorldIdx);
    _.forEach(mbgGame.config, (v, k) => {
      if (k.indexOf('mtpl') === -1) return;
      if (k === 'mtpl99') return;
      if (!v.first) return;
      if (+v.first < maxLv) {
        npdList.push(+k.substring(4));
      }
    });
    const npcCharaId = _.sample(npdList);
    if (!npcCharaId) return;
    if (!mbgGame.preloadRes.floorCharacter) return;
    // mbgGame.log('randNPC', npcCharaId);
    const charaNode = cc.instantiate(mbgGame.preloadRes.floorCharacter);
    const fixZindex = charaNode.addComponent('fixZindex');
    fixZindex.setFix(true);
    this.charaCotent.addChild(charaNode);
    const com = charaNode.getComponent('floorCharacter');
    com.onCreated({
      mTplID: npcCharaId,
      spineName: mbgGame.config[`mtpl${npcCharaId}`].spine,
      scene: 'square',
      charaID: npcCharaId,
      sceneCom: this,
      mode: 'squareInOut',
      posX: 'randXY',
      speed: 4,
    });
    com._squareNPCID = npcCharaId;
    // 20%几率说话
    if (_.random(100) < 20) {
      // 走完全程差不错30秒
      com.scheduleOnce(() => {
        com.say(mbgGame.getString(`mdesc${npcCharaId}`));
      }, 10 + _.random(15));
    }
  },
  onPVP() {
    this.showPVPPanel();
  },
  beginTCBattle(targetIdx) {
    mbgGame.log("beginTCBattle", targetIdx);
    mbgGame.netCtrl.sendMsg('battle.beginWar', {
      idx: targetIdx,
      schemeIdx: mbgGame.player.getSavedSchemeIdx('battlewar'),
    },
      (data) => {
        if (data.code !== 'ok') {
          mbgGame.errMsg(data.err);
        }
      });
  },
  refreshBattle(force) {
    if (force) {
      this.removeBattleInfo();
    }
    this.loadBattleInfo(() => {
      this._refreshBattle();
    });
  },
  _refreshBattle() {
    const data = this.getBattleInfo();
    if (data && data.timestamp && (moment().unix() > data.timestamp + data.t)) {
      this.refreshBattle(true);
      return;
    }
    if (!data) {
      this.refreshBattle(true);
      return;
    }
    if (data.endtime) {
      return;
    }
    mbgGame.log("refreshBattle", data);
    const endtime = moment().unix() + data.t;
    data.timestamp = moment().unix();
    data.endtime = endtime;
    // 设置定时器
    this.playersOut(true);
    this.newPlayers(data);
  },
  checkBattleInfoIsExpire() {
    const dData = this.getBattleInfo();
    if (dData) {
      const now = moment().unix();
      if (dData.endtime && now > dData.endtime) {
        this.refreshBattle(true);
      }
    } else {
      this.refreshBattle();
    }
  },
  onHeartbeat() {
    this.checkBattleInfoIsExpire();
    const now = moment().unix();
    if (!this._lastNPCTime || now - this._lastNPCTime > 10 + _.random(5)) {
      // 至少10~15秒才判断一次npc出来
      this._lastNPCTime = now;
      if (_.random(1)) return;
      this.randNPC();
    }
  },
  // 玩家慢慢离去
  playersOut(nodelay) {
    if (nodelay) {
      this.charaCotent.removeAllChildren();
      return;
    }
    let baseSec = 1;
    for (let i = 0; i < this.charaCotent.children.length; i++) {
      const com = this.charaCotent.children[i].getComponent('floorCharacter');
      com.cData.out = 1;
      mbgGame.log("playersOut", i);
      this.scheduleOnce(() => {
        com.squareOut();
      }, _.random(baseSec, baseSec + 5));
      baseSec = i * 5;
    }
  },
  // 新来一批玩家，30秒内到达现场
  newPlayers(data) {
    let baseSec = 1;
    data.winTimes = 0;
    for (let i = 0; i < 5; i++) {
      const dTarget = data.dData[i];
      if (_.isEmpty(dTarget)) {
        data.winTimes += 1;
        continue;
      }
      this.scheduleOnce(() => {
        this.playerIn(dTarget, i);
      }, _.random(baseSec, baseSec + 5));
      baseSec = i * 5;
    }
  },
  playerIn(dData, i) {
    if (_.isEmpty(dData)) {
      return;
    }
    if (!mbgGame.preloadRes.floorCharacter) return;
    const charaNode = cc.instantiate(mbgGame.preloadRes.floorCharacter);
    const fixZindex = charaNode.addComponent('fixZindex');
    fixZindex.setFix(true);
    this.charaCotent.addChild(charaNode);
    const com = charaNode.getComponent('floorCharacter');
    let maxLv = -1;
    let charaID = null;
    _.each(dData.charaIDs, (id) => {
      if (!id) return;
      if (dData.team[id].lv > maxLv) {
        maxLv = dData.team[id].lv;
        charaID = id;
      }
    });
    com.onCreated({
      scene: 'square',
      sceneCom: this,
      charaID,
      targetIdx: i,
      rID: dData.rID,
      name: dData.name,
      desc: dData.desc,
      withWeapon: true,
      lv: maxLv,
      mode: 'actionList',
      posX: 'randXY',
      firstAction: _.sample(['leftIn', 'rightIn']),
      actionList: [
        { action: 'waridle', weight: 25 },
        { action: 'squareMove', weight: 45 },
        { action: 'showAward', weight: 70, type: "battle" },
        { action: 'say', weight: 5, type: "battle" },
      ],
    });
  },
  handleBattleEvt(data) {
    mbgGame.log("handleBattleEvt", data);
    if (data.type === 1) {
      const dData = this.getBattleInfo();
      dData.dData[data.idx] = null;
      dData.winTimes += 1;
      if (dData.winTimes === 5) {
        this.refreshBattle(true);
      }
      const com = this.getBattleChara(data.idx);
      if (com) {
        com.cData.out = 1;
        com.scheduleOnce(com.squareOut.bind(com, 0.5), 2);
      }
    }
  },
  showAward(floorCharacter) {
    const rID = floorCharacter.cData.rID;
    const dBattleReward = mbgGame.config.tcbattle[rID];
    if (!dBattleReward) {
      return;
    }
    const type = dBattleReward.reward;
    let obj;
    switch (type) {
      case 'exp':
        {
          obj = mbgGame.managerUi.getAwardItem(floorCharacter.node, { icon: `logo_exp`, noBg: 1 });
          break;
        }
      case 'mat':
      case 'coins':
      case 'diamonds':
      case 'gem':
        {
          obj = mbgGame.managerUi.getAwardItem(floorCharacter.node, { icon: `logo_${type}`, noBg: 1 });
          break;
        }
      case 'q3':
      case 'q4':
        {
          // obj = mbgGame.managerUi.getAwardItem(floorCharacter.node, { icon: `award_${type}`, noBg: 1 });
          break;
        }
      case 'chest1':
        {
          obj = mbgGame.managerUi.getAwardItem(floorCharacter.node, { icon: `icon_chest1`, noBg: 1 });
          break;
        }
      case 'chest4':
        {
          obj = mbgGame.managerUi.getAwardItem(floorCharacter.node, { icon: `icon_chest4`, noBg: 1 });
          break;
        }
      default:
        mbgGame.error("showAward", type);
        break;
    }
    if (obj) {
      obj.y = floorCharacter.getAwardObjY() - 10;
      obj.x = 0;
      obj.setAnchorPoint(0.5, 0.0);
      const com = obj.getComponent("itemPanel");
      com._iconNode.setAnchorPoint(0.5, 0.0);
      obj.opacity = 0;
      obj.runAction(cc.sequence(cc.spawn(cc.moveBy(0.15, cc.v2(0, 10)),
        cc.fadeIn(0.15)),
        cc.delayTime(5),
        cc.spawn(cc.moveBy(0.15, cc.v2(0, 10)), cc.fadeOut(0.15)),
        cc.removeSelf()));
    }
  },
  getBattleSelfTalk(floorCharacter) {
    return floorCharacter.cData.desc;
  },
  getBattleChara(targetIdx) {
    let floorCharacter = null;
    _.each(this.charaCotent.children, (node) => {
      const com = node.getComponent('floorCharacter');
      if (com.cData.targetIdx === targetIdx) floorCharacter = com;
    });
    return floorCharacter;
  },
  clickCharacter(floorCharacter) {
    const targetIdx = floorCharacter.cData.targetIdx;

    if (floorCharacter._squareNPCID) {
      let hasFac = false;
      for (let i = 0; i < labdefines.GymFacIDs.length; i++) {
        const facID = labdefines.GymFacIDs[i];
        if (mbgGame.player.hasFac(facID)) {
          hasFac = true;
          break;
        }
      }
      if (!hasFac) return;
      mbgGame.resManager.loadPrefab('panelLabGym', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addNormalWin(node, 'panelLabGym', floorCharacter);
      });
      return;
    }

    // mbgGame.log("clickCharacter", targetIdx, floorCharacter.cData.name, floorCharacter.cData.out);
    if (floorCharacter.cData.out) {
      return;
    }
    // 一定要设置呢称才能打开随便打打界面
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName(() => {
        this.clickCharacter(floorCharacter);
      });
      return;
    }
    if (mbgGame.player.getSta() < mbgGame.config.constTable.TCBattleSta) {
      mbgGame.errMsg(mbgGame.config.ErrCode.Battle_LackSta);
      return;
    }
    // 天才电竞
    // 直接打开编辑界面
    const price = mbgGame.getString('unitPrice', {
      price: mbgGame.config.constTable.TCBattleSta,
      unit: 'logo_sta',
    });
    const self = this;
    const msg = `${mbgGame.getString("beginfight")}<br />${price}`;
    mbgGame.log("msg", msg);
    mbgGame.managerUi.openSchemeTeamEditor({
      worldIdx: 10,
      wartype: 'battlewar',
      bottomBtnLabel: msg,
      finishCB: () => {
        mbgGame.warMgr.tryBeginWar(() => {
          self.beginTCBattle(targetIdx);
        });
      },
    });
  },
  showPVPPanel() {
    if (!mbgGame.player.isArenaUnlocked()) {
      mbgGame.errMsg(mbgGame.config.ErrCode.Arena_Locked);
      return;
    }
    // 一定要设置呢称才能打开PVP界面
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName(() => {
        this.showPVPPanel();
      });
      return;
    }
    mbgGame.resManager.loadPrefab('panelZhengba', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelZhengba');
    });
  },
  onOpenGamble() {
    mbgGame.managerUi.openPanelGamble();
  },

});