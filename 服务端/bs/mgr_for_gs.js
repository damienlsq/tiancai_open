const co = require('co');
const Cache = require('../gameserver/cache');
const cmdfunc = require('../gameserver/cmdfunc');
const defines = require('./bs_defines');
const w_defines = require('../logic/w_defines');


// GS用的
// 管理连到这个GS的所有BS
class BSMgr {
  constructor() {
    this.m_TimerOwnerID = mbgGame.common.timer.timerMgr.newOwnerID();
    // 记录每个BS的繁忙程度
    // 目前：繁忙程度 等于 该BS的war对象数量
    this.m_BSBusyLv = {
      // BSID: lv
    };
    this.m_BSPID = {
      // BSID: pid
    };
    this.m_BSHeader = {
      // BSID: {
      // sockID:
      // connectID:
      // }
    };
    this.m_Callbacks = {};
    this.m_BSHeartbeatDelay = {}; // 监控用
    this.m_BSHeartbeatCount = {
      // BSID: count
    };
    this.m_BSIDs = []; // 所有BSID列表，
    this.m_BSIDCount = 0;
    this.m_RecycleBSID = [];
    this.m_SortedBSIDs = {}; // 分组Idx:BSIDs
    this.m_PacketCount = 0; // 用来实现response， 超过x时重置为0
  }
  getGroupRange(BSNum, groupIdx) {
    if (groupIdx === 2) {
      return [0, 1]; // PVP暂时固定用第一个BS
    }
    const dGroup = defines.Group[BSNum];
    return dGroup && dGroup[groupIdx];
  }
  getBSIDBySockPair(sockID, connectID) {
    for (const BSID in this.m_BSHeader) {
      const dHeader = this.m_BSHeader[BSID];
      if (dHeader.sockID === sockID && dHeader.connectID === connectID) {
        return parseInt(BSID);
      }
    }
    return null;
  }
  hasWorkingBS() {
    return this.m_BSIDs.length > 0;
  }
  // 登记一个BS
  registerBS(sockID, connectID) {
    let BSID;
    if (this.m_RecycleBSID.length > 0) {
      BSID = this.m_RecycleBSID.pop();
    } else {
      this.m_BSIDCount += 1;
      BSID = this.m_BSIDCount;
    }
    this.m_BSHeader[BSID] = {
      sockID,
      connectID,
    };
    if (!this.m_BSBusyLv[BSID]) {
      this.m_BSBusyLv[BSID] = 0;
    }
    if (this.m_BSIDs.indexOf(BSID) === -1) {
      this.m_BSIDs.push(BSID);
    }
    this.sortBS();
    this.sendCmd(BSID, "setBSID", {
      BSID,
    });
    if (mbgGame.config_raw) {
      this.updateConfig(mbgGame.config_raw, mbgGame.i18n_raw, [BSID]);
    }
    this.startHeartbeat(BSID);

    const self = this;
    co(function* () {
      const dAllServerInfo = yield mbgGame.serverCtrl.getAllServerInfo();
      self.initFSConnection(dAllServerInfo, "register");
    }).catch((err, result) => {
      mbgGame.logger.info("[registerBS.initFSConnection] error ", err, result);
    });
    return BSID;
  }
  // 取消登记BS
  unregisterBS(BSID, reason) {
    mbgGame.logger.info("[unregisterBS]", BSID, "reason", reason);
    const dHeader = this.m_BSHeader[BSID];
    if (dHeader) {
      mbgGame.fwd.disconnectClient(mbgGame.GS2BSServerId, dHeader.connectID);
      delete this.m_BSHeader[BSID];
    }
    if (this.m_BSBusyLv[BSID] != null) {
      delete this.m_BSBusyLv[BSID];
    }
    if (this.m_BSHeartbeatDelay[BSID] != null) {
      delete this.m_BSHeartbeatDelay[BSID];
    }
    const idx = this.m_BSIDs.indexOf(BSID);
    if (idx !== -1) {
      this.m_BSIDs.splice(idx, 1);
    }
    if (this.m_BSHeartbeatCount[BSID] != null) {
      delete this.m_BSHeartbeatCount[BSID];
    }
    mbgGame.common.timer.timerMgr.removeCallOut(this, `BSHeartbeat${BSID}`);
    if (this.m_RecycleBSID.indexOf(BSID) === -1) {
      this.m_RecycleBSID.push(BSID);
    }
    this.sortBS();
    this.kickPlayersByBSID(BSID);
    if (this.m_UnregisterBSCB) {
      this.m_UnregisterBSCB();
    }
  }
  kickPlayersByBSID(BSID) {
    const self = this;
    co(function* () {
      const lst = self.getUUIDListByBSID(BSID);
      self.cleanUUIDListByBSID(BSID);
      for (let i = 0; i < lst.length; i++) {
        // 该BS断开后，把已经连接到这个BS的玩家T下线
        const uuid = lst[i];
        yield mbgGame.serverCtrl.kickUser(uuid, true, 'push_kick');
      }
    }).catch((err, result) => {
      mbgGame.logger.info("[kickPlayersByBSID] error ", err, result);
    });
  }
  setUnregisterBSCallBack(cb) {
    this.m_UnregisterBSCB = cb;
  }
  startHeartbeat(BSID) {
    mbgGame.common.timer.timerMgr.removeCallOut(this, `BSHeartbeat${BSID}`);
    mbgGame.common.timer.timerMgr.callOut(this, this.onHeartbeat.bind(this, BSID), {
      time: mbgGame.config.constTable.BSHeartbeat || 10,
      flag: `BSHeartbeat${BSID}`,
      forever: true,
    });
  }
  onHeartbeat(BSID) {
    if (!this.m_BSHeartbeatCount[BSID]) {
      this.m_BSHeartbeatCount[BSID] = 0;
    }
    // mbgGame.logger.info("onHeartbeat", BSID, this.m_BSHeartbeatCount[BSID]);
    if (this.m_BSHeartbeatCount[BSID] >= 2) {
      this.unregisterBS(BSID, "heartbeat");
      return;
    }
    this.m_BSHeartbeatCount[BSID] += 1;
    this.sendCmd(BSID, "heartbeat", {
      t_send: moment().valueOf(),
    });
  }
  // 更新该BS的负载情况
  updateBSBusyLv(BSID, lv) {
    this.m_BSBusyLv[BSID] = lv;
    if (this.m_UpdateCount == null) {
      this.m_UpdateCount = 0;
    }
    this.m_UpdateCount += 1;
    if (this.m_UpdateCount > 100) {
      this.m_UpdateCount = 0;
      this.sortBS();
    }
  }
  // 更新该BS的负载情况
  updateBSPID(BSID, pid) {
    this.m_BSPID[BSID] = pid;
  }
  getBSPID(BSID) {
    return this.m_BSPID[BSID] || 0;
  }
  // 根据BS的负载情况分组排序
  sortBS() {
    if (_.isEmpty(this.m_BSIDs)) {
      mbgGame.logger.info("sortBS no m_BSIDs", this.m_BSIDs);
      return;
    }
    const self = this;
    const sortFunc = function(BSID) {
      const num = self.m_BSBusyLv[BSID];
      return num;
    };
    this.m_BSIDs = _.sortBy(this.m_BSIDs, sortFunc);
    const BSnum = this.m_BSIDs.length;
    if (BSnum > 0) {
      for (let groupIdx = 0; groupIdx <= 2; groupIdx++) {
        const [start, groupNum] = this.getGroupRange(BSnum, groupIdx); // 这个分组应有几个BS
        const end = start + groupNum;
        const BSIDs = this.m_BSIDs.slice(start, end);
        this.m_SortedBSIDs[groupIdx] = BSIDs;
      }
    }
    mbgGame.logger.info("sortBS", this.m_SortedBSIDs, this.m_BSIDs);
  }
  getBSGroup(BSID) {
    for (let groupIdx in this.m_SortedBSIDs) {
      groupIdx = parseInt(groupIdx);
      const BSIDs = this.m_SortedBSIDs[groupIdx];
      if (BSIDs.indexOf(BSID) !== -1) {
        return groupIdx;
      }
    }
    return null;
  }
  getPID2Info() {
    const dInfo = {};
    for (let BSID in this.m_BSPID) {
      BSID = +BSID;
      const pid = this.m_BSPID[BSID];
      const delay = this.m_BSHeartbeatDelay[BSID];
      const lv = this.m_BSBusyLv[BSID];
      dInfo[pid] = `BSID:${BSID}, group:${this.getBSGroup(BSID)}, War:${lv}, Delay:${delay}ms`;
    }
    return dInfo;
  }
  getBusyInfo() {
    const lst = [];
    for (let BSID in this.m_BSBusyLv) {
      BSID = +BSID;
      const pid = this.getBSPID(BSID);
      lst.push(`BS[${BSID}-${pid}]:${this.m_BSBusyLv[BSID]} `);
    }
    const s = lst.join(", ");
    mbgGame.logger.info("[getBusyInfo]", s);
    return s;
  }
  getHeartbeatDelayInfo() {
    const lst = [];
    for (const BSID in this.m_BSHeartbeatDelay) {
      lst.push(`BS${BSID}:${this.m_BSHeartbeatDelay[BSID]}ms`);
    }
    const s = lst.join(", ");
    mbgGame.logger.info("[getHeartbeatDelayInfo]", s);
    return s;
  }
  // 返回当前负载最小的BS
  getIdleBSID(groupIdx) {
    return this.m_SortedBSIDs[groupIdx] && this.m_SortedBSIDs[groupIdx][0];
  }
  getBSHeader(BSID) {
    return this.m_BSHeader[BSID];
  }
  iSBSConnected(BSID) {
    return this.m_BSHeader[BSID] != null;
  }
  onResponse(BSID, packetIdx) {
    // mbgGame.logger.info("[BS] onResponse", BSID, packetIdx);
    if (this.m_Callbacks[packetIdx]) {
      const callback = this.m_Callbacks[packetIdx];
      delete this.m_Callbacks[packetIdx];
      callback();
    }
  }
  // 发包给BS
  sendCmd(BSID, cmd, dData, callback) {
    const dHeader = this.getBSHeader(BSID);
    if (!dHeader) {
      mbgGame.logger.info("[BSMgr] sendCmd no dHeader, BSID:", BSID, "cmd", cmd, "data", dData);
      return false;
    }
    let packetIdx;
    if (callback) {
      this.m_PacketCount += 1;
      packetIdx = this.m_PacketCount;
      if (this.m_PacketCount > 100000) {
        this.m_PacketCount = 0;
      }
      this.m_Callbacks[packetIdx] = callback;
      // mbgGame.logger.info("[BSMgr] add callback", packetIdx, cmd);
    }
    if (packetIdx) {
      dData._pIdx = packetIdx;
    }
    // mbgGame.logger.info("[BS] sendCmd sID", mbgGame.GS2BSServerId, "cID", dHeader.connectID, "cmd", cmd);
    cmdfunc.forwarderSendCmd(mbgGame.fwd, mbgGame.GS2BSServerId, dHeader.connectID, cmd, dData);
    return true;
  }
  // ///////////////////////////////////////////
  // /GS可以使用的接口
  // ///////////////////////////////////////////
  // 更新全局配置数据
  updateConfig(config, i18n, BSIDs) {
    // mbgGame.logger.info("[updateConfig]");
    if (!BSIDs) {
      BSIDs = this.m_BSIDs;
    }
    for (let i = 0; i < BSIDs.length; i++) {
      const BSID = BSIDs[i];
      this.sendCmd(BSID, "updateConfig", {
        config,
        i18n,
      });
    }
  }
  // 玩家上线，分配一个BS给他，并通知BS
  // 如果已经分配过BSID，就不需要重新分配
  playerOnline(pobj) {
    mbgGame.logger.info("[playerOnline]");
    if (!pobj.getBSID()) {
      const BSID = this.getIdleBSID(defines.Group_OnlinePVE);
      if (!BSID) {
        pobj.logError("[playerOnline] no BSID");
        return;
      }
      mbgGame.logger.info("bs.setBSID", BSID);
      pobj.setBSID(BSID);
    }
    this.sendCmd(pobj.getBSID(), "online", {
      uuid: pobj.getUUID(),
    });
  }
  getUUIDListByBSID(BSID) {
    return (this.m_BSID2UUIDs && this.m_BSID2UUIDs[BSID]) || [];
  }
  cleanUUIDListByBSID(BSID) {
    if (!this.m_BSID2UUIDs) {
      return;
    }
    if (this.m_BSID2UUIDs[BSID]) {
      delete this.m_BSID2UUIDs[BSID];
    }
  }
  onPlayerChangeBSID(pobj, BSID, oldBSID) {
    if (!this.m_BSID2UUIDs) {
      this.m_BSID2UUIDs = {};
    }
    const uuid = pobj.getUUID();
    if (this.m_BSID2UUIDs[oldBSID]) {
      const lst = this.m_BSID2UUIDs[oldBSID];
      const idx = lst.indexOf(uuid);
      if (idx !== -1) {
        lst.splice(idx, 1);
      }
    }
    if (!this.m_BSID2UUIDs[BSID]) {
      this.m_BSID2UUIDs[BSID] = [];
    }
    const lst = this.m_BSID2UUIDs[BSID];
    const idx = lst.indexOf(uuid);
    if (idx === -1) {
      lst.push(uuid);
    }
  }
  // 玩家客户端下线，通知BS
  playerOffline(pobj) {
    // mbgGame.logger.info("[playerOffline]");
    const BSID = pobj.getBSID();
    this.sendCmd(BSID, "offline", {
      uuid: pobj.getUUID(),
    });
  }
  // 玩家服务端下线，通知BS
  playerRelease(pobj) {
    // mbgGame.logger.info("[playerRelease]");
    const BSID = pobj.getBSID();
    this.sendCmd(BSID, "releasePlayer", {
      uuid: pobj.getUUID(),
    });
  }
  // 玩家服务端下线，通知BS清空该玩家的战斗
  playerRealOffline(pobj) {
    if (pobj.getBSID()) {
      this.sendCmd(pobj.getBSID(), "releasePlayer", {
        uuid: pobj.getUUID(),
      });
    }
    if (pobj.getPVPBSID()) {
      this.sendCmd(pobj.getPVPBSID(), "releasePlayer", {
        uuid: pobj.getUUID(),
      });
    }
    pobj.setBSID(null);
    pobj.setPVPBSID(null);
  }
  playerUpdateData(pobj, key, data, callback) {
    // mbgGame.logger.info("[playerUpdateData]", key);
    const BSID = pobj.getBSID();
    this._playerUpdateData(BSID, pobj, key, data, callback);
  }
  // 玩家数据变更
  _playerUpdateData(BSID, pobj, key, data, callback) {
    // mbgGame.logger.info("[playerUpdateData]", key);
    this.sendCmd(BSID, "updateData", {
      uuid: pobj.getUUID(),
      key,
      data,
    }, callback);
  }
  callWarFunc(pobj, worldIdx, funcName, ...args) {
    // mbgGame.logger.info("[callWarFunc]", worldIdx, funcName, args);
    let BSID;
    if (worldIdx === 99) {
      BSID = pobj.getPVPBSID();
    } else {
      BSID = pobj.getBSID();
    }
    if (!BSID) {
      mbgGame.logger.warn("[callWarFunc] no BSID, worldIdx", worldIdx, "funcName", funcName);
      return;
    }
    this.sendCmd(BSID, "callWarFunc", {
      uuid: pobj.getUUID(),
      worldIdx,
      func: funcName,
      args,
    });
  }
  createPVPWar(pobj, dData) {
    const BSID = this.getIdleBSID(defines.Group_PVP);
    pobj.setPVPBSID(BSID);
    pobj.updateBSFwdPair(null, BSID);
    const uuid = pobj.getUUID();
    this.sendCmd(BSID, "online", {
      uuid,
    });
    this.sendCmd(BSID, "createWar", {
      uuid,
      data: dData,
    });
  }
  beginPVPWar(pobj, dData) {
    const BSID = pobj.getPVPBSID();
    this.sendCmd(BSID, "beginWar", {
      uuid: pobj.getUUID(),
      data: dData,
    });
  }
  createWar(pobj, dData) {
    // mbgGame.logger.info("[createWar]");
    const BSID = pobj.getBSID();
    this.sendCmd(BSID, "createWar", {
      uuid: pobj.getUUID(),
      data: dData,
    });
  }
  beginWar(pobj, dData) {
    // mbgGame.logger.info("[beginWar]");
    const BSID = pobj.getBSID();
    this.sendCmd(BSID, "beginWar", {
      uuid: pobj.getUUID(),
      data: dData,
    });
  }
  releaseWar(pobj, worldIdx) {
    // mbgGame.logger.info("[releaseWar]");
    let BSID;
    if (worldIdx === w_defines.pvpWorldIdx) {
      BSID = pobj.getPVPBSID();
      pobj.setPVPBSID(null);
    }
    if (!BSID) {
      BSID = pobj.getBSID();
    }
    this.sendCmd(BSID, "releaseWar", {
      uuid: pobj.getUUID(),
      data: {
        worldIdx,
      },
    });
  }
  initFSConnection(dAllServerInfo, tag) {
    if (_.isEmpty(this.m_BSIDs)) {
      mbgGame.logger.info("[initFSConnection] no BSIDs", tag);
      return;
    }
    if (!mbgGame.server_config.HOSTNAME) {
      mbgGame.logger.info("[initFSConnection] no HOSTNAME", tag);
      return;
    }
    mbgGame.logger.info("[initFSConnection] begin", tag);
    for (let i = 0; i < this.m_BSIDs.length; i++) {
      const BSID = this.m_BSIDs[i];
      this.sendCmd(BSID, "initFSConnection", {
        host: mbgGame.server_config.HOSTNAME,
        all: dAllServerInfo,
      });
    }
  }
  // /回调接口
  // ///////////////////////////////////////////
  // 收到某BS的某玩家的战斗事件
  onWarEvent(BSID, uuid, worldIdx, event, dEventData) {
    const nPlayer = Cache.get(`Player:${uuid}`);
    if (!nPlayer) {
      return;
    }
    if (nPlayer.m_Offlining) {
      return;
    }
    const pobj = nPlayer.getPlayerLogic();
    if (!pobj) {
      return;
    }
    // const frame = dEventData.frame;
    const dData = dEventData.data;
    pobj.onWarEvent(worldIdx, event, dData);
  }
  onHeartbeatRes(BSID, dData) {
    this.m_BSHeartbeatCount[BSID] = 0;
    const now = moment().valueOf();
    const elapsed = now - dData.t_send;
    this.m_BSHeartbeatDelay[BSID] = elapsed;
    // mbgGame.logger.info(`BS-${BSID} delay: ${elapsed}ms`);
  }
}


module.exports = BSMgr;