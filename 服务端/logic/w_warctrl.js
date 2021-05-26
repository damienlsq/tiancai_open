const token = require('token');
const PriorityQueue = require("updatable-priority-queue");
const defines = require('./w_defines');
const warinit = require('./w_warinit');
const CWarListener = require('./listener').CWarListener;
const CPVEListener = require('./pve_listener');
const CPVPListener = require('./pvp_listener');
const CSimulateListener = require('./simulate_listener');
const CAssureListener = require('./assure_listener');
const _u = require('./underscore');

token.defaults.secret = 'tiancaimbg';
token.defaults.timeStep = 24 * 60 * 60; // 24h in seconds

const clientCmds = {
  useSkill: 1,
  info: 1,
  ready: 1,
  stopWar: 1,
  setBotting: 1,
  sendEmote: 1,
  resumeWar: 1,
  sync: 1,
  report: 1,
};

const clientWarModeCmds = {
  sync: 1,
  report: 1,
};


const onProcessTickTimeout = function() {

  /*
  const t1 = mbgGame.warCtrl.m_t1 || [0, 0];
  const t2 = process.hrtime();
  mbgGame.warCtrl.logInfo(`block:${((t2[0] - t1[0]) * 1000) + Math.round(((t2[1] - t1[1]) * 1e-6))}ms`);
  */
  mbgGame.warCtrl.onUpdateWar();
};


