const defines = require('./w_defines');
const assert = require('assert');
const diff = require('deep-diff').diff;

// 各种监听器

const WarEventCmd = 'we';

class CPlayerListener {
  CType() {
    return "CPlayerListener";
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
    }
  }
}


class CBaseListener {
  CType() {
    return "CBaseListener";
  }
  on() { }
  getCtrl() {
    return this.m_Ctrl;
  }
  setCtrl(ctrl) {
    this.m_Ctrl = ctrl;
  }
  release() { }
}


class CListener extends CBaseListener {
  CType() {
    return "CListener";
  }
  onServer(...args) {
    const funcName = args[0];
    args.shift();
    const func = this[funcName];
    if (func) {
      func.apply(this, args);
    } else {
      // mbgGame.bsmgr.logError("no such func", funcName);
    }
  }
  on(...args) {
    if (mbgGame.platform === "Server") {
      if (mbgGame.mode !== "debug") {
        return;
      }
      if (this.m_Ctrl) {
        this.m_Ctrl.on(...args);
      }
      return;
    }
    const funcName = args[0];
    args.shift();
    const func = this[funcName];
    if (func) {
      func.apply(this, ...args);
    } else {
      // mbgGame.bsmgr.logError("no such func", funcName);
    }
  }
}

class CWarListener extends CListener {
  CType() {
    return "CWarListener";
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
  send2GS(sEvent, dData) {
    const oWar = this.m_war;
    mbgGame.bsmgr && mbgGame.bsmgr.send2GS(oWar.getUUID(), oWar.worldIdx(), sEvent, {
      frame: oWar.frames(),
      data: dData,
    });
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
    if (uuid) {
      mbgGame.bsmgr.send2C(uuid, WarEventCmd, dEvent, fwdPair);
      return;
    }
    uuid = oWar.getUUID();
    if (oWar.isRealTimePVP()) {
      // 同样的协议包发多一份到对手
      mbgGame.bsmgr.send2C(uuid, WarEventCmd, dEvent);
      assert(oWar.getDefenderFwdPair());
      mbgGame.bsmgr.send2C(oWar.getTargetUUID(), WarEventCmd, dEvent, oWar.getDefenderFwdPair());
    } else if (oWar.canSendWarEvent(sEvent)) {
      mbgGame.bsmgr.send2C(uuid, WarEventCmd, dEvent);
    }
  }
  send2CByTeam(sEvent, dData) {
    const oWar = this.m_war;
    if (!oWar) {
      mbgGame.bsmgr.logError("[send2CByTeam] no oWar, sEvent:", sEvent);
      return;
    }
    if (oWar.isRealTimePVP()) {
      if (dData.team === defines.TEAM_LEFT) {
        this.send2C(sEvent, dData, oWar.getUUID());
      } else {
        assert(oWar.getDefenderFwdPair());
        this.send2C(sEvent, dData, oWar.getTargetUUID(), oWar.getDefenderFwdPair());
      }
    } else if (dData.team === defines.TEAM_LEFT) {
      this.send2C(sEvent, dData);
    }
  }
  // 所有战斗共通的事件
  onUpdateEnergy(dData) {
    this.send2CByTeam("UE", dData);
  }
  onStartTeams(dData) {
    this.send2C("StartTeams", dData);
  }
  onSetBotting(dData) {
    this.send2CByTeam("SetBotting", dData);
  }
  onWarBegin(dData) {
    this.send2GS("WarBegin", dData);
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
    this.send2GS("SaveBotting", dData);
  }
  onWarEnd(dData) {
    this.send2GS("WarEnd", dData);
    this.send2C("WarEnd", dData);
  }
  onSyncError(dData) {
    mbgGame.bsmgr.logInfo('onSyncError, differences:');
    const differences = diff(dData.sinfo, dData.cinfo);
    mbgGame.bsmgr.logInfo(differences);
    const oWar = this.m_war;
    if (!oWar || oWar.isWarEnd()) {
      return;
    }
    oWar.resumeWar();
    mbgGame.warCtrl.sendWarState(oWar, { resume: 1 });
  }
  onReplayError(dData) {
    mbgGame.bsmgr.logError('onReplayError');
    const differences = diff(dData.infoNow, dData.info);
    mbgGame.bsmgr.logError(differences);
  }
}

module.exports = {
  CPlayerListener,
  CBaseListener,
  CWarListener,
  CListener,
};