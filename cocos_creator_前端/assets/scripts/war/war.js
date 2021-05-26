const warEnergy = require('warEnergy');
const defines = require('warDefines');
const assert = require('assert');
const uiWar = require('uiWar');

cc.Class({
  extends: cc.Component,

  properties: {
    warEnergy,

    spineWarn: cc.Node,

    bgNode: cc.Node,
    uiWar,
    skillButtonLayout: cc.Node,

    bottomBg: cc.Node,
    bottomBgX: cc.Node,
    topBgX: cc.Node,

    teachPanel: cc.Node,
  },

  // use this for initialization
  onLoad() {
    if (mbgGame.sceneName === 'iphoneX') {
      this.bottomBgX.active = true;
      this.topBgX.active = true;
      this.bottomBg.active = false;
    } else {
      this.bottomBgX.active = false;
      this.topBgX.active = false;
      this.bottomBg.active = true;
    }
    this.buttonSkillTemplate = this.skillButtonLayout.children[0];
    this.skillButtonLayout.removeAllChildren();
    this.setShowUIPanel(false);
    emitter.on(this, "worlddata", this.onWarUpdated);
  },
  isActive() {
    return this.node.parent.active;
  },
  playSound(sSound) {
    return;
    if (!this.isActive()) {
      return;
    }
    if (!sSound) {
      return;
    }
    mbgGame.resManager.playSound(sSound);
  },
  initMe(worldIdx) {
    this.worldIdx = worldIdx;
  },
  getClientWarObj() {
    if (this.isClientWar()) {
      const wID = this.getClientWarID();
      const oWar = mbgGame.warCtrl.getWar(wID);
      return oWar;
    }
    return null;
  },
  stopWar() {
    const oWar = this.getClientWarObj();
    if (oWar) {
      oWar.stopWar({});
      return;
    }
    this.callBSWarFuncReal("stopWar", {});
  },
  callBSWarFunc(funcName, ...args) {
    if (this.isClientWar()) {
      mbgGame.warCtrl.handleClientCall(this.getWarID(), funcName, ...args);
      return;
    }
    this.callBSWarFuncReal(funcName, ...args);
  },
  callBSWarFuncReal(funcName, ...args) {
    if (!this.getFwdPair()) {
      mbgGame.error("this.getFwdPair() is null", this.getFwdPair());
      return;
    }
    mbgGame.netCtrl.sendMsg("callWarFunc", {
      wID: this.getWarID(),
      func: funcName,
      args,
      token: this.getWarToken(),
    }, null, {
        fwdPair: this.getFwdPair(),
      });
  },
  setWarID(wID) {
    this.m_WarID = wID;
  },
  getWarID() {
    return this.m_WarID;
  },
  setWarToken(token) {
    this.m_Token = token;
  },
  getWarToken() {
    return this.m_Token;
  },
  setReplayMode(b) {
    this.m_ReplayMode = b;
  },
  isReplayMode() {
    return this.m_ReplayMode;
  },
  setFwdPair(fwdPair) {
    this.m_FwdPair = fwdPair;
  },
  getFwdPair() {
    return this.m_FwdPair;
  },
  disppearPre() {
    this.msgPreview.node.runAction(cc.fadeOut(1));
  },
  cleanWar(dontCleanFighters, reason) {
    if (!this.m_WarInited) {
      return;
    }
    emitter.emit("delAllBuff");
    emitter.emit("delAllBuffIcon");
    mbgGame.log("cleanWar", reason);
    mbgGame.log("cleanWar, worldIdx", this.worldIdx, "m_WarInited", this.m_WarInited, "m_WarData", this.m_WarData);
    this.setShowUIPanel(false);
    this.setStarted(false);
    if (this.uiWar) {
      this.uiWar.closeTimer();
    }
    this.m_WarEndTime = 0;
    this.m_WarInited = false;
    if (this.buttonSkillComs) {
      for (let i = 0; i < 5; i++) {
        const com = this.buttonSkillComs[i];
        com.node.active = false;
      }
    }
    this.node.off(cc.Node.EventType.TOUCH_START);
    this.node.off(cc.Node.EventType.TOUCH_MOVE);
    this.node.off(cc.Node.EventType.TOUCH_END);
    if (!dontCleanFighters) {
      this.cleanFighters();
    }
    emitter.emit("cleanWar");
  },
  getButtonSkillComByObjID(objID) {
    for (let i = 0; i < 5; i++) {
      const com = this.buttonSkillComs[i];
      if (!com) {
        continue;
      }
      if (com.objID === objID) {
        return com;
      }
    }
    return null;
  },
  isPVE() {
    return defines.PVEWorlds.indexOf(this.worldIdx) !== -1;
  },
  stageIdx() {
    return this.m_WarData.stageIdx;
  },
  initByWorldIdx(worldIdx, dData) {
    const dInfo = dData.info;
    if (dInfo) {
      if (dInfo.friendwar || worldIdx === 10) {
        // 友谊战、随便打打 不显示分数
        dInfo.left.score = null;
        dInfo.right.score = null;
      }
      this.uiWar.updateBattleTop(dInfo, dData.isDefender);
    }
    if (worldIdx === 99) {
      mbgGame.managerUi.enterpvp = true;
      if (worldIdx === 99) {
        this.setDefender(dData.isDefender);
        this.setFriendWar(dInfo.friendwar);
      }
    }
  },
  isBotting() {
    return this.m_WarData.botting && this.m_WarData.botting.auto;
  },
  setBotting(b) {
    this.m_WarData.botting = this.m_WarData.botting || {};
    this.m_WarData.botting.auto = b;
  },
  isBossFight() {
    return this.m_isBossFight;
  },
  initButtonSkillComs() {
    if (!this.buttonSkillComs) {
      this.buttonSkillComs = [];
      this.m_Fighters = [];
      for (let i = 0; i < 5; i++) {
        const obj = cc.instantiate(this.buttonSkillTemplate);
        this.buttonSkillComs.push(obj.getComponent("buttonSkill"));
        this.skillButtonLayout.addChild(obj);
        obj.active = false;
      }
    }
  },
  initWar(worldIdx, dData) {
    mbgGame.log("initWar", this.m_WarInited, worldIdx, dData);
    if (!dData.resume && this.m_WarInited) {
      mbgGame.error("initWar twice time");
      return;
    }
    if (!this.isValid) {
      mbgGame.error("initWar isValid false");
      return;
    }
    this.initButtonSkillComs();
    let dontCleanFighters = false;
    if (worldIdx === defines.newbieWorldIdx ||
      dData.resume) {
      dontCleanFighters = true;
    }
    this.cleanWar(dontCleanFighters, "ccc");
    this.m_WarInited = true;
    if (dData.fwdPair) {
      this.setFwdPair(dData.fwdPair);
    }
    if (dData.replay) {
      this.setReplayMode(true);
    }
    if (dData.wID) {
      this.setWarID(dData.wID);
    }
    if (dData.token) {
      this.setWarToken(dData.token);
    }
    mbgGame.replaySpeed = 1;
    this.uiWar.initMe(worldIdx, dData.stageIdx);
    this.m_WarData = dData;
    this.worldIdx = worldIdx;
    this.warEnergy.worldIdx = worldIdx;
    this.initByWorldIdx(worldIdx, dData);
    this.m_isBossFight = mbgGame.player.canFightStoryStageBoss(worldIdx, this.stageIdx());

    if (dData.botting) {
      emitter.emit("SetBotting", dData.botting.auto);
    }
    if (dData.started) {
      this.setStarted(true);
    }
    if (!_.isEmpty(dData.costEnergy)) {
      this.setCostEnergyDict(dData.costEnergy);
    }
    this.initTeams(dData);
    // mbgGame.log("initWar:", data);
    if (mbgGame.isRemoteRes()) {
      mbgGame.gameScene.setWait(mbgGame.getString("waitStr_res"));
    }
    mbgGame.warMgr.addLoadJob("img", [dData.image, this.bgNode]);
    mbgGame.warMgr.addLoadJob("spine", ['criticeffect']);
    mbgGame.warMgr.addLoadJob("spine", ['bosswarn']);
    mbgGame.warMgr.addLoadJob("spine", ['hiteffect']);
    mbgGame.warMgr.addLoadJob("spine", ['flashchara']);
    mbgGame.warMgr.addLoadJob("spine", ['useskill']);
    mbgGame.warMgr.addLoadJob("music", ['battleLose']);
    mbgGame.warMgr.addLoadJob("music", ['battleWin']);
    if (!this.isPVE()) {
      this.warEnergy.setEnergy(0);
      this.m_IsDefender = dData.isDefender;
    }
    this.updateEnergy(dData.energy);
    if (this.worldIdx === 5) {
      this.setEnergy(30);
    }
    if (dData.duration) {
      this.setWarDuration(dData.duration);
    }
    if (dData.beginTime) {
      this.setWarBeginTime(dData.beginTime);
    }
    mbgGame.warMgr.beginAllLoadJob();
  },
  setWarDuration(duration) {
    this.m_WarDuration = duration;
  },
  setWarBeginTime(beginTime) {
    this.m_BeginTime = beginTime;
  },
  getWarBeginTime() {
    return this.m_BeginTime;
  },
  isTimerNeeded() {
    if (this.worldIdx === 5) {
      return false;
    }
    return true;
  },
  setShowUIPanel(show) {
    this.uiWar.node.opacity = show ? 255 : 0;
    this.warEnergy.node.opacity = show ? 255 : 0;
    this.skillButtonLayout.opacity = show ? 255 : 0;
  },
  updateEnergy(dEnergy) {
    if (!_.isEmpty(dEnergy)) {
      if (this.m_IsDefender) {
        this.setEnergy(dEnergy[defines.TEAM_RIGHT]);
      } else {
        this.setEnergy(dEnergy[defines.TEAM_LEFT]);
      }
    }
  },
  setEnergy(e) {
    this.warEnergy.setEnergy(e);
  },
  playWarMusic(musicname, isSoftMode) {
    mbgGame.resManager.playMusic(musicname, isSoftMode);
  },
  // 战斗已流逝时间，秒
  getElapsedTime() {
    if (!this.m_BeginTime) {
      return 0;
    }
    if (this.isClientWar()) {
      const oWar = this.getClientWarObj();
      if (oWar) {
        return oWar.costTime();
      }
      return 9999999;
    }
    const nowtime = mbgGame.netCtrl.getServerNowTime();
    const iElapsedTime = nowtime - (this.m_BeginTime * 0.001);
    return iElapsedTime;
  },
  isWarInited() {
    return this.m_WarInited;
  },
  isStarted() {
    return this.m_Started;
  },
  setStarted(b) {
    this.m_Started = b;
  },
  setFriendWar(b) {
    this.m_FriendWar = b;
  },
  isFriendWar() {
    return this.m_FriendWar;
  },
  getTeamTemp(iTeam, k) {
    return this.m_TempDictByTeam && this.m_TempDictByTeam[iTeam] && this.m_TempDictByTeam[iTeam][k];
  },
  setTeamTemp(iTeam, k, val) {
    if (!this.m_TempDictByTeam) {
      this.m_TempDictByTeam = {};
    }
    if (!this.m_TempDictByTeam[iTeam]) {
      this.m_TempDictByTeam[iTeam] = {};
    }
    this.m_TempDictByTeam[iTeam][k] = val;
  },
  setWarEndTime(t) {
    this.m_WarEndTime = t;
  },
  getWarEndTime() {
    return this.m_WarEndTime;
  },
  setWarEnd(b) {
    this.m_WarEnd = b;
  },
  isWarEnd() {
    return this.m_WarEnd;
  },
  isWarCDing() {
    return this.m_WarEnd;
  },
  initBg(data, cb) {
    mbgGame.resManager.setImageFrame(this.bgNode.getComponent(cc.Sprite), 'images', data.image, cb);
  },
  eachFighter(cb) {
    for (let i = 0; i < this.m_Fighters.length; i++) {
      const fighter = this.m_Fighters[i];
      if (!fighter.isValid) {
        mbgGame.log("destroyed fighter", fighter);
        continue;
      }
      cb(fighter);
    }
  },
  getLayerGame() {
    return this.node.getChildByName('layerGame');
  },
  getYellLayer() {
    return this.node.getChildByName('yellLayer');
  },
  hideButtons() {
    for (let i = 0; i < 5; i++) {
      const com = this.buttonSkillComs[i];
      com.node.active = false;
    }
  },
  getTeamData(iTeam) {
    return this.m_WarData[iTeam];
  },
  getFighterMTplID(iTeam, posIdx) {
    const dTeam = this.m_WarData[iTeam];
    for (const k in dTeam) {
      if (dTeam[k].posIdx === posIdx) {
        mbgGame.log("dTeam[k]", dTeam[k], iTeam);
        const mTplID = defines.getMTplID(dTeam[k].ID);
        return mTplID;
      }
    }
    return null;
  },
  initTeams(data) {
    this.m_LeftTeamData = null;
    for (let iTeam = 1; iTeam <= 2; iTeam++) {
      const dTeamData = data[iTeam];
      if (!dTeamData) {
        continue;
      }
      this.initTeam(iTeam, dTeamData);
    }
    emitter.emit("updateSkillBtn", "initTeams");
  },
  initTeam(iTeam, dTeamData) {
    for (let objID in dTeamData) {
      objID = parseInt(objID);
      const dInfo = dTeamData[objID];
      this.createFighter(iTeam, objID, dInfo);
      // mbgGame.log("initTeam", iTeam, dInfo);
    }
  },
  setDefender(isDefender) {
    this.m_IsDefender = isDefender;
  },
  isDefender() {
    return this.m_IsDefender;
  },
  createFighter(iTeam, objID, dInfo) {
    if (!dInfo) {
      mbgGame.error("createFighter no dInfo, worldIdx", this.worldIdx);
    }
    const worldIdx = this.worldIdx;
    if (worldIdx == null) {
      mbgGame.error("createFighter no worldIdx");
    }
    let fighterNode;
    let exist = false;
    if (this.m_PlotFighters && this.m_PlotFighters.length > 0) {
      let i = 0;
      for (; i < this.m_PlotFighters.length; i++) {
        const _fighter = this.m_PlotFighters[i];
        if (_fighter.getTeam() === iTeam && _fighter.posIdx() === dInfo.posIdx) {
          fighterNode = _fighter.node;
          break;
        }
      }
      if (fighterNode) {
        this.m_PlotFighters.splice(i, 1);
        exist = true;
      } else {
        mbgGame.log("createFighter can't find fighter", iTeam, dInfo.posIdx);
      }
    }
    if (!exist) {
      const _fighter = this.getFighterByObjID(objID);
      if (_fighter) {
        fighterNode = _fighter.node;
        exist = true;
      }
    }
    let fighterName;
    if (dInfo.type === 0) {
      fighterName = mbgGame.player.getCharaName(dInfo.ID);
    } else {
      fighterName = `monster_${dInfo.ID}`;
    }

    if (!exist) {
      fighterNode = cc.instantiate(mbgGame.preloadRes.fighter);
      this.getLayerGame().addChild(fighterNode, 0);
    }
    const fighter = fighterNode.getComponent('fighter');

    const ctrl = fighter.ctrl();
    ctrl.initFighter(iTeam, objID, _.clone(dInfo), worldIdx);
    assert(fighter.getSpineName());
    fighter.spineCtrl().loadSpine(fighter.getSpineName());
    ctrl.setClickMeFunc(() => {
      this.callBSWarFunc("info", fighter.objID(), fighter.getTeam());
    });

    fighter.setPosIdx(dInfo.posIdx);
    fighter.setMaxHp(dInfo[defines.Attr2ID.MaxHp]);
    fighter.setHp(dInfo.Hp);
    if (fighter.getStandTeam() === defines.TEAM_LEFT) {
      fighter.turnRight();
    } else {
      fighter.turnLeft();
    }
    fighter.setName(fighterName);
    if (this.m_Fighters.indexOf(fighter) === -1) {
      this.m_Fighters.push(fighter);
    }
    if (exist) {
      if (fighter.shouldDie()) {
        fighter.ctrl().die('createFighter');
      }
      fighter.ctrl().showShadow(true);
      return;
    }
    // mbgGame.warMgr.addLoadJob("spine", [fighter.getSpineName(), fighter.spineCtrl()]);
    const mtplConfig = fighter.getMTplConfig();
    const fixedAni = mtplConfig.fixedAni;
    if (fixedAni && fixedAni[0]) {
      mbgGame.warMgr.addLoadJob("spine", [fixedAni[0]]);
    }
    const skillFlySpine = mtplConfig.SkillFlySpine;
    if (skillFlySpine && skillFlySpine.indexOf("png") === -1) {
      mbgGame.warMgr.addLoadJob("spine", [skillFlySpine]);
    }
    const atkFlySpine = fighter.getFlySpineName();
    if (atkFlySpine && atkFlySpine.indexOf("png") === -1) {
      mbgGame.warMgr.addLoadJob("spine", [atkFlySpine]);
    }
    // 所有技能
    for (let i = 0; i < mtplConfig.SkillList.length; i++) {
      const skillID = mtplConfig.SkillList[i];
      const dConfig = fighter.getSkillTplConfig(skillID);
      if (dConfig) {
        if (dConfig.buff) {
          mbgGame.warMgr.addLoadJob("spine", [dConfig.buff]);
        }
        if (dConfig.HitEffect) {
          mbgGame.warMgr.addLoadJob("spine", [dConfig.HitEffect]);
        }
      }
    }
  },
  onLoadJobComplete() {
    const worldIdx = this.worldIdx;
    if (this.isStarted()) {
      this.setShowUIPanel(true);
      if (this.isTimerNeeded()) {
        this.uiWar.showTimer();
      }
      this.beginEnterScene();
      this.eachFighter((fighter) => {
        fighter.ctrl().onStart();
      });
    } else {
      if (defines.StoryWorlds.indexOf(worldIdx) !== -1 || worldIdx === 5) {
        // 获取并播放战前剧情
        const p = mbgGame.player.getStoryStageProgress(worldIdx, this.stageIdx());
        const canFightBoss = mbgGame.player.canFightStoryStageBoss(worldIdx, this.stageIdx());
        let plotIdx = null;
        if (worldIdx === 5) {
          plotIdx = 0;
        } else if (canFightBoss) {
          plotIdx = 0;
        } else if (p === 0) {
          // 第一场小怪战
          plotIdx = 2;
        }
        if (plotIdx != null) {
          this.requestPlot(worldIdx, this.stageIdx(), plotIdx);
        } else {
          this.onFinishPlot(worldIdx, 0);
        }
      } else {
        this.setShowUIPanel(true);
        this.beginEnterScene();
      }
    }

    this.eachFighter((fighter) => {
      fighter.ctrl().showShadow(true);
      if (fighter.shouldDie()) {
        fighter.ctrl().die('onLoadJobComplete');
      }
    });
  },
  beginEnterScene() {
    this.unschedule(this.onReady);
    let maxWalkTime = 0;
    this.eachFighter((fighter) => {
      const t = fighter.ctrl().enterScene();
      maxWalkTime = Math.max(maxWalkTime, t);
    });
    this.scheduleOnce(this.onReady, maxWalkTime || 0.2);
  },
  setClientWarID(wID) {
    this.m_clientWarID = wID;
  },
  getClientWarID() {
    return this.m_clientWarID;
  },
  isClientWar() {
    return this.m_clientWarID != null;
  },
  dayWarType() {
    return this.worldIdx === 4 && mbgGame.player.getDayWarTypeByStageIdx(this.stageIdx());
  },
  onReady() {
    // 检查是否要播战斗教学
    if (this.worldIdx === 5 && !mbgGame.player.getLocalItem("warTeach")) {
      this.setPause(true);
      this.callBSWarFunc("ready", { pause: 1 });
      this.showTeach();
    } else {
      this.callBSWarFunc("ready", {});
    }
  },
  // pos 站位
  addPlotFighter(fighter) {
    if (!this.m_PlotFighters) {
      this.m_PlotFighters = [];
    }
    this.m_PlotFighters.push(fighter);
  },
  doWinAction(iTeam, dontRevive) {
    // 延迟1秒
    this.scheduleOnce(() => {
      const fighters = this.m_Fighters;
      for (let i = 0; i < fighters.length; i++) {
        const fighter = fighters[i];
        if (fighter.getStandTeam() === iTeam) {
          if (dontRevive && fighter.FSM().getState() === 'die') {
            continue;
          }
          fighter.FSM().setState('win', { force: true });
        }
      }
    }, 1);
  },
  cleanTeam(iTeam) {
    // mbgGame.log("[cleanTeam] worldIdx", this.worldIdx, "iTeam", iTeam);
    if (!this.m_Fighters) {
      return;
    }
    const fighters = this.m_Fighters;
    const newfighters = [];
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.getTeam() !== iTeam) {
        newfighters.push(fighter);
      }
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.getTeam() === iTeam) {
        fighter.ctrl().removeMe();
      }
    }
    this.m_Fighters = newfighters;
  },
  plotReviveFighters() { },
  hideTeam(iTeam) {
    mbgGame.log("[hideTeam] worldIdx", this.worldIdx, "iTeam", iTeam);
    if (!this.m_Fighters) {
      return;
    }
    const fighters = this.m_Fighters;
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.getTeam() === iTeam) {
        fighter.node.active = false;
      }
    }
  },
  cleanFighters() {
    const fighters = this.m_Fighters;
    this.m_Fighters = [];
    if (!fighters) {
      return;
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      fighter.node && fighter.ctrl().removeMe();
    }
  },
  getFighterBySpine(spinename, iTeam) {
    const fighter = this.getFighterComBySpine(spinename, iTeam);
    return fighter && fighter.node;
  },
  getFighterComBySpine(spinename, iTeam) {
    const fighters = this.m_Fighters;
    if (!fighters) {
      return null;
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (!fighter.data()) {
        continue;
      }
      if ((iTeam === 1 || iTeam === 2) && fighter.getTeam() !== iTeam) {
        continue;
      }
      if (fighter.getSpineName() === spinename) {
        return fighter;
      }
    }
    return null;
  },
  getFighterByCharaID(charaID, iTeam) {
    const fighters = this.m_Fighters;
    if (!fighters) {
      return null;
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (iTeam && iTeam !== fighter.getTeam()) {
        continue;
      }
      if (fighter.charaID() === charaID) {
        return fighter;
      }
    }
    return null;
  },
  getFighterByObjID(objID) {
    const fighters = this.m_Fighters;
    if (!fighters) {
      return null;
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.objID() === objID) {
        return fighter;
      }
    }
    return null;
  },
  getFightersByTeam(iTeam) {
    const fighters = this.m_Fighters;
    if (!fighters) {
      return [];
    }
    const lst = [];
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.getTeam() === iTeam) {
        lst.push(fighter);
      }
    }
    return lst;
  },
  getFighterByPosIdx(iTeam, posIdx) {
    const fighters = this.m_Fighters;
    if (!fighters) {
      return null;
    }
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      if (fighter.getTeam() === iTeam && fighter.posIdx() === posIdx) {
        return fighter;
      }
    }
    return null;
  },
  onWarUpdated(worldIdx) {
    if (worldIdx !== -1 && worldIdx !== this.worldIdx) {
      return;
    }
  },
  showLeaveBtn() {
    this.m_ShowLeaveBtn = true;
  },
  isShowLeaveBtn() {
    return this.m_ShowLeaveBtn;
  },
  getSkillCostEnergy(charaID) {
    const fighter = this.getFighterByCharaID(charaID);
    return fighter.getSkillCostEnergy();
  },
  // 每秒加多少能量
  getEnergyAddPerSecond(iTeam) {
    let energy = mbgGame.config.constTable.WarEnergyAdd;
    if (this.worldIdx === 99) {
      // 根据时间，会变
      const iElapsedTime = this.getElapsedTime();
      const t = mbgGame.config.constTable.FastAddEnergyTime;
      if (iElapsedTime >= t) {
        energy *= (mbgGame.config.constTable.FastAddEnergyRatio || 2);
      }
    }
    const mul = this.getTeamTemp(iTeam, "EMul") || 0;
    if (mul > 0) {
      energy *= (1 + (mul * 0.01));
    }
    return energy;
  },
  setCostEnergyDict(dData) {
    this.m_CostEnergy = dData;
  },
  setExtraCostEnergy(charaID, val) {
    if (!this.m_ExtraCostEnergy) {
      this.m_ExtraCostEnergy = {};
    }
    this.m_ExtraCostEnergy[charaID] = val;
  },
  showWarning() {
    if (this.worldIdx === 0) {
      this.spineWarn.active = true;
      const spineObject = this.spineWarn.getComponent("spineObject");
      spineObject.playAnimation("warn");
      this.scheduleOnce(this.hideWarning, 3);
    }
  },
  hideWarning() {
    this.spineWarn.active = false;
  },
  showLost() {
    if (this.worldIdx >= 0 && this.worldIdx <= 2) {
      const spineObject = this.spineWarn.getComponent("spineObject");
      spineObject.playAnimation("lost");
    }
  },
  onShowPlot(plotIdx) {
    this.setShowUIPanel(false);
    // 播剧情 做一些处理
    const fighters = this.m_Fighters;
    for (let i = 0; i < fighters.length; i++) {
      const fighter = fighters[i];
      const ctrl = fighter.ctrl();
      ctrl.delAllBuff(true);
      ctrl.effectCtrl().stopFloatMsg();
      ctrl.revive();
      ctrl.onStory(plotIdx, true);
      /*
      if (fighter.getStandTeam() === defines.TEAM_LEFT) {
        ctrl.walkCtrl().leaveScene("左");
      } else {
        ctrl.walkCtrl().leaveScene("右");
      }*/
    }
  },
  onShowPlotEnd(plotIdx) {
    if (plotIdx === 1) { // 战后剧情
      return;
    }
    this.beginEnterScene();
    this.setShowUIPanel(true);
    if (plotIdx === 0 &&
      defines.StoryWorlds.indexOf(this.worldIdx) !== -1
      && mbgGame.player.canFightStoryStageBoss(this.worldIdx, this.stageIdx())) {
      this.bossWarn();
    }
  },
  calPlotID(worldIdx, stageIdx, plotIdx) {
    const stageID = defines.getStageID(worldIdx, stageIdx);
    const plotID = `${stageID}${plotIdx}`;
    return +plotID;
  },
  setWarEndData(dData) {
    this.m_WarEndData = dData;
  },
  requestPlot(worldIdx, stageIdx, plotIdx) {
    const plotID = this.calPlotID(worldIdx, stageIdx, plotIdx);
    mbgGame.log("[requestPlot] plotID", plotID);
    mbgGame.netCtrl.sendMsg("story.getplot", {
      plotID,
    }, (data) => {
      mbgGame.log("[requestPlot]", data);
      if (data.code === "ok") {
        mbgGame.plotStory.beginPlot(data.data, plotID);
        mbgGame.plotStory.setEndCB(() => {
          this.onFinishPlot(worldIdx, plotIdx);
        });
      } else {
        this.onFinishPlot(worldIdx, plotIdx);
      }
    });
  },
  onFinishPlot(worldIdx, plotIdx) {
    mbgGame.log("onFinishPlot", worldIdx, plotIdx);
    if (plotIdx === 0 || plotIdx === 2) {
      // 0 boss战前剧情 2 小怪战前剧情
      this.setShowUIPanel(true);
      mbgGame.log("beginWarReal");
      mbgGame.netCtrl.sendMsg("story.beginWarReal", {}, (data) => {
        mbgGame.log("beginWarReal data", data);
        if (data.code === "err" && data.err) {
          mbgGame.managerUi.floatMessage(data.err);
        }
      });
      this.onShowPlotEnd(plotIdx);
    }

    if (plotIdx === 1) { // 战后剧情
      const dWarEndData = this.m_WarEndData;
      delete this.m_WarEndData;
      // 拿战报数据
      mbgGame.netCtrl.sendMsg("story.result", {
        worldIdx,
        warEndData: dWarEndData,
      }, (data) => {
        mbgGame.log("story.result", data);
        if (data.code === 'err') {
          mbgGame.warMgr.onCloseWarResultPanel(worldIdx);
        }
      });
    }
  },
  // 开始战斗教学，只适用于开机剧情战
  showTeach() {
    this.teachPanel.active = true;
    const com = this.teachPanel.getComponent('warTeach');
    com.beginTeach(() => {
      this.setPause(false);
      this.callBSWarFunc("ready", { pause: 0 });
    });
  },
  setWarResult(r) {
    this.m_WarResult = r;
  },
  getWarResult() {
    return this.m_WarResult;
  },
  setPause(b) {
    this.m_Pause = b;
  },
  isPaused() {
    return this.m_Pause;
  },
  bossWarn() {
    const node = new cc.Node();
    node.addComponent(sp.Skeleton);
    const com = node.addComponent("spineObject");
    this.node.addChild(node);
    com.onSpineLoad = function () {
      this.playAnimationAndDestroy('bosswarn');
    };
    com.loadSpine('bosswarn');
  },
});