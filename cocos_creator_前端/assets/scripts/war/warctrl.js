
const CWar = require('w_war');
const w_warinit = require('w_warinit');
const timer = require('timer');
const defines = require('w_defines');

class CWarListener {
  CType() {
    return "CWarListener";
  }
  getCtrl() {
    return this.m_Ctrl;
  }
  setCtrl(ctrl) {
    this.m_Ctrl = ctrl;
  }
  on(...args) {
    const funcName = args[0];
    args.shift();
    const func = this[funcName];
    if (func) {
      func.apply(this, args);
    } else {
      //  mbgGame.bsmgr.logError("no such func", funcName);
    }
  }
  release() {
    this.m_war = null;
  }
  setWar(oWar) {
    this.m_war = oWar;
  }
  // 所有战斗共通的事件
  onUpdateEnergy(dData) {
    this.send2CByTeam("UE", dData);
  }
  onStartTeams(dData) {
    this.send2C("StartTeams", dData);
  }
  onHalt(dData) {
    this.send2C("Halt", dData);
  }
  onSetBotting(dData) {
    this.send2CByTeam("SetBotting", dData);
  }
  onWarBegin(dData) {
    mbgGame.log("onWarBegin");
    const oWar = this.m_war;
    mbgGame.warCtrl.onWarBegin(oWar.getWarID());
  }
  onDie(dData) {
    /* {
        unit:
    }*/
  }
  onAction(dData) {
    /* {
        actions: lstActions
    }*/
    this.send2C("AC", dData);
  }
  onShowDesc(dData) {
    this.send2C("ShowDesc", dData);
  }
  onAtkSpd(dData) {
    this.send2C("AtkSpd", dData);
  }
  onRefreshTeam(dData) {
    /* {
       team: iTeam
       data: oWar.getTeamInfo()
    }*/
    this.send2C("RefreshTeam", dData);
  }
  onUnitInfo(dData) {
    this.send2CByTeam("UnitInfo", dData);
  }
  onRevive(dData) {
    /* {
        unit:
    }*/
    this.send2C("Revive", dData);
  }
  onSaveBotting(dData) {
  }
  onReplayError(dData) {
    mbgGame.error('onReplayError', JSON.parse(dData.infoNow), JSON.parse(dData.info));
    mbgGame.managerUi.floatMessage("本次战斗结果与回放数据不一致！！！");
  }
  onWarEnd(dData) {
    const oWar = this.m_war;
    oWar.setPVEWarEndData(dData);
    // dData会发给服务端，先删掉多余信息
    delete dData.warData;
    delete dData.recorded;
    delete dData.opList;
    mbgGame.log("onWarEnd", dData);
    this.send2C("WarEnd", dData); // 只要是客户端战斗，就使用客户端战斗结果
    mbgGame.warCtrl.onWarEnd(oWar.getWarID());
  }
  onRecordOp(dData) {
    const oWar = this.m_war;
    mbgGame.log("onRecordOp", oWar.frames(), dData.op);
    mbgGame.warCtrl.onPushOp(dData.op);
  }
  send2C(sEvent, dData, uuid, fwdPair) {
    const oWar = this.m_war;
    // oWar.wlog("send2C", sEvent);
    if (!oWar) {
      mbgGame.bsmgr.logError("[send2C] no oWar", sEvent, dData, uuid);
      return;
    }
    if (dData.unit) {
      dData.objID = dData.unit.objID();
      delete dData.unit;
    }
    const dEvent = {
      world: oWar.worldIdx(),
      frame: oWar.frames(),
      event: sEvent,
      data: dData,
    };
    mbgGame.warMgr.warEvt().onWarEvent(dEvent);
  }
  send2CByTeam(sEvent, dData) {
    const oWar = this.m_war;
    if (!oWar) {
      mbgGame.bsmgr.logError("[send2CByTeam] no oWar, sEvent:", sEvent);
      return;
    }
    if (dData.team === defines.TEAM_LEFT) {
      this.send2C(sEvent, dData);
    }
  }
}


