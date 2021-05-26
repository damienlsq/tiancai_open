const crypto = require('crypto');
const assert = require('assert');
const utils = require('./w_utils');
const timer = require('./w_timer');
const CWarData = require('./wardata');
const seedrandom = require('./w_seedrandom'); // 2.4.3
const defines = require('./w_defines');
const CBase = require('./w_base');
const CUnit = require('./w_unit');
const _u = require('./underscore');

/*
登录时，创建3个战斗对象CWar，加载我方数据，生成我方角色
然后再根据所在关卡，加载怪物数据，生成怪物，
此时开始战斗，CWar每0.5秒AddFrame一次，
每个单位按照攻击间隔(x帧执行一个attack)，发动攻击
怪物死亡时，不需要删除CWar也不需要充值CWar，只需要重新生成怪物即可，
即CWar、我方角色的生命周期是【上线，下线】
*/

class CWar extends CBase {
  constructor() {
    super();
    this.m_Simulating = false;
    this.reset();
  }
  CType() {
    return "CWar";
  }
  reset() {
    this.m_ElapsedTime = 0; // 一局战斗的耗时统计
    if (this.m_Timer) {
      mbgGame.logError("[w_war] reset more than one times");
    }
    this.m_Timer = new timer.CLogicTimer(this, this.onAddFrame);
    this.setLogicTimer(this.m_Timer);
    this.m_Frame = 0;
    this.m_Round = 0;
    this.m_Canstop = true;
    this.m_EnableRecord = false; // 是否需要记录数据，战斗结束后会发给GS
    this.m_ReplayMode = false; // replay模式，客户端不允许操作
    this.m_TempDictByTeam = {};
    this.m_UnitDict = {};
    this.m_Energy = {}; // 小数
    this.m_Energy[defines.TEAM_LEFT] = 0;
    this.m_Energy[defines.TEAM_RIGHT] = 0;
    this.m_UnitsByTeam = {};
    this.m_UnitsByTeam[defines.TEAM_LEFT] = {};
    this.m_UnitsByTeam[defines.TEAM_RIGHT] = {};
    this.m_AutoUseSkillInterval = {};
    this.stopAutoUseSkill(defines.TEAM_LEFT);
    this.stopAutoUseSkill(defines.TEAM_RIGHT);
    this.m_Botting = {}; // 双方的代练数据
  }
  getState(isDefender) {
    const dState = {};
    let warToken = this.getToken();
    if (this.isPVP() && isDefender) {
      warToken = this.getTargetToken();
    }
    dState.wID = this.getWarID();
    dState.token = warToken;
    // 战斗背景图
    dState.image = this.getBg();
    // 队伍数据
    const iTeams = [defines.TEAM_LEFT, defines.TEAM_RIGHT];
    for (let i = 0; i < iTeams.length; i++) {
      const iTeam = iTeams[i];
      dState[iTeam] = this.getTeamInfo(iTeam);
    }
    // 按照战斗类型
    if (this.stageIdx()) {
      dState.stageIdx = this.stageIdx();
    }
    const dInfo = this.getInfoForClient();
    if (dInfo) {
      dState.info = dInfo;
    }
    const beginTime = this.getBeginTime();
    if (beginTime) {
      dState.beginTime = beginTime;
    }
    if (this.isReplayMode()) {
      dState.replay = 1;
    }
    dState.duration = this.getForceEndTime();
    dState.energy = this.getEnergyDict();
    dState.started = this.isTeamStarted();
    dState.fwdPair = mbgGame.bsmgr && mbgGame.bsmgr.getFSPair();
    let fwdPair;
    if (this.isPVP()) {
      if (isDefender) {
        dState.isDefender = 1;
        dState.botting = this.getBottingData(defines.TEAM_RIGHT);
        dState.costEnergy = this.getCharaSkillCostEnergyDict(defines.TEAM_RIGHT);
        fwdPair = this.getDefenderFwdPair();
        const host = fwdPair[0];
        const FSServerId = mbgGame.bsmgr && mbgGame.bsmgr.getFSServerIdByHost(host);
        // 防守方不一定在本服
        dState.fwdPair = mbgGame.bsmgr && mbgGame.bsmgr.getFSPair(FSServerId);
      } else {
        dState.botting = this.getBottingData(defines.TEAM_LEFT);
        dState.costEnergy = this.getCharaSkillCostEnergyDict(defines.TEAM_LEFT);
      }
    } else {
      dState.costEnergy = this.getCharaSkillCostEnergyDict(defines.TEAM_LEFT);
      dState.botting = this.getBottingData(defines.TEAM_LEFT);
    }
    return dState;
  }
  getNewObjID() {
    if (!this.m_ObjCount) {
      this.m_ObjCount = 0;
    }
    this.m_ObjCount += 1;
    return this.m_ObjCount;
  }
  setToken(t) {
    this.m_Token = t;
  }
  getToken() {
    return this.m_Token;
  }
  setTargetToken(t) {
    this.m_TargetToken = t;
  }
  getTargetToken() {
    return this.m_TargetToken;
  }
  isRecordEnabled() {
    return this.m_EnableRecord;
  }
  setRecordEnabled(b) {
    this.m_EnableRecord = b;
  }
  setWarInitData(dData) {
    this.m_WarAllData = dData;
  }
  getWarInitData() {
    return this.m_WarAllData;
  }
  setClientReplay() {
    this.m_ClientReplay = true;
  }
  clientReplay() {
    return this.m_ClientReplay;
  }
  setCanStop(canstop) {
    this.m_Canstop = canstop;
  }
  canStop() {
    return this.m_Canstop;
  }
  setReplayModeEnabled(b) {
    this.m_ReplayMode = b;
  }
  isReplayMode() {
    return this.m_ReplayMode;
  }
  // seed是数字
  setSeed(seed) {
    this.m_Seed = seed;
  }
  getSeed() {
    if (!this.m_Seed) {
      this.m_Seed = defines.newSeed();
    }
    return this.m_Seed;
  }
  getUtils() {
    return utils;
  }
  getSeedString() {
    return `s${this.getUtils().pad(this.getSeed(), 10)}`;
  }
  // get random number generator
  getRNG() {
    if (!this.m_RNG) {
      this.m_RNG = seedrandom(this.getSeedString());
    }
    return this.m_RNG;
  }
  setClientWar(b) {
    this.m_cwar = b;
  }
  isClientWar() {
    return this.m_cwar;
  }
  setUUID(uuid) {
    this.m_UUID = uuid;
  }
  getUUID() {
    return this.m_UUID;
  }
  setNoEnchant(b) {
    this.m_NoEnchant = b;
  }
  setShortID(shortID) {
    this.m_shortID = shortID;
  }
  getShortID() {
    return this.m_shortID;
  }
  setTargetUUID(targetUUID) {
    this.m_targetUUID = targetUUID;
  }
  getTargetUUID() {
    return this.m_targetUUID;
  }
  beginRealTimePVP(host, FSId, cid) {
    this.m_RealTimePVP = true;
    this.m_DefenderFwdPair = [host, FSId, cid];
    // this.wlog("begin realtime pvp", this.m_DefenderFwdPair);
  }
  getDefenderFwdPair() {
    return this.m_DefenderFwdPair;
  }
  transTeam(isDefender) {
    const iTeam = isDefender ? defines.TEAM_RIGHT : defines.TEAM_LEFT;
    return iTeam;
  }
  isRealTimePVP() {
    if (!this.isPVP()) {
      return false;
    }
    return this.m_RealTimePVP;
  }
  setCreateTime(t) {
    this.m_CreateTime = t;
  }
  getCreateTime() {
    return this.m_CreateTime;
  }
  setBeginTime(t) {
    if (!t) {
      t = moment().valueOf();
    }
    this.m_BeginTime = t;
  }
  getBeginTime() {
    return this.m_BeginTime;
  }
  setBg(bg) {
    this.m_Bg = bg;
  }
  getBg() {
    return this.m_Bg;
  }
  isPVE() {
    return defines.PVEWorlds.indexOf(this.worldIdx()) !== -1;
  }
  isPVP() {
    return this.worldIdx() === 99;
  }
  isSendWarEvent() {
    return this.m_SendWarEvent;
  }
  setSendWarEvent(b) {
    this.m_SendWarEvent = b;
  }
  canSendWarEvent(sEvent) {
    if (!this.isSendWarEvent() && sEvent !== "WarEnd") {
      return false;
    }
    return true;
  }
  setLang(lang) {
    this.m_lang = lang;
  }
  // 缓存的一些客户端需要的信息
  setInfoForClient(dInfo) {
    this.m_CInfo = dInfo;
  }
  isFriendWar() {
    return this.m_CInfo && this.m_CInfo.friendwar;
  }
  getInfoForClient() {
    return this.m_CInfo;
  }
  getString() { // key, options
    return "";

    /*
    this.m_lang = this.m_lang || 'zh';
    const polyglot_key = `${this.m_lang}.${key}`;
    const str = mbgGame.i18n.polyglot.t(polyglot_key, options);
    if (str == polyglot_key) {
        this.wlogErr("[w_war.getString] no i18n key", polyglot_key);
        return '';
    }
    return str;*/
  }
  setWorldIdx(worldIdx) {
    this.m_WorldIdx = worldIdx;
    this.m_itemBuffEnable = defines.StoryWorlds.indexOf(worldIdx) !== -1;
  }
  worldIdx() {
    return this.m_WorldIdx;
  }
  setStageIdx(stageIdx) {
    this.m_StageIdx = stageIdx;
  }
  stageIdx() {
    return this.m_StageIdx;
  }
  setStageID(stageID) {
    this.m_StageID = stageID;
  }
  stageID() {
    return this.m_StageID;
  }
  getBossID() {
    let bossID = null;
    this.eachUnitDo((unit) => {
      if (unit.m_Data.boss) {
        bossID = unit.m_Data.ID;
      }
    },
      defines.TEAM_RIGHT);
    return bossID;
  }
  // iTeam 发给 另一个team
  sendEmote(iTeam, emoteId) {
    if (!this.isPVP()) {
      return;
    }
    const targetTeam = defines.TEAM_LEFT === iTeam ? defines.TEAM_RIGHT : defines.TEAM_LEFT;
    this.m_Listener.on("onSendEmote", {
      team: targetTeam,
      id: emoteId,
    });
  }
  // 治疗效果系数
  getHealRatio() {
    if (this.isPVE()) {
      return 1;
    }
    const lefttime = Math.max(0, this.getForceEndTime() - this.framesToSeconds(this.frames()));
    if (lefttime >= mbgGame.config.constTable.HealDebuffTime) {
      return 1;
    }
    const ratio = Math.max(0, lefttime / mbgGame.config.constTable.HealDebuffTime);
    return ratio;
  }
  setWarID(warID) {
    this.m_WarID = warID;
  }
  getWarID() {
    return this.m_WarID;
  }
  setGSVar(v) {
    this.m_GSVar = v;
  }
  getGSVar() {
    return this.m_GSVar;
  }
  setFramesPerTick(f) {
    this.m_framesPerTick = f;
  }
  framesPerTick() {
    if (this.isClientWar()) {
      return 2;
    }
    return this.m_framesPerTick || 1;
  }
  simulate() {
    if (!this.m_Simulating) {
      return;
    }
    let time1;
    let time2;
    if (mbgGame.config.enableWarProfile) {
      time1 = process.hrtime();
    }
    const framesPerTick = this.framesPerTick();
    this.createActionPacket();
    for (let i = 0; i < framesPerTick; i++) { // 每次simulate运算多少帧（主要用在服务器验证战斗，提升效率）
      this.checkClientOpByFrame();
      if (this.isWarEnd() || this.isPaused()) {
        break;
      }
      this.nextFrame();
      this.m_Frame += 1;
      if (this.isWarEnd() || this.isPaused()) {
        break;
      }
    }
    this.cleanAndSendAction();
    if (mbgGame.config.enableWarProfile) {
      time2 = process.hrtime();
      this.m_ElapsedTime += time2[0] - time1[0] + ((time2[1] - time1[1]) * 1e-9);
    }
  }
  checkClientOpByFrame() {
    if (!this.isWarEnd()) {
      if (this.isReplayMode()) {
        const ok = this.checkClientOp(this.m_OpListRecord);
        if (!ok) {
          this.wlog("checkClientOp record failed", JSON.stringify(this.m_OpListRecord));
        }
      } else if (this.isClientWar()) {
        const doneOpList = [];
        const ok = this.checkClientOp(this.m_OpListSync, doneOpList, true);
        if (ok) {
          if (doneOpList.length > 0) {
            this.recordClientOpList(doneOpList);
            this.wlog("doneOpList", JSON.stringify(doneOpList));
          }
        } else {
          this.wlog("checkClientOp sync failed", this.worldIdx(),
            this.isReplayMode(), JSON.stringify(this.m_OpListSync));
        }
        if (this.m_Frame === this.m_SyncFrame) {
          if (mbgGame.config.cwardebug) {
            const [info, sMD5] = this.calFrameMD5();
            this.pauseSimulate();
            this.wlog("checkClientOp done, is ok", ok);
            const isSameMD5 = this.m_CFrameMD5 === sMD5;
            this.wlog("pauseSimulate frame", this.m_Frame, "md5 check", isSameMD5);
            if (!isSameMD5) {
              this.wlog("战斗不一致 inconsist");
              this.m_Listener.on("onSyncError", {
                cinfo: this.m_CFrameInfo,
                sinfo: info,
              });
            }
          } else {
            this.pauseSimulate();
          }
        }
      }
    }
  }
  startSimulate() {
    this.m_Simulating = true;
  }
  resumeSimulate() {
    this.m_Simulating = true;
  }
  isPaused() {
    return !this.m_Simulating;
  }
  pauseSimulate() {
    this.m_Simulating = false;
  }
  stopSimulate() {
    this.m_Simulating = false;
  }
  resumeWar() {
    if (this.isClientWar()) {
      this.setClientWar(0);
      this.setSendWarEvent(true);
    }
    this.startSimulate();
  }
  release() {
    if (this.m_Released) {
      this.wlogErr("[release] already release!");
      return;
    }
    this.m_Released = true;
    this.stopSimulate();
    this.cleanTeam(defines.TEAM_LEFT);
    this.cleanTeam(defines.TEAM_RIGHT);
    this.m_Timer.releaseLogicTimer();
    this.setLogicTimer(null);
    this.registerListener(null);
    this.m_OpListRecord = null;
    // this.wlog("[w_war.release] world:", this.worldIdx());
  }
  nextFrame() {
    this.m_Timer.addFrame(1);
  }
  eachUnitDo(func, iTeam) {
    const self = this;
    let iTeams = null;
    if (iTeam) {
      iTeams = [iTeam];
    } else {
      iTeams = [defines.TEAM_LEFT, defines.TEAM_RIGHT];
    }
    _u.each(iTeams, (_iTeam) => {
      const dUnits = self.m_UnitsByTeam[_iTeam];
      const units = _u.values(dUnits);
      _u.each(units, func);
    });
  }
  isWarEnd() {
    return this.m_WarEnd;
  }
  setPVEWarEndData(dData) {
    dData.stageIdx = this.stageIdx();
    dData.stageID = this.stageID();
    dData.costTime = this.costTime();
    dData.mNum = this.getUnitsList(defines.TEAM_RIGHT).length;
    dData.charaIDs = this.getUnitIDList(defines.TEAM_LEFT);
    dData.bossID = this.getBossID();
    dData.hpinfo = {
      left: this.getHpInfo(defines.TEAM_LEFT),
      right: this.getHpInfo(defines.TEAM_RIGHT),
    };
    if (this.worldIdx() === defines.dayWorldIdx) {
      const bossUnit = this.getUnitByID(defines.TEAM_RIGHT, dData.bossID);
      dData.percent = bossUnit ? bossUnit.hpPercent() : 1;
    }
  }
  createActionPacket() {
    this.m_ActionPacket = {};
  }
  pushAction(unit, iActionID, dParam) {
    if (!this.m_ActionPacket) {
      this.wlogErr("[pushAction] no this.m_ActionPacket", iActionID);
      return;
    }
    if (!this.m_ActionPacket[unit.objID()]) {
      this.m_ActionPacket[unit.objID()] = [];
    }
    this.m_ActionPacket[unit.objID()].push([iActionID, dParam]);
  }
  cleanAndSendAction() {
    if (_u.isEmpty(this.m_ActionPacket)) {
      return;
    }
    if (!this.m_Listener) {
      return;
    }
    this.m_Listener.on("onAction", {
      o2a: this.m_ActionPacket,
    });
    delete this.m_ActionPacket;
  }
  onAddFrame() {
    do {
      this.m_Timer.processSchedule();
      if (this.isWarEnd()) {
        break;
      }
      try {
        this.eachUnitDo((unit) => {
          unit.m_Timer.addFrame(1);
        });
      } catch (e) {
        this.isDebug() && this.debuglog("[Error]", e.stack);
        this.wlogErr("[onAddFrame] err:", e.stack);
      }
      if (this.isWarEnd()) {
        break;
      }
      if (this.isTeamStarted()) {
        this.onCheckBotting();
      }
      if (this.m_WarResult) {
        const result = this.m_WarResult;
        delete this.m_WarResult;
        this.onWarEnd(result);
      }
    } while (0);
  }
  onWarEnd(result) {
    if (this.isWarEnd()) {
      return;
    }
    this.m_WarEnd = true;
    if (this.m_Released) {
      return;
    }
    if (!this.m_forceStopWar && this.m_lastframe) {
      const [infoNow, sMD5Now] = this.calFrameMD5();
      const [info, sMD5] = this.m_lastframe.d;
      this.wlog("[w_war] lastframe check", this.m_Frame, this.m_lastframe.f, sMD5, sMD5Now);
      if (this.m_Frame !== this.m_lastframe.f || sMD5 !== sMD5Now) {
        this.wlog("[w_war] lastframe check failed");
        this.m_Listener.on("onReplayError", {
          infoNow,
          info,
        });
      } else {
        this.wlog("[w_war] lastframe check ok");
      }
    }
    delete this.m_lastframe;
    // TODO
    if (mbgGame.config.enableWarProfile) {
      const elapsedTimePerFrame = this.m_ElapsedTime / this.frames();
      mbgGame.elapsedTimePerFrame = elapsedTimePerFrame; // 收集最大运行时间
      mbgGame.elapsedTime = this.m_ElapsedTime;
      mbgGame.elapsedTimeFrames = this.frames();
      if (!mbgGame.elapsedTimePerFrameMax || mbgGame.elapsedTimePerFrameMax < elapsedTimePerFrame) {
        mbgGame.elapsedTimePerFrameMax = elapsedTimePerFrame; // 收集最大运行时间
        mbgGame.elapsedTimeMax = this.m_ElapsedTime;
        mbgGame.elapsedTimeFramesMax = this.frames();
        mbgGame.elapsedTimePerFrameMax_time = new Date();
      }
      this.wlog("[war end] elapsedTimePerFrame", elapsedTimePerFrame, "frames", this.frames(), "time", this.m_ElapsedTime);
    }
    this.cleanWar();
    if (this.worldIdx() === 0 && result !== defines.WarWin) {
      // PVE小怪战输了，启动自动复活
      this.removeCallOut(`pvegrouprevive`);
      this.callOut(this.secondsToFrames(5), `pvegrouprevive`, this.onGroupRevive.bind(this));
    }
    const dData = {
      result,
    };
    if (this.m_Listener) {
      if (this.worldIdx() !== 0) {
        const dBotting = this.getBottingData(defines.TEAM_LEFT);
        // 保存进攻方的botting设置
        this.m_Listener.on("onSaveBotting", {
          auto: dBotting.auto,
        });
      }
      if (this.m_EnableRecord) {
        // 发送对战记录数据
        dData.recorded = 1;
        dData.forceStop = this.m_forceStopWar;
        dData.opList = this.m_OpListRecord;
        dData.warData = this.getWarInitData();
        dData.warData.lastframe = { // 最后一帧的md5，用来验证回放是否一致
          f: this.m_Frame,
          d: this.calFrameMD5(),
        };
        // const fs = require("fs");
        // fs.writeFile("opList.js", `const opList = JSON.parse(\`${JSON.stringify(this.m_OpListRecord)}\`); module.exports = opList;`);
      }
      if (this.isReplayMode()) {
        dData.replay = 1;
      }
      this.m_Listener.on("onWarEnd", dData);
      if (!this.m_Released) {
        this.removeCallOut(`releaseMe`);
        this.callOut(this.secondsToFrames(20), `releaseMe`, () => {
          mbgGame.warCtrl.releaseWar(this.getWarID(), "releaseMe");
        });
      }
    }
  }
  onGroupRevive() {
    this.eachUnitDo((unit) => {
      unit.onRevive(null, "group");
    },
      defines.TEAM_LEFT);
  }
  // 战斗结束后的清理工作
  cleanWar() {
    this.cleanUnitTempDict();
    this.m_TempDictByTeam = {};
    this.m_TeamStarted = false;
    this.m_ReadyTeams = null;
    this.m_Round = 0;
  }
  setBottingConfig(iTeam, dData) {
    if (!this.m_Botting[iTeam]) {
      this.m_Botting[iTeam] = { charaIDs: null, auto: 0 };
    }
    if (dData.charaIDs != null) {
      this.m_Botting[iTeam].charaIDs = dData.charaIDs;
    }
    if (dData.auto != null) {
      this.m_Botting[iTeam].auto = dData.auto ? 1 : 0;
      this.m_Listener && this.m_Listener.on("onSetBotting", {
        team: iTeam,
        auto: this.m_Botting[iTeam].auto,
      });
    }
  }
  getBottingData(iTeam) {
    return this.m_Botting[iTeam];
  }
  getRandomBottingCharaID(iTeam) {
    const charaIDs = this.getUnitIDList(iTeam);

    if (!this.m_bottingRandomCharaID) {
      this.m_bottingRandomCharaID = {};
    }
    if (!this.m_bottingRandomCharaID[iTeam]) {
      if (charaIDs.length > 0) {
        const charaID = charaIDs[this.randomInt(0, charaIDs.length - 1)];
        this.m_bottingRandomCharaID[iTeam] = charaID;
      }
    }
    return this.m_bottingRandomCharaID[iTeam];
  }
  cleanRandomBottingCharaID(iTeam) {
    if (this.m_bottingRandomCharaID && this.m_bottingRandomCharaID[iTeam]) {
      delete this.m_bottingRandomCharaID[iTeam];
    }
  }
  addBottingIdx(iTeam) {
    const dData = this.m_Botting[iTeam];
    if (!dData || _u.isEmpty(dData.charaIDs)) {
      return;
    }
    let idx = dData.idx || 0;
    idx += 1;
    if (idx === dData.charaIDs.length) {
      idx = 0;
    }
    dData.idx = idx;
  }
  onCheckBotting() {
    for (let i = 0; i < defines.bothTeams.length; i++) {
      const iTeam = defines.bothTeams[i];
      const dData = this.m_Botting[iTeam];
      if (!dData) {
        continue;
      }
      if (!dData.auto) {
        continue;
      }
      const charaIDs = dData.charaIDs;
      let charaID = 0;
      if (!charaIDs || charaIDs.length === 0) { // 开启了自动，但是没设技能列表
        // 如果是自己，或pvp的对手，就随机
        if (iTeam === defines.TEAM_RIGHT && this.worldIdx() !== 99) {
          continue;
        }
        charaID = this.getRandomBottingCharaID(iTeam);
      } else {
        const idx = dData.idx || 0;
        charaID = charaIDs[idx];
      }
      const unit = this.getUnitByID(iTeam, charaID);
      if (!unit || !unit.isStarted() || unit.isDie()) {
        this.addBottingIdx(iTeam);
        this.cleanRandomBottingCharaID(iTeam);
        continue;
      }
      const skillID = defines.getCharaActiveSkillID(charaID);
      const err = unit.useSkill(skillID);
      if (!err) {
        this.addBottingIdx(iTeam);
        this.cleanRandomBottingCharaID(iTeam);
        this.m_Listener.on("onAfterUseSkill", {
          unit,
          skillID,
        });
      } else {
        // this.wlog("botting use skil failed, err", err, 'charaID', charaID, skillID);
      }
    }
  }
  onUnitDie() {
    if (this.checkWarLose()) {
      this.m_WarResult = defines.WarFail;
      this.isDebug() && this.debuglog("本场战斗结束，战斗结果: 负");
    } else if (this.checkWarWin()) {
      this.m_WarResult = defines.WarWin;
      this.isDebug() && this.debuglog("本场战斗结束，战斗结果: 胜");
    }
  }
  setReplayResult(result) {
    this.m_ReplayWarResult = result;
  }
  getRelayResult() {
    return this.m_ReplayWarResult;
  }
  getOpListRecord() {
    return this.m_OpListRecord;
  }
  setClientOpList(opList) {
    this.m_OpListRecord = opList || [];
  }
  recordClientOp(op, ...args) {
    // this.wlog("recordClientOp", op);
    if (!this.m_EnableRecord) {
      return;
    }
    if (!this.m_OpListRecord) {
      this.m_OpListRecord = [];
    }
    // [frame, frame + 1]之间按序执行
    const arr = [this.m_Frame, op, ...args];
    this.m_OpListRecord.push(arr);
    this.m_Listener.on("onRecordOp", {
      op: arr,
    });
    // this.wlog("recordClientOp done", op);
  }
  recordClientOpList(opList) {
    if (!this.m_EnableRecord) {
      return;
    }
    if (!this.m_OpListRecord) {
      this.m_OpListRecord = [];
    }
    this.m_OpListRecord = this.m_OpListRecord.concat(opList);
  }
  setSyncFrame(frame, info, frameMD5) {
    if (this.m_SyncFrame && frame < this.m_SyncFrame) {
      this.wlogErr("setSyncFrame frame < this.m_SyncFrame", frame, this.m_SyncFrame);
      return;
    }
    this.m_SyncFrame = frame;
    this.m_CFrameMD5 = frameMD5;
    this.m_CFrameInfo = info;
  }
  // 不是record，是同步客户端战斗的操作
  syncClientOp(opList) {
    if (!this.isClientWar()) {
      return;
    }
    if (!this.m_OpListSync) {
      this.m_OpListSync = [];
    }
    this.m_OpListSync = this.m_OpListSync.concat(opList);
  }
  // 每一个frame处理完后（相当于客户端指令处理时间），check一次
  checkClientOp(clientOpList, doneOpList, debug) {
    if (_u.isEmpty(clientOpList)) {
      return true;
    }
    while (clientOpList.length > 0) {
      const arr = clientOpList[0];
      if (!arr) {
        clientOpList.shift();
        continue;
      }
      if (arr[0] > this.m_Frame) {
        break;
      }
      if (arr[0] < this.m_Frame) {
        if (debug) this.wlog("checkClientOp err op frame < now frame", JSON.stringify(arr), this.m_Frame);
        break;
      }
      // arr[0] === this.m_Frame
      if (debug) this.wlog("checkClientOp frame", this.m_Frame, "op", JSON.stringify(arr));
      clientOpList.shift();
      const op = arr[1];
      let ok = true;
      switch (op) {
        case defines.ClientOp.ready:
          {
            ok = this.clientReady(arr[2]);
            /*
            if (!ok) {
              this.wlog(`[clientOp] clientReady arr: ${arr} left: ${clientOpList.length} err`);
            }*/
            break;
          }
        case defines.ClientOp.useSkill:
          {
            const dTriggerData = {
              team: arr[2],
              ID: arr[3],
              skillID: arr[4],
            };
            this.trigger('使用技能', dTriggerData);
            if (dTriggerData.err) {
              ok = false;
              this.wlogErr(`[clientOp] useSkill arr: ${arr} left: ${clientOpList.length} err: ${dTriggerData.err}`);
            }
            break;
          }
        case defines.ClientOp.stopWar:
          this.setWarResult(arr[2]);
          // this.wlog(`[clientOp] stopWar arr ${arr} left: ${clientOpList.length} ok`);
          break;
        case defines.ClientOp.setBotting:
          this.setBottingConfig(arr[2], arr[3]);
          // this.wlog(`[clientOp] setBotting arr ${arr} left: ${clientOpList.length} ok`);
          break;
        default:
          break;
      }
      if (doneOpList && ok) {
        doneOpList.push(arr);
      }
      if (!ok) {
        return false;
      }
      continue;
    }
    return true;
  }
  doProb(prob) {
    const ranFloat = this.getRNG().quick();
    if (ranFloat < prob) {
      return true;
    }
    return false;
  }
  // [min, max]
  randomInt(min, max) {
    const ranFloat = this.getRNG().quick();
    return Math.round((ranFloat * (max - min)) + min);
  }
  getTeamTemp(iTeam, k) {
    return this.m_TempDictByTeam && this.m_TempDictByTeam[iTeam] && this.m_TempDictByTeam[iTeam][k];
  }
  setTeamTemp(iTeam, k, val) {
    if (!this.m_TempDictByTeam[iTeam]) {
      this.m_TempDictByTeam[iTeam] = {};
    }
    this.m_TempDictByTeam[iTeam][k] = val;
  }
  initTeam(iTeam, dTeamData, dItem) {
    if (!dTeamData) {
      return;
    }
    const bagDict = dItem && dItem.bag;
    const sid2ItemData = dItem && dItem.data;
    const charaIDs = [];
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const dUnitData = dTeamData[posIdx];
      if (!dUnitData) {
        charaIDs.push(0);
        continue;
      }
      charaIDs.push(dUnitData.ID);
    }
    const warData = new CWarData();
    const dExtraData = warData.getItemExtraTable(charaIDs, bagDict, sid2ItemData, !!this.m_NoEnchant);
    /*
    this.wlog("charaIDs", JSON.stringify(charaIDs));
    this.wlog("sid2ItemData", JSON.stringify(sid2ItemData));
    this.wlog("bagDict", JSON.stringify(bagDict));
    this.wlog("dExtraData", JSON.stringify(dExtraData));
    */
    for (let posIdx = 0; posIdx < 5; posIdx++) {
      const dUnitData = dTeamData[posIdx];
      if (!dUnitData) {
        continue;
      }
      const unit = new CUnit();
      unit.m_Team = iTeam;
      this.refUnit(unit);
      unit.m_Data = dUnitData;
      if (dExtraData) {
        const dExtraAttr = dExtraData[dUnitData.ID];
        // this.wlog(dUnitData.ID, "dExtraAttr", JSON.stringify(dExtraAttr));
        if (!_u.isEmpty(dExtraAttr)) {
          unit.setExtraAttrData(dExtraAttr);
        }
      }
      unit.load(dUnitData);
      if (bagDict) {
        const sid = bagDict[posIdx] && bagDict[posIdx][0];
        if (sid) {
          unit.setItemData(this.getUtils().deepClone(sid2ItemData[sid]));
        }
      }
    }
  }
  // 不需要按照posIdx排列的
  getCharaIDs(iTeam) {
    const charaIDs = [];
    this.eachUnitDo((unit) => {
      charaIDs.push(unit.ID());
    },
      iTeam);
    return charaIDs;
  }
  getCharaSkillCostEnergyDict(iTeam) {
    const dEnergy = {};
    this.eachUnitDo((unit) => {
      const charaID = unit.ID();
      const iSkillID = defines.getCharaActiveSkillID(charaID);
      const iNeedEnergy = unit.getSkillCostEnergy(iSkillID);
      // this.wlog("cost", charaID, "e", iNeedEnergy);
      dEnergy[charaID] = iNeedEnergy;
    },
      iTeam);
    return dEnergy;
  }
  fullRecover(iTeam, nolabel) {
    this.eachUnitDo((unit) => {
      unit.fullRecover(nolabel);
    },
      iTeam);
  }
  halfRecover(iTeam) {
    this.eachUnitDo((unit) => {
      unit.halfRecover();
    },
      iTeam);
  }
  setHaltTime(haltSeconds) {
    this.callOut(this.secondsToFrames(haltSeconds), `HaltTime`, this.onHaltTimeout.bind(this));
  }
  onHaltTimeout() {
    assert(this.isReplayMode());
    this.stopWar({
      result: defines.WarDraw,
    });
  }
  cleanUnitTempDict() {
    this.eachUnitDo((unit) => {
      unit.cleanTempDict();
    });
  }
  // refreshTeamData太慢，这个是加速用
  refreshPassiveSkillAttr(iTeam) {
    this.eachUnitDo((unit) => {
      unit.refreshPassiveSkillAllAttr();
    }, iTeam);
  }
  cleanTeam(iTeam) {
    const units = this.getUnitsList(iTeam);
    if (!units) {
      return false;
    }
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      unit.release();
      this.unrefUnit(unit);
    }
    return true;
  }
  refUnit(unit) {
    unit.m_War = this;
    unit.m_Listener = this.m_Listener;
    unit.setObjID(this.getNewObjID());
    this.m_UnitDict[unit.objID()] = unit;
    this.m_UnitsByTeam[unit.team()][unit.objID()] = unit;
  }
  unrefUnit(unit) {
    unit.m_War = null;
    unit.m_Listener = null;
    delete this.m_UnitDict[unit.objID()];
    delete this.m_UnitsByTeam[unit.team()][unit.objID()];
  }
  onLoaded() { }
  getEnergyDict() {
    return this.m_Energy;
  }
  // 返回的是小数
  getEnergy(iTeam) {
    return this.m_Energy[iTeam];
  }
  addEnergy(iTeam, iAdd) {
    this.m_Energy[iTeam] += iAdd;
    if (this.m_Energy[iTeam] > 100) {
      this.m_Energy[iTeam] = 100;
    }
    if (this.m_Energy[iTeam] < 0) {
      this.m_Energy[iTeam] = 0;
    }
  }
  // 定时加能量
  onAddEnergyTimeout(iTeam) {
    this.addEnergy(iTeam, this.getEnergyAddPerSecond(iTeam) / 5);
    this.setAddEnergyTimer(iTeam);
  }
  getEnergyAddPerSecond(iTeam) {
    let iAdd = mbgGame.config.constTable.WarEnergyAdd || 1;
    if (this.isPVP()) {
      const elapsedtime = this.framesToSeconds(this.frames());
      const t = mbgGame.config.constTable.FastAddEnergyTime || 120;
      if (elapsedtime >= t) {
        iAdd *= (mbgGame.config.constTable.FastAddEnergyRatio || 2);
      }
    }
    const mul = this.getTeamTemp(iTeam, "EMul") || 0;
    if (mul > 0) {
      iAdd *= (1 + (mul * 0.01));
    }
    return iAdd;
  }
  setAddEnergyTimer(iTeam) {
    this.removeCallOut(`addEnergy${iTeam}`);
    this.callOut(this.secondsToFrames(1 / 5), `addEnergy${iTeam}`, this.onAddEnergyTimeout.bind(this, iTeam));
  }
  onEnergyChanged(iTeam) {
    this.m_Listener.on("onUpdateEnergy", {
      team: iTeam,
      e: this.m_Energy[iTeam],
    });
  }
  // 让双方站一号位的人喊一句话
  setShowDesc(delay, mydesc, targetdesc) {
    this.removeCallOut(`onShowDesc`);
    this.callOut(this.secondsToFrames(delay), `onShowDesc`, this.onShowDesc.bind(this, mydesc, targetdesc));
  }
  onShowDesc(mydesc, targetdesc) {
    this.m_Listener.on("onShowDesc", {
      mydesc,
      targetdesc,
    });
  }
  // 秒
  setForceEndTime(ft) {
    this.m_ForceEndTime = ft;
  }
  getForceEndTime() {
    return this.m_ForceEndTime;
  }
  // 强制结束当前战斗
  forceEndWar() {
    if (this.m_WarResult) {
      return;
    }
    if (this.isPVP()) {
      this.m_WarResult = defines.WarDraw; // pvp时间到，是平局
    } else {
      this.m_WarResult = defines.WarFail;
    }
  }
  setWarResult(result) {
    this.m_WarResult = result;
  }
  setForceReadyTime(frt) {
    this.m_ForceReadyTime = frt;
  }
  onBegin() {
    this.isDebug() && this.debuglog("战斗开始");
    this.m_Listener.on("onWarBegin", {});
    if (this.m_CInfo) {
      this.setShowDesc(2, this.m_CInfo.mydesc, this.m_CInfo.targetdesc);
    }
    this.eachUnitDo((unit) => {
      unit.m_Started = false;
    });
    if (!this.isClientWar()) {
      // 非客户端战斗，保证最终会启动
      this.setupForceStartTeamTimer();
      this.startSimulate();
    }
  }
  setupForceStartTeamTimer() {
    this.removeCallOut("startTeams");
    this.callOut(this.secondsToFrames(this.m_ForceReadyTime || 10), "startTeams", this.onStartTeams.bind(this, true));
  }
  isTeamStarted() {
    return this.m_TeamStarted === true;
  }
  // 客户端通知GS已初始化战斗场景，可以开始战斗
  clientReady(iTeam) {
    if (this.m_TeamStarted) {
      return false;
    }
    this.m_ReadyTeams = this.m_ReadyTeams || {};
    this.m_ReadyTeams[iTeam] = 1;
    if (!this.isRealTimePVP()) {
      // 非实时对战，进攻方ready了就可以开始了
      this.onStartTeams(false);
    } else if (this.m_ReadyTeams[defines.TEAM_LEFT]
      && this.m_ReadyTeams[defines.TEAM_RIGHT]) {
      // 实时对战
      this.onStartTeams(false);
    }
    return true;
  }
  onStartTeams(force) {
    this.wlog("onStartTeams force", force);
    if (this.m_TeamStarted) {
      return;
    }
    this.setBeginTime();
    this.m_TeamStarted = true;
    this.removeCallOut("startTeams");
    this.removeCallOut("forceEndWar");
    this.callOut(this.secondsToFrames(this.m_ForceEndTime), "forceEndWar", this.forceEndWar.bind(this));
    this.m_atkObjIDs = null;
    this.m_curAtkIdx = null;
    this.startTeam(defines.TEAM_LEFT);
    this.startTeam(defines.TEAM_RIGHT);

    this.beginNextAtk();

    this.setAddEnergyTimer(defines.TEAM_LEFT);
    this.m_Energy[defines.TEAM_LEFT] = this.worldIdx() === 5 ? 30 : 0;
    this.onEnergyChanged(defines.TEAM_LEFT);

    if ([10, 99].indexOf(this.worldIdx()) !== -1) {
      this.beginRightTeamEnergy();
    }
    this.m_Listener.on("onStartTeams", {
      beginTime: this.getBeginTime(),
      duration: this.getForceEndTime(),
    });
  }
  stopWar(dOption) {
    if (this.isWarEnd()) {
      return;
    }
    dOption = dOption || {};
    if (this.isReplayMode()) {
      this.setWarResult(dOption.result || this.getRelayResult() || defines.WarDraw);
      this.m_forceStopWar = true;
      return;
    }
    if (!this.canStop()) {
      return;
    }
    if (dOption.isDefender) {
      // 防守方认输，进攻方胜利了
      this.setWarResult(defines.WarWin);
      this.recordClientOp(defines.ClientOp.stopWar, defines.WarWin);
      return;
    }
    this.setWarResult(defines.WarFail);
    this.recordClientOp(defines.ClientOp.stopWar, defines.WarFail);
  }
  calRoundAtkSequence() {
    let pairs = []; // [objID, v];
    // 重新计算出手顺序
    this.eachUnitDo((unit) => {
      let v = unit.getAttr("Dodge");
      v = this.randomInt(Math.round(v * 0.9), Math.round(v * 1.1));
      pairs.push([unit.objID(), v]);
    });
    pairs = _u.sortBy(pairs, (pair) => {
      return pair[1];
    });
    const objIDs = [];
    for (let i = pairs.length - 1; i >= 0; i--) {
      objIDs.push(pairs[i][0]);
    }
    this.m_atkObjIDs = objIDs;
    this.m_curAtkIdx = 0;
    this.m_Round += 1;
  }
  beginNextAtk() {
    const unit = this.getNextAtkUnit();
    let t = 1;// default
    if (unit) {
      t = unit.getAtkFinishTime();
      unit.preAttack(t);
    }
    this.removeCallOut("beginNextAtk");
    this.callOut(this.secondsToFrames(t), "beginNextAtk", this.beginNextAtk.bind(this));
  }
  getNextAtkUnit() {
    if (this.m_curAtkIdx == null || this.m_curAtkIdx === this.m_atkObjIDs.length) {
      this.calRoundAtkSequence();
    }
    let reinsertObjIDs = null;// 2017-8-31 reinsertObjIDs
    for (; this.m_curAtkIdx < this.m_atkObjIDs.length;) {
      const objID = this.m_atkObjIDs[this.m_curAtkIdx];
      this.m_curAtkIdx += 1;
      const unit = this.getUnitByObjID(objID);
      if (!unit) {
        continue;
      }
      // 如果下一个unit正在放技能，需要补回他的普攻
      if (unit.m_ActiveSkillObj) {
        reinsertObjIDs = reinsertObjIDs || [];
        reinsertObjIDs.push(objID); // 先进先出
        continue;
      }
      if (!unit.validNormalAtk()) {
        if (unit.isInControlState()) {
          unit.onAttackFinish("control");
        }
        continue;
      }
      this.doReinsert(reinsertObjIDs);
      return unit;
    }
    this.doReinsert(reinsertObjIDs);
    return null;
  }
  doReinsert(reinsertObjIDs) {
    if (reinsertObjIDs) {
      if (this.m_curAtkIdx === this.m_atkObjIDs.length) {
        // 这个可以普攻的unit已经是这个回合最后一个人了，那么把reinsertObjIDs放到下个回合的第二个位置
        this.calRoundAtkSequence();
      } else {
        // 不是当前回合的最后一个人，把reinsertObjIDs插入到当前的atkObjIDs下下个位置
      }
      // this.m_curAtkIdx现在指向了下一个人，那么下下个位置就是this.m_curAtkIdx + 1
      // this.wlog("reinsertObjIDs", reinsertObjIDs);
      // this.wlog("this.m_atkObjIDs", this.m_atkObjIDs, "m_curAtkIdx", this.m_curAtkIdx);
      this.m_atkObjIDs.splice(this.m_curAtkIdx + 1, 0, ...reinsertObjIDs);
      // this.wlog("after splice this.m_atkObjIDs", this.m_atkObjIDs);
    }
  }
  beginRightTeamEnergy() {
    this.setAddEnergyTimer(defines.TEAM_RIGHT);
    this.m_Energy[defines.TEAM_RIGHT] = 0;
    this.onEnergyChanged(defines.TEAM_RIGHT);
  }
  showLeaveBtn() {
    const lstActions = [
      [defines.Action.ShowLeaveBtn, {}],
    ];
    this.m_Listener.on("onAction", {
      actions: lstActions,
    });
  }
  wlog(...args) {
    if (!this.m_EnabledLog) {
      return;
    }
    const shortID = this.getShortID();
    const _args = _u.toArray(args);
    _args.unshift(`[${shortID}]`);
    if (mbgGame.bsmgr) {
      mbgGame.bsmgr.logInfo(..._args);
    } else {
      console.log(..._args);
    }
  }
  wlogErr(...args) {
    const shortID = this.getShortID();
    const _args = _u.toArray(args);
    _args.unshift(`[${shortID}]`);
    if (mbgGame.bsmgr) {
      mbgGame.bsmgr.logError(..._args);
    } else {
      console.log(..._args);
    }
  }
  wlogErrNoStack(...args) {
    const shortID = this.getShortID();
    const _args = _u.toArray(args);
    _args.unshift(`[${shortID}]`);
    if (mbgGame.bsmgr) {
      mbgGame.bsmgr.logErrorNoStack(..._args);
    } else {
      console.log(..._args);
    }
  }
  // 策划用的
  debuglog(...args) {
    if (this.m_Debug) {

      /*
      var pobj = this.pobj();
      var lst = [];
      for (var i = 0; i < arguments.length; i++) {
          var v = arguments[i];
          if (typeof(v) == "object")
              lst.push(JSON.stringify(v));
          else
              lst.push(v);
      }
      pobj.onWarInfo(this.getWarID(), lst);
      */
      if (this.m_EnabledLog) {
        this.wlog(...args);
      }
    }
  }
  isDebug() {
    return this.m_Debug;
  }
  setDebug(b) {
    this.m_Debug = b;
  }
  enableLog() {
    this.m_EnabledLog = true;
  }
  disableLog() {
    this.m_EnabledLog = false;
  }
  frames() {
    return this.m_Frame;
  }
  costTime() {
    const costFrames = Math.max(0, this.m_Frame);
    return Math.round(costFrames * mbgGame.config.constTable.war_interval);
  }
  getHashInfo() {
    const dHashInfo = {
      units: [],
    };
    this.eachUnitDo((unit) => {
      dHashInfo.units.push(unit.hashInfo());
    });
    return JSON.stringify(dHashInfo);
  }
  calFrameMD5() {
    const info = this.getHashInfo();
    const strMD5 = crypto.createHash('md5').update(info, 'utf8').digest('hex');
    return [info, strMD5];
  }
  chooseRandomTarget(who, dOption) {
    if (!dOption) {
      dOption = {};
    }
    let iTeam = who.enemyTeam();
    if (dOption.team) {
      iTeam = dOption.team;
    }
    let units = this.getAliveUnitsByTeam(iTeam);
    const iExcludeID = dOption.exclude;
    if (iExcludeID) {
      const excludeUnit = this.getUnitByObjID(iExcludeID, iTeam);
      units = _u.without(units, excludeUnit);
    }

    if (dOption.filter) {
      const func = dOption.filter;
      const self = this;
      units = _u.filter(units, (unit) => {
        return func.call(self, unit);
      });
    }
    const dObjID2Weight = {};
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      dObjID2Weight[unit.objID()] = unit.getAttr("BeAtkW");
    }
    this.isDebug() && this.debuglog(who.name(), "选择目标，权重表：", dObjID2Weight);
    if (_u.isEmpty(dObjID2Weight)) {
      return null;
    }
    assert(this.getRNG().quick);
    const objID = defines.chooseOne(dObjID2Weight, this.getRNG().quick);
    const tobj = this.m_UnitDict[objID];
    return tobj;
  }
  getUnitByObjID(objID, iTeam) {
    let units = null;
    if (iTeam == null) {
      units = _u.values(this.m_UnitDict);
    } else {
      units = this.getUnitsList(iTeam);
    }
    if (!units) {
      return null;
    }
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.objID() === objID) {
        return unit;
      }
    }
    return null;
  }
  getUnitByID(iTeam, iID) {
    if (!iID) {
      return null;
    }
    const units = this.getUnitsList(iTeam);
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.ID() === iID) {
        return unit;
      }
    }
    return null;
  }

  /*
  dOption = {
    num:
  }
  */
  getUnitByCond(who, sType, dOption) {
    if (!dOption) {
      dOption = {};
    }
    let tobjs = null;
    if (sType === "自己") {
      tobjs = [who];
    } else if (sType === "敌方") {
      const tobj = this.chooseRandomTarget(who, dOption);
      if (tobj) {
        tobjs = [tobj];
      }
    } else if (sType === "多个我方") {
      tobjs = this.getAliveUnitsByTeam(who.team(), dOption);
    } else if (sType === "多个敌方") {
      tobjs = this.getAliveUnitsByTeam(who.enemyTeam(), dOption);
    } else if (sType === "我方全体") {
      tobjs = this.getAliveUnitsByTeam(who.team());
    } else if (sType === "敌方全体") {
      tobjs = this.getAliveUnitsByTeam(who.enemyTeam());
    } else if (sType === "已挂我方全体") {
      tobjs = this.getDeadUnitsByTeam(who.team());
      tobjs = this.doSortUnits(tobjs, dOption);
      const num = (dOption && dOption.num && Math.round(dOption.num)) || null;
      if (num) {
        tobjs = _u.last(tobjs, num);
      }
    } else if (sType === "真的我方全体") {
      tobjs = this.getUnitsList(who.team());
      tobjs = this.doSortUnits(tobjs, dOption);
      const num = (dOption && dOption.num && Math.round(dOption.num)) || null;
      if (num) {
        tobjs = _u.last(tobjs, num);
      }
    }
    if (tobjs && dOption.exclude) {
      if (dOption.exclude === "自己") {
        tobjs = _u.without(tobjs, who);
      } else if (dOption.exclude === "当前目标") {
        if (dOption.tobj) {
          tobjs = _u.without(tobjs, dOption.tobj);
        }
      }
    }
    return tobjs;
  }
  shuffleArray(obj) {
    // copy from underscore.js
    const sample = _u.clone(obj);
    const length = sample.length;
    const n = Math.max(Math.min(Infinity, length), 0);
    const last = length - 1;
    for (let index = 0; index < n; index++) {
      const rand = this.randomInt(index, last);
      const temp = sample[index];
      sample[index] = sample[rand];
      sample[rand] = temp;
    }
    return sample.slice(0, n);
  }
  doSortUnits(tobjs, dOption) {
    // 排序
    if (!_u.isEmpty(tobjs) && dOption && dOption.sort) {
      if (dOption.sort === "乱序") {
        tobjs = this.shuffleArray(tobjs);
      } else if (dOption.sort === "HP百分比降序") {
        tobjs = _u.sortBy(tobjs, (tobj) => { // function的返回值越大，就越后
          return tobj.hp() / tobj.maxHp();
        });
        tobjs = tobjs.reverse();
      } else if (dOption.sort === "HP百分比升序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.hp() / tobj.maxHp();
        });
      } else if (dOption.sort === "HP降序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.hp();
        });
        tobjs = tobjs.reverse();
      } else if (dOption.sort === "HP升序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.hp();
        });
      } else if (dOption.sort === "位置降序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.posIdx();
        });
        tobjs = tobjs.reverse();
      } else if (dOption.sort === "位置升序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.posIdx();
        });
      } else if (dOption.sort === "主动技能剩余CD降序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.getLeftActiveSkillCD();
        });
        tobjs = tobjs.reverse();
      } else if (dOption.sort === "主动技能剩余CD升序") {
        tobjs = _u.sortBy(tobjs, (tobj) => {
          return tobj.getLeftActiveSkillCD();
        });
      }
    }
    return tobjs;
  }
  getUnitsList(iTeam) {
    const dUnit = this.m_UnitsByTeam[iTeam];
    const units = _u.values(dUnit);
    return units;
  }
  getUnitIDList(iTeam) {
    const dUnit = this.m_UnitsByTeam[iTeam];
    const units = _u.values(dUnit);
    const unitIDs = [];
    _u.each(units, (unit) => {
      unitIDs.push(unit.ID());
    });
    return unitIDs;
  }
  hasDeadUnit(iTeam) {
    const units = this.getDeadUnitsByTeam(iTeam);
    if (units && units.length > 0) {
      return true;
    }
    return false;
  }
  getAliveUnitsByTeam(iTeam, dOption) {
    let allunits = this.getUnitsList(iTeam);
    allunits = _u.filter(allunits, (unit) => {
      if (!unit.isDie()) {
        return true;
      }
      return false;
    });
    if (allunits.length === 0) {
      return [];
    }
    allunits = this.doSortUnits(allunits, dOption);
    let units = [];
    const num = (dOption && dOption.num && Math.round(dOption.num)) || null;
    if (dOption && dOption.putBack) {
      assert(num != null);
      for (let i = 0; i < num; i++) {
        const idx = this.randomInt(0, allunits.length - 1);
        const unit = allunits[idx];
        units.push(unit);
      }
    } else if (num) {
      units = _u.last(allunits, num);
    } else {
      units = allunits;
    }
    return units;
  }
  getDeadUnitsByTeam(iTeam) {
    let units = this.getUnitsList(iTeam);
    units = _u.filter(units, (unit) => {
      if (unit.isDie()) {
        return true;
      }
      return false;
    });
    return units;
  }
  hasAliveUnit(iTeam) {
    let hasAliveUnit = false;
    _u.each(this.m_UnitsByTeam[iTeam], (unit) => {
      if (!unit.isDie() || unit.hasCallOut("delayRevive")) {
        hasAliveUnit = true;
      }
    });
    return hasAliveUnit;
  }
  checkWarLose() {
    const hasAliveUnit = this.hasAliveUnit(defines.TEAM_LEFT);
    if (hasAliveUnit) {
      return false;
    }
    return true;
  }
  checkWarWin() {
    const hasAliveUnit = this.hasAliveUnit(defines.TEAM_RIGHT);
    if (hasAliveUnit) {
      return false;
    }
    return true;
  }
  isUnitRemoved(objID) {
    return this.m_RemovedUnit && this.m_RemovedUnit[objID] === 1;
  }
  broadcastEvent(sEvent, dData, iTeam) {
    const self = this;
    this.eachUnitDo((unit) => {
      if (self.isUnitRemoved(unit.ID())) {
        return;
      }
      unit.trigger(sEvent, dData);
    },
      iTeam);
  }
  startTeam(iTeam) {
    const units = this.getAliveUnitsByTeam(iTeam);
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      unit.start();
    }
  }
  getTeamInfo(iTeam) {
    const dTeamData = {};
    const units = this.getUnitsList(iTeam);
    if (!units || _u.isEmpty(units)) {
      return dTeamData;
    }
    for (let idx = 0; idx < units.length; idx++) {
      const unit = units[idx];
      dTeamData[unit.objID()] = unit.packWarInfo();
    }
    return dTeamData;
  }
  getHpInfo(iTeam) {
    const dInfo = {};
    const units = this.getUnitsList(iTeam);
    if (!units || _u.isEmpty(units)) {
      return dInfo;
    }
    for (let idx = 0; idx < units.length; idx++) {
      const unit = units[idx];
      dInfo[unit.ID()] = {
        hp: unit.hp(),
        maxHp: unit.maxHp(),
      };
    }
    return dInfo;
  }
  // 外部调用接口
  trigger(sEvent, dData) {
    // this.wlog("[war trigger] begin", sEvent);
    if (sEvent === "使用技能") {
      let err;
      const unit = this.getUnitByID(dData.team, dData.ID);
      if (!unit) {
        err = mbgGame.config.ErrCode.UseSkill_NoUnitObj;
      } else {
        err = unit.useSkill(dData.skillID, {
          free: dData.free,
        });
      }
      this.m_Listener.on("onAfterUseSkill", {
        unit,
        skillID: dData.skillID,
        err,
      });
      dData.err = err;
    }
    // this.wlog("[war trigger] end", sEvent);
  }
  setDamTimes(iTeam, iTimes) {
    if (iTimes !== 1) {
      if (!this.m_DamTimes) {
        this.m_DamTimes = {}; // {team:times}
      }
      this.m_DamTimes[iTeam] = iTimes;
    } else {
      delete this.m_DamTimes[iTeam];
    }
  }
  getDamTimes(who) {
    const iTeam = who.team();
    return (this.m_DamTimes && this.m_DamTimes[iTeam]) || 1;
  }
  secondsToFrames(t) {
    return Math.ceil(t / mbgGame.config.constTable.war_interval);
  }
  framesToSeconds(f) {
    return f * mbgGame.config.constTable.war_interval;
  }
  reviveUnit(iTeam, iCharaID) {
    const unit = this.getUnitByID(iTeam, iCharaID);
    if (!unit) {
      return;
    }
    unit.onRevive(null, "GS");
  }

  // //////////////////////////////////////////////////////////////////
  // 全局特殊效果：自动放技能
  // //////////////////////////////////////////////////////////////////
  beginAutoUseSkill(iTeam, t) {
    // this.wlog('[beginAutoUseSkill]', iTeam, t);
    if (t <= 0) {
      this.wlogErr('[beginAutoUseSkill]', t);
      return;
    }
    if (!this.m_AutoUseSkillInterval) {
      this.m_AutoUseSkillInterval = {};
    }
    if (!this.m_AutoUseSkillInterval[iTeam]) {
      this.m_AutoUseSkillInterval[iTeam] = t;
      this.autoUseSkill(iTeam);
    } else if (this.m_AutoUseSkillInterval[iTeam] > t) {
      this.m_AutoUseSkillInterval[iTeam] = t;
      this.autoUseSkill(iTeam);
    }
  }
  autoUseSkill(iTeam) {
    this.removeCallOut(`autoUseSkill${iTeam}`);
    this.callOut(this.secondsToFrames(this.m_AutoUseSkillInterval[iTeam]),
      `autoUseSkill${iTeam}`, this.autoUseSkill_real.bind(this, iTeam));
  }
  autoUseSkill_real(iTeam) {
    let bUseKill = false;
    if (!this.isWarEnd() && this.hasAliveUnit(iTeam)) {
      const charaIDs = this.shuffleArray(this.getCharaIDs(iTeam));
      for (let i = 0; i < charaIDs.length; i++) {
        const charaID = charaIDs[i];
        const unit = this.getUnitByID(iTeam, charaID);
        if (!unit) {
          continue;
        }
        const iSkillID = defines.getCharaActiveSkillID(charaID);
        const err = unit.validUseSkill(iSkillID);
        if (err) {
          continue;
        }
        this.trigger("使用技能", {
          team: iTeam,
          ID: charaID,
          skillID: iSkillID,
          free: true,
        });
        bUseKill = true;
        break;
      }
    }
    this.removeCallOut(`useSkill${iTeam}`);
    if (!bUseKill) {
      this.callOut(this.secondsToFrames(1), `useSkill${iTeam}`, this.autoUseSkill_real.bind(this, iTeam));
    } else {
      this.autoUseSkill(iTeam);
    }
  }
  stopAutoUseSkill(iTeam) {
    this.removeCallOut(`useSkill${iTeam}`);
    this.removeCallOut(`autoUseSkill${iTeam}`);
  }
  // //////////////////////////////////////////////////////////////////
  // 全局特殊效果：自动杀怪 PVE才用到
  // //////////////////////////////////////////////////////////////////
  beginAutoKillMonster(t) {
    if (!this.isPVE()) {
      return;
    }
    if (t <= 0) {
      this.wlogErr("beginAutoKillMonster", t);
      return;
    }
    if (t >= this.m_AutoKillInterval) {
      return;
    }
    this.m_AutoKillInterval = t;
    this.autoKillMonster();
  }
  resetAutoKillMonster() {
    if (!this.m_AutoKillInterval) {
      return;
    }
    this.autoKillMonster();
  }
  autoKillMonster() {
    this.removeCallOut("killMonster");
    this.removeCallOut("autoKillMonster");
    this.callOut(this.secondsToFrames(this.m_AutoKillInterval), "autoKillMonster", this.killMonster.bind(this));
  }
  // 杀一只怪，如果杀不成功，则延后一秒再尝试，直到成功杀死一只怪
  killMonster() {
    let bKill = false;
    if (!this.isWarEnd() && this.hasAliveUnit(defines.TEAM_LEFT) && this.m_TeamStarted) {
      let tobj = false;
      this.eachUnitDo((unit) => {
        if (unit.mType() === 2 && !unit.isDie()) {
          tobj = unit;
        }
      }, defines.TEAM_RIGHT);
      if (tobj) {
        const atker = null;
        const hittype = defines.HitType.AutoKill;
        tobj.damage(999999, atker, hittype);
        bKill = true;
      }
    }
    this.removeCallOut("killMonster");
    if (!bKill) {
      this.callOut(this.secondsToFrames(1), "killMonster", this.killMonster.bind(this));
    } else {
      this.autoKillMonster();
    }
  }
  stopAutoKillMonster() {
    this.removeCallOut("autoKillMonster");
    this.removeCallOut("killMonster");
  }
  startHeartbeat() {
    this.removeCallOut("heartbeat");
    this.callOut(this.secondsToFrames(10), "heartbeat", this.onHeartbeat.bind(this));
  }
  onHeartbeat() {
    this.m_HeartbeatCount = (this.m_HeartbeatCount || 0) + 1;
    if (this.m_HeartbeatCount > 2) {
      this.removeCallOut("heartbeat");
      this.setSendWarEvent(false);
    }
  }
  onHeartbeatCB() {
    this.m_HeartbeatCount = 0;
  }
}

module.exports = CWar;