// 管理BS所有战斗
class WarCtrl {
  constructor() {
    this.m_WarIDCount = 0;
    this.m_WarObjCount = 0;
    this.m_Updating = false;
    this.m_WarObjDict = {}; // {wID:oWar}
    this.m_WarQueue = new PriorityQueue();
    this.m_TimerOwnerID = mbgGame.common.timer.timerMgr.newOwnerID();
  }
  logInfo(...args) {
    if (mbgGame.bsmgr) {
      mbgGame.bsmgr.logInfo(...args);
    } else {
      console.log(...args);
    }
  }
  logError(...args) {
    if (mbgGame.bsmgr) {
      mbgGame.bsmgr.logError(...args);
    } else {
      console.log(...args);
    }
  }
  isClientCmd(funcName) {
    return clientCmds[funcName] === 1;
  }
  generateToken(k) {
    let sToken = token.generate(k);
    sToken = sToken.substr(0, 3) + sToken.substr(-5, 3);
    return sToken;
  }
  getNewWarObjID() {
    if (this.m_WarIDCount > 10000) {
      // 超过1W，开始复用被回收的ID
      if (this.m_RecycleIDs && this.m_RecycleIDs.length > 0) {
        const wID = this.m_RecycleIDs.shift();
        return wID;
      }
    }
    if (!this.m_WarIDCount) {
      this.m_WarIDCount = 0;
    }
    this.m_WarIDCount += 1;
    return this.m_WarIDCount;
  }
  // 回收ID
  recycleWarObjID(wID) {
    if (!this.m_RecycleIDs) {
      this.m_RecycleIDs = [];
    }
    this.m_RecycleIDs.push(wID);
  }
  createListener(lt) {
    if (lt === "PVE") {
      return new CPVEListener();
    }
    if (lt === "PVP") {
      return new CPVPListener();
    }
    if (lt === "WheelWar") {
      return new CWheelWarListener();
    }
    if (lt === "Sim") {
      return new CSimulateListener();
    }
    if (lt === "Assure") {
      return new CAssureListener();
    }
    return new CWarListener();
  }
  getWarObj(wID) {
    return this.m_WarObjDict[wID];
  }
  resetWarCtrl() {
    this.releaseAllWars();
    this.m_WarIDCount = 0;
    this.m_WarObjCount = 0;
    this.m_WarObjDict = {};
    mbgGame.common.timer.timerMgr.removeAllCallOutByOwner(this);
  }
  releaseAllWars() {
    this.logInfo("releaseAllWars");
    const wIDs = _u.keys(this.m_WarObjDict);
    for (let i = 0, len = wIDs.length; i < len; i++) {
      const wID = parseInt(wIDs[i]);
      this.releaseWar(wID, "all");
    }
  }
  createWar(uuid, dData) {
    if (!dData.replay) {
      dData.token = this.generateToken(uuid);
      if (dData.worldIdx === 99) {
        dData.targetToken = this.generateToken(`${uuid}denfeder`);
      }
    }
    dData.seed = dData.seed || defines.newSeed();
    dData.ct = moment().valueOf();
    const listener = this.createListener(dData.lt);
    const wID = this.getNewWarObjID();
    const oWar = warinit.createWarByData(dData, wID, listener);
    oWar.setUUID(uuid);
    listener.setWar(oWar);
    // 执行到这里还没报错，引用这个oWar
    this.m_WarObjDict[wID] = oWar;
    this.m_WarObjCount += 1;
    this.m_WarQueue.insert(wID, 0); // 刚创建时优先级最高
    mbgGame.bsmgr.setBusyLv(this.m_WarObjCount);
    if (dData.cwar) {
      oWar.setSendWarEvent(false);
      oWar.pauseSimulate();
      this.sendWarData(oWar);
      oWar.wlog("client war! wID", wID);
    } else {
      oWar.setSendWarEvent(dData.send);
      if (dData.sendInit) {
        this.sendWarState(oWar);
      }
    }
    // fs.writeFile("w.js", `const dData = JSON.parse(\`${JSON.stringify(oWar.m_WarAllData)}\`); module.exports = dData;`);
    return oWar;
  }
  beginWarFromGS(dData) {
    const oWar = this.m_WarObjDict[dData.wID];
    oWar.wlog("beginWarFromGS");
    if (!oWar) {
      this.logError("beginWarFromGS, no oWar, wID:", dData.wID);
      return;
    }
    warinit.autoSetWarAttr(oWar, dData);
    if (dData.sendInit) {
      this.sendWarState(oWar);
    }
    if (oWar.isPVP()) {
      if (dData.realtime) {
        const [host, FSId, cid] = dData.defenderFwdPair;
        oWar.beginRealTimePVP(host, FSId, cid);
        const isDefender = true;
        this.sendWarState(oWar, { isDefender });
      }
    }
    oWar.onBegin();
    oWar.wlog("isClientWar", oWar.isClientWar(), oWar.worldIdx());
    if (!this.m_Updating) {
      this.startAllWarUpdate();
    }
  }
  pauseWar(wID) {
    const oWar = this.m_WarObjDict[wID];
    if (!oWar) {
      return;
    }
    oWar.pauseSimulate();
  }