class CWarCtrl {
  constructor() {
    this.m_TimerOwnerID = timer.newOwnerID();
    this.m_WarIDCount = 0;
    this.m_Updating = false;
    this.m_WarObjDict = {}; // {wID:oWar}
  }
  release() {
    this.stopAllWarUpdate();
    const wIDs = [];
    for (const wID in this.m_WarObjDict) {
      wIDs.push(+wID);
    }
    for (let i = 0; i < wIDs.length; i++) {
      this.releaseWar(wIDs[i]);
    }
    delete this.m_WarIDCount;
    delete this.m_Updating;
    delete this.m_WarObjDict;
  }
  createWar(dData) {
    const wID = dData.wID;
    if (this.getWar(wID)) {
      this.releaseWar(wID, 'Same_wID');
    }
    delete dData.cwar; // 这个标记是给服务端用的
    const oWar = w_warinit.createWarByData(dData, wID, new CWarListener());
    oWar.enableLog();
    this.m_WarObjDict[wID] = oWar;
    mbgGame.log("[warCtrl] createWar wID", wID);
    this.startAllWarUpdate();
    return wID;
  }
  setReplaySpeed(x) {
    mbgGame.log("setReplaySpeed", x);
    for (const wID in this.m_WarObjDict) {
      const oWar = this.m_WarObjDict[wID];
      oWar.setFramesPerTick(x);
    }
  }
  getWar(wID) {
    return this.m_WarObjDict[wID];
  }
  begin(wID) {
    const oWar = this.m_WarObjDict[wID];
    mbgGame.log("[warCtrl] begin wID", wID);
    oWar.onBegin();
    if (!oWar.isReplayMode()) {
      if (oWar.clientReady(defines.TEAM_LEFT)) {
        oWar.recordClientOp(defines.ClientOp.ready, defines.TEAM_LEFT);
      }
    }
  }
  handleClientCall(wID, funcName, ...args) {
    const oWar = this.m_WarObjDict[wID];
    if (!oWar) {
      mbgGame.error("[warCtrl] no oWar, wID", wID);
      for (const _wID in this.m_WarObjDict) {
        mbgGame.log('_wID', _wID);
      }
      return;
    }
    oWar.createActionPacket();
    if (funcName === "ready") {
      this.begin(wID);
    }
    if (funcName === "useSkill") {
      this.on_useSkill({ wID }, ...args);
    }
    if (funcName === "setBotting") {
      this.on_setBotting({ wID }, ...args);
    }
    if (funcName === "info") {
      this.on_info({ wID }, ...args);
    }
    oWar.cleanAndSendAction();
  }
  on_useSkill(dOption, iID, iSkillID) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    if (oWar.isReplayMode()) {
      return;
    }
    const iTeam = oWar.transTeam(dOption.isDefender);
    const dTriggerData = {
      team: iTeam,
      ID: iID,
      skillID: iSkillID,
    };
    oWar.trigger("使用技能", dTriggerData);
    if (!dTriggerData.err) {
      // 施放成功
      oWar.recordClientOp(defines.ClientOp.useSkill, iTeam, iID, iSkillID);
    }
  }
  on_setBotting(dOption, dData) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    if (oWar.isReplayMode()) {
      return;
    }
    const iTeam = oWar.transTeam(dOption.isDefender);
    oWar.setBottingConfig(iTeam, dData);
    oWar.recordClientOp(defines.ClientOp.setBotting, iTeam, dData);
  }
  on_info(dOption, objID, iTeam) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    const unit = oWar.getUnitByObjID(+objID, +iTeam);
    if (unit) {
      oWar.m_Listener.on("onUnitInfo", {
        ID: unit.ID(),
        objID,
        team: oWar.transTeam(dOption.isDefender),
        info: unit.packWarInfo(),
      });
    } else {
      // this.logInfo("[warctrl.info] no such unit, ID", iID, "iTeam", iTeam);
    }
  }
  startAllWarUpdate() {
    if (this.m_Updating) {
      return;
    }
    this.m_Updating = true;
    const interval = mbgGame.config.constTable.war_interval;
    timer.removeCallOut(this, 'WarUpdate');
    timer.callOut(this, this.onUpdateWar.bind(this), {
      time: interval,
      flag: 'WarUpdate',
      forever: true,
    });
  }
  stopAllWarUpdate() {
    this.m_Updating = false;
    timer.removeCallOut(this, 'WarUpdate');
  }
  onUpdateWar() {
    if (!this.m_Updating) {
      return;
    }
    for (const wID in this.m_WarObjDict) {
      const oWar = this.m_WarObjDict[wID];
      try {
        oWar.simulate();
      } catch (e) {
        const warCom = this.getWarCom(wID);
        if (warCom) {
          warCom.callBSWarFuncReal("report", `${oWar.getHashInfo()}, stack:${e.stack}`);
        } else {
          mbgGame.error("onUpdateWar");
          mbgGame.log(e.stack);
        }
      }
    }
  }
  getWarCom(wID) {
    const oWar = this.m_WarObjDict[wID];
    if (!oWar) {
      return null;
    }
    const warCom = mbgGame.warMgr.getWarCom(oWar.worldIdx());
    return warCom;
  }
  onWarBegin(wID) {
    timer.removeCallOut(this, `SyncWar${wID}`);
    timer.callOut(this, () => {
      this.onSyncWar(wID);
    }, {
        time: 2,
        flag: `SyncWar${wID}`,
        forever: true,
      });
  }
  onWarEnd(wID) {
    this.onSyncWar(wID);
    // 不send2C通知客户端，让服务端发WarEnd
    // Fixme 延迟问题
    this.delayReleaseWar(wID, "end");
  }
  onSyncWar(wID) {
    const oWar = this.m_WarObjDict[wID];
    if (oWar.clientReplay()) {
      return;
    }
    const warCom = this.getWarCom(wID);
    let frame = oWar.frames();
    if (oWar.isWarEnd()) {
      frame += 1;
      timer.removeCallOut(this, `SyncWar${wID}`);
    }
    const [info, frameMD5] = oWar.calFrameMD5(); // debug only
    mbgGame.log("onSyncWar", frame, this.m_OplistTmp, frameMD5);
    warCom.callBSWarFuncReal("sync", frame, this.m_OplistTmp, info, frameMD5);
    this.m_OplistTmp = null;
  }
  onPushOp(op) {
    if (!this.m_OplistTmp) {
      this.m_OplistTmp = [];
    }
    this.m_OplistTmp.push(op);
  }
  releaseAllWars() {
    mbgGame.log("[warCtrl] releaseAllWars");
    const wIDs = _.keys(this.m_WarObjDict);
    _.each(wIDs, (wID) => {
      this.releaseWar(+wID, 'releaseAllWars');
    });
    this.stopAllWarUpdate();
  }
  releaseWarByWorldIdx(worldIdx) {
    for (const wID in this.m_WarObjDict) {
      const oWar = this.m_WarObjDict[wID];
      if (oWar.worldIdx() === worldIdx) {
        this.releaseWar(wID, 'releaseWarByWorldIdx');
      }
    }
  }
  releaseWar(wID, tag) {
    mbgGame.log("[warCtrl] releaseWar wID", wID, tag);
    const oWar = this.m_WarObjDict[wID];
    timer.removeCallOut(this, `SyncWar${wID}`);
    timer.removeCallOut(this, `DelayReleaseWar${wID}`);
    if (!oWar) {
      return;
    }
    delete this.m_WarObjDict[wID];
    oWar.m_Listener.release();
    oWar.release();
    if (_.isEmpty(this.m_WarObjDict)) {
      this.stopAllWarUpdate(`no war, tag: ${tag}`);
    }
  }
  delayReleaseWar(wID, tag) {
    timer.removeCallOut(this, `DelayReleaseWar${wID}`);
    timer.callOut(this, () => {
      this.releaseWar(wID, tag);
    }, {
        time: 6,
        flag: `DelayReleaseWar${wID}`,
        forever: false,
      });
  }
}

module.exports = CWarCtrl;