  releaseWar(wID, tag) {
    const oWar = this.m_WarObjDict[wID];
    if (!oWar) {
      return;
    }
    delete this.m_WarObjDict[wID];
    this.recycleWarObjID(wID);
    oWar.m_Listener.release();
    oWar.release();
    if (_u.isEmpty(this.m_WarObjDict)) {
      this.stopAllWarUpdate(`no war tag${tag}`);
    }
    this.m_WarObjCount -= 1;
    this.m_WarQueue.peek();
    this.logInfo(`releaseWar, wID:${wID}, tag:${tag}`);
  }
  startAllWarUpdate() {
    this.logInfo("[startAllWarUpdate]");
    this.m_Updating = true;
    Error.stackTraceLimit = Infinity;
    // process.next(onProcessTickTimeout);
    setImmediate(onProcessTickTimeout);
  }
  isWarUpdating() {
    return this.m_Updating;
  }
  stopAllWarUpdate(reason) {
    if (!this.m_Updating) {
      return;
    }
    this.logInfo("[stopAllWarUpdate] reason", reason);
    this.m_Updating = false;
  }
  /* 战斗迭代1帧
  备忘：
      要点1: BS是计算密集型，所以forwarder轮询应该为0毫秒，把cpu时间全部用来计算战斗
      要点2: onUpdateWar每次只算一场战斗（可能可以改成1-3场），要保证在计算战斗的时候不能影响socket通信
      要点3: 因为forward轮询设为0毫秒了，所以cpu会变高，正常现象
  */
  onUpdateWar() {
    // process.next(onProcessTickTimeout);
    if (!this.m_Updating) {
      // setImmediate(onProcessTickTimeout);
      return;
    }
    const now = new Date().getTime();
    if (!this.m_interval) {
      this.m_interval = mbgGame.config.constTable.war_interval * 1000;
    }

    let dData = this.m_WarQueue.peek();
    if (!dData) {
      return;
    }
    let wID = dData.item;
    let timestamp = dData.key;
    let nextTime = timestamp + this.m_interval - now;
    if (nextTime <= 0) {
      for (let i = 0; i < mbgGame.FSServerIDs.length; i++) {
        const FSServerId = mbgGame.FSServerIDs[i];
        mbgGame.bsmgr.beginBatchSend2C(FSServerId);
      }
      let count = 0; // simulate计数 超过阈值就break
      while (nextTime <= 0) {
        const oWar = this.m_WarObjDict[wID];
        if (!oWar) {
          this.m_WarQueue.pop();
        } else {
          oWar.simulate();
          count += 1;
          this.m_WarQueue.updateKey(wID, now);
          if (count > 10) {
            break;
          }
        }
        dData = this.m_WarQueue.peek();
        if (!dData) {
          break;
        }
        wID = dData.item;
        timestamp = dData.key;
        nextTime = timestamp + this.m_interval - now;
      }
      // mbgGame.warCtrl.m_t1 = process.hrtime();
      for (let i = 0; i < mbgGame.FSServerIDs.length; i++) {
        const FSServerId = mbgGame.FSServerIDs[i];
        mbgGame.bsmgr.endBatchSend2C(FSServerId);
      }
      setImmediate(onProcessTickTimeout);
      return;
    }
    // 这里用timeout来做下一次
    setTimeout(onProcessTickTimeout, nextTime);
    // setImmediate(onProcessTickTimeout);
  }
  // 发送这场战斗的所有状态信息
  sendWarState(oWar, dOption) {
    dOption = dOption || {};
    const isDefender = dOption.isDefender;
    const dState = oWar.getState(isDefender);
    if (dOption.resume) {
      dState.resume = 1;
    }
    let fwdPair = null;
    let uuid = oWar.getUUID();
    if (oWar.isPVP() && isDefender) {
      uuid = oWar.getTargetUUID();
      fwdPair = oWar.getDefenderFwdPair();
    }
    mbgGame.bsmgr.send2C(uuid, 'we', {
      world: oWar.worldIdx(),
      frame: oWar.frames(),
      event: "Init",
      data: dState,
    }, fwdPair);
    // 再发送一些额外的状态包
    oWar.eachUnitDo((unit) => {
      unit.sendState();
    });
  }
  // Note：目前仅适用pve
  // 战斗初始化数据和操作数据
  sendWarData(oWar) {
    mbgGame.bsmgr.send2C(oWar.getUUID(), 'we', {
      world: oWar.worldIdx(),
      frame: oWar.frames(),
      event: "Reset",
      data: {
        v: defines.CodeVersion, // 代码版本号
        init: oWar.getWarInitData(),
        op: oWar.getOpListRecord(),
        fwdPair: mbgGame.bsmgr.getFSPair(),
      },
    });
  }
  // ///////////////////////////////////////////
  // /GS->BS的RPC接口
  // ///////////////////////////////////////////
  validCmd(oWar, funcName) {
    if (oWar.isClientWar()) {
      return clientWarModeCmds[funcName] === 1;
    }
    return true;
  }
  callWarFunc(type, isDefender, wID, funcName, args) {
    if (!_u.isArray(args)) {
      args = [args];
    }
    const dOption = {
      wID,
      isDefender,
    };
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      this.logError("[callWarFunc] no oWar:", dOption.wID, funcName, type);
      return;
    }
    args.unshift(dOption);
    const func = this[`on_${funcName}`];
    if (!func) {
      this.logError("[callWarFunc] no func:", funcName);
      return;
    }
    if (mbgGame.debuglog) {
      this.logInfo("[callWarFunc] type:", type, 'isDefender', isDefender, "func:", funcName, 'args:', args);
    }
    try {
      oWar.createActionPacket();
      func.apply(this, args);
      oWar.cleanAndSendAction();
    } catch (e) {
      this.logError("callWarFunc err:", funcName, args);
      this.logError(e);
    }
  }
  on_report(dOption, msg) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.wlogErr(`client report:${msg}`);
  }
  // Note: opList不能重复发
  on_sync(dOption, frame, opList, info, frameMD5) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar || !oWar.isClientWar()) {
      return;
    }
    oWar.resumeSimulate();
    oWar.setSyncFrame(frame, info, frameMD5);
    if (opList && opList.length > 0) {
      oWar.syncClientOp(opList);
    }
    oWar.wlog("sync", frame, JSON.stringify(opList));
  }
  on_ready(dOption, dData) {
    const oWar = this.m_WarObjDict[dOption.wID];
    this.logInfo("on_ready");
    if (!oWar) {
      return;
    }
    if (oWar.isReplayMode()) {
      return;
    }
    if (oWar.worldIdx() === 5 && dData && dData.pause === 1) {
      oWar.pauseSimulate();
      return;
    }
    oWar.resumeSimulate();
    const iTeam = oWar.transTeam(dOption.isDefender);
    if (oWar.clientReady(iTeam)) {
      this.logInfo("on_ready recordClientOp");
      oWar.recordClientOp(defines.ClientOp.ready, iTeam);
    }
  }
  // 战斗debug开关
  on_setWarDebug(dOption, enabled) {
    const oWar = this.m_WarObjDict[dOption.wID];
    oWar.setDebug(enabled);
  }
  on_pauseWar(dOption) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.pauseSimulate();
  }
  on_resumeWar(dOption) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.resumeWar();
    this.sendWarState(oWar, { resume: 1 });
  }
  on_joinPVP(dOption, host, FSId, cid) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.beginRealTimePVP(host, FSId, cid);
    const isDefender = true;
    this.sendWarState(oWar, { isDefender });
  }
  // 屏蔽客户端复活
  /*
  // 复活
  on_reviveUnit(dOption, iTeam, iID) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar || !oWar.isPVE()) {
      return;
    }
    oWar.reviveUnit(iTeam, iID);
  }
  */
  on_sendEmote(dOption, dData) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.sendEmote(oWar.transTeam(dOption.isDefender), dData.id);
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
      // this.logInfo("[warctrl.info] ", objID, unit.ID(), iTeam, unit.packWarInfo());
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
  on_recover(dOption, iTeam, type, nolabel) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    if (type === "full") {
      oWar.fullRecover(iTeam, nolabel);
    } else if (type === "half") {
      oWar.halfRecover(iTeam, nolabel);
    }
  }
  on_stopWar(dOption) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.stopWar(dOption);
  }
  on_setSendWarEvent(dOption, enabled) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.setSendWarEvent(enabled);
  }
  // 启动战斗心跳，心跳如果没有收到确认，就停止发送战斗事件
  on_startHeartbeat(dOption, enabled) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.startHeartbeat();
  }
  on_heartbeatCB(dOption, enabled) {
    const oWar = this.m_WarObjDict[dOption.wID];
    if (!oWar) {
      return;
    }
    oWar.onHeartbeatCB();
  }
}


module.exports = WarCtrl;