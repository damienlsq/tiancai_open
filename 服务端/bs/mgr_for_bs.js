const Polyglot = require('node-polyglot');
const cmdfunc = require('../gameserver/cmdfunc');
const checkconfig = require('../checkconfig');

// BS用的
// 管理连到这个GS的所有player及其相关信息
class BSMgr {
  constructor() {
    this.m_IsBatchMode = {};
    // 记录连到这台BS的玩家的信息
    // 存的都是数据
    this.m_uuid2Data = {
      // uuid: {
      // online: T/F,
      // }
    };
    // 记录FS->BS的host和peer编号，然后可以把编号发给客户端(Init战斗时)，
    // 客户端就可以直接发战斗包给BS了 (C->FS->BS)
    this.m_FSServerId2Pair = {};
  }
  // ///////////////////////////////////////////
  // /BS端可用的接口
  // ///////////////////////////////////////////
  isPlayerClientOffline(uuid) {
    const dInfo = this.m_uuid2Data[uuid];
    return !dInfo.online;
  }
  getPlayerData(uuid) {
    return this.m_uuid2Data[uuid];
  }
  getPlayerDataByKey(uuid, key) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      return null;
    }
    return dInfo[key];
  }
  sendResponse2GS(packetIdx) {
    // this.logInfo("sendResponse2GS", packetIdx);
    this.sendCmd("response", {
      BSID: mbgGame.server_config.BSID,
      pIdx: packetIdx,
    });
  }
  sendCmd(cmd, dData) {
    if (!mbgGame.fwd) {
      return;
    }
    const len = cmdfunc.forwarderSendCmd(mbgGame.fwd, mbgGame.BS2GSServerId, 0, cmd, dData);
    const statName = `BS(${mbgGame.server_config.BSID})-GS-out`;
    mbgGame.common.stat.addAccumVal(statName, len);
  }
  send2GS(uuid, worldIdx, event, dData) {
    this.sendCmd("warevent", {
      BSID: mbgGame.server_config.BSID,
      uuid,
      worldIdx,
      event,
      data: dData,
    });
  }
  setFSPair(FSServerId, cID, pair) {
    this.m_FSServerId2Pair[FSServerId] = pair;
  }
  getFSPair(FSServerId) {
    if (!FSServerId) {
      FSServerId = mbgGame.localFSServerId;
    }
    return this.m_FSServerId2Pair[FSServerId];
  }
  send2FS(host, FSId, forwardClientId, cmd, dData) {
    if (!mbgGame.fwd) {
      return;
    }
    const dPacketData = {
      header: {
        _cmd: cmd,
      },
      data: dData,
    };
    const forwardServerId = FSId;
    const sPacketData = JSON.stringify(dPacketData);
    const isBroadcast = false;
    const isForceRaw = true; // 强制裸包，战斗包不需要加密
    const FSServerId = this.getFSServerIdByHost(host);
    // mbgGame.logger.info("send2FS", host, dData.event, FSServerId, FSId, forwardClientId, this.m_IsBatchMode[FSServerId]);
    mbgGame.fwd.forwardText(FSServerId, 0, sPacketData, forwardServerId, forwardClientId, isBroadcast, isForceRaw, this.m_IsBatchMode[FSServerId]);
    const statName = `BS(${mbgGame.server_config.BSID})-FS-out`;
    mbgGame.common.stat.addAccumVal(statName, sPacketData.length);
  }
  beginBatchSend2C(FSServerId) {
    if (!mbgGame.fwd) {
      return;
    }
    if (!mbgGame.fwd.beginBatchForward) {
      return;
    }
    mbgGame.fwd.beginBatchForward(FSServerId);
    this.m_IsBatchMode[FSServerId] = true;
  }
  endBatchSend2C(FSServerId) {
    this.m_IsBatchMode[FSServerId] = false;
    if (!mbgGame.fwd) {
      return;
    }
    if (!mbgGame.fwd.endBatchForward) {
      return;
    }
    mbgGame.fwd.endBatchForward(FSServerId, 0);
  }
  send2C(uuid, cmd, dData, fwdPair) {
    if (!fwdPair) {
      fwdPair = this.getPlayerDataByKey(uuid, "fwd_pair");
    }
    if (fwdPair) {
      const [host, FSId, cid] = fwdPair;
      this.send2FS(host, FSId, cid, cmd, dData);
    } else {
      mbgGame.logger.info("no pair!", dData.event);
    }
  }
  setBusyLv(lv) {
    this.sendCmd("setBusyLv", {
      BSID: mbgGame.server_config.BSID,
      lv,
    });
  }
  sendServerWarning(msg) {
    this.sendCmd("warning", {
      msg,
    });
  }
  // 会加上BSID前缀的log
  logInfo(...args) {
    args.unshift(`[BS${mbgGame.server_config.BSID}]`);
    mbgGame.logger.info(...args);
  }
  logError(...args) {
    args.unshift(`[BS${mbgGame.server_config.BSID}]`);
    mbgGame.logger.error(...args);
    const stack = new Error().stack;
    const msg = `${JSON.stringify(args)} ${stack}`;
    this.sendServerWarning(msg);
  }
  logErrorNoStack(...args) {
    args.unshift(`[BS${mbgGame.server_config.BSID}]`);
    mbgGame.logger.error(...args);
    const msg = JSON.stringify(args);
    this.sendServerWarning(msg);
  }
  // ///////////////////////////////////////////
  // /便捷接口（本文件内使用）
  // ///////////////////////////////////////////
  getWarIDByWorldIdx(uuid, worldIdx) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      return null;
    }
    if (!dInfo.warIDDict) {
      // this.logError("[getWarIDByWorldIdx] no warIDDict", dInfo, uuid);
      return null;
    }
    return dInfo.warIDDict[worldIdx];
  }
  onPlayerDataChanged(uuid, key, data) {
    // const dInfo = this.m_uuid2Data[uuid];
  }
  // ///////////////////////////////////////////
  // BS产生的事件
  // ///////////////////////////////////////////
  onWarEnd(oWar) { }
  // ///////////////////////////////////////////
  // 处理GS发来的命令
  // ///////////////////////////////////////////
  getFSServerIdByHost(host) {
    if (!this.m_host2FSServerId) {
      this.m_host2FSServerId = {};
    }
    if (!this.m_host2FSServerId[host]) {
      if (!this.m_FSServerIdCount) {
        this.m_FSServerIdCount = 0;
      }
      this.m_FSServerIdCount += 1;
      this.m_host2FSServerId[host] = 100 + this.m_FSServerIdCount;
      this.logInfo("[getFSServerIdByHost] host:", host, "serverId", this.m_host2FSServerId[host]);
    }
    return this.m_host2FSServerId[host];
  }
  onInitFSConnection(myhost, dAllServerInfo) {
    this.logInfo("onInitFSConnection, host:", myhost, "dAllServerInfo:", dAllServerInfo);
    for (const host in dAllServerInfo) {
      const FSServerId = this.getFSServerIdByHost(host);
      if (mbgGame.ForwardServerIDs.indexOf(FSServerId) !== -1) {
        continue;
      }
      const ip = dAllServerInfo[host].ip;
      if (ip === "localhost") {
        mbgGame.localFSServerId = FSServerId;
      }
      mbgGame.fwd.createServer({
        id: FSServerId,
        desc: `FS-${host}`,
        netType: "enet",
        port: mbgGame.getServerPort('BS2FS_FWD'),
        peers: 1,
        encrypt: false,
        encryptkey: "1234567812345678",
        base64: false,
        compress: false,
        address: ip,
        timeoutMin: 1 * 60 * 1000,
        timeoutMax: 2 * 60 * 1000,
        isClient: true,
        reconnect: true,
      });
      mbgGame.fwd.setProtocolRule(FSServerId, 2, "Process");
      mbgGame.ForwardServerIDs.push(FSServerId);
      mbgGame.FSServerIDs.push(FSServerId);
      mbgGame.ForwardServerId2Handlers[FSServerId] = mbgGame.FSHandlers;
      this.logInfo("onInitFSConnection, setup BS2FS, FSServerId:", FSServerId, "taget host:", host);
    }
  }
  onSetBSID(dData) {
    let bNeedClean = false;
    if (mbgGame.server_config.BSID) {
      bNeedClean = true;
    }
    mbgGame.server_config.BSID = dData.BSID;
    this.logInfo("onSetBSID", dData.BSID);
    if (bNeedClean) {
      this.logInfo("has old BSID, start clean BS");
      mbgGame.warCtrl.resetWarCtrl();
      this.m_uuid2Data = {};
      this.logInfo("clean success");
    }
    this.sendCmd("setPID", {
      BSID: mbgGame.server_config.BSID,
      pid: process.pid,
    });
  }
  onUpdateConfig(dData) {
    mbgGame.config = dData.config;
    mbgGame.i18n = dData.i18n;
    mbgGame.i18n.polyglot = new Polyglot();
    // const fs = require("fs");
    // fs.writeFile("config.js", `const config = JSON.parse(\`${JSON.stringify(mbgGame.config)}\`); module.exports = config;`);
    this.logInfo("onUpdateConfig");
    checkconfig();
    this.logInfo("onUpdateConfig done");
  }
  onHeartbeat(dData) {
    dData.t_recv = moment().valueOf();
    this.logInfo("onHeartbeat", dData);
    this.sendCmd("heartbeatRes", {
      BSID: mbgGame.server_config.BSID,
      data: dData,
    });
  }
  // 注意，不保证先收到online再收到别的包
  onPlayerOnline(uuid) {
    if (!uuid) {
      this.logError("[onPlayerOnline] no uuid", uuid);
      return;
    }
    if (!this.m_uuid2Data[uuid]) {
      this.m_uuid2Data[uuid] = {
        warIDDict: {},
        online: true,
      };
    }
    const dInfo = this.m_uuid2Data[uuid];
    // this.logInfo("[onPlayerOnline] ", uuid);
    dInfo.online = true;
  }
  onPlayerOffline(uuid) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[onPlayerOffline] no such player", uuid);
      return;
    }
    // this.logInfo("[onPlayerOffline] ", uuid);
    dInfo.online = false;
  }
  onPlayerRelease(uuid) {
    // this.logInfo("release player", (uuid.substring(0, 4) + uuid.substring(uuid.length - 4)), !this.m_uuid2Data[uuid]);
    if (!this.m_uuid2Data[uuid]) {
      return;
    }
    const dInfo = this.m_uuid2Data[uuid];
    delete this.m_uuid2Data[uuid];
    // 释放这个玩家的所有战斗
    for (let worldIdx in dInfo.warIDDict) {
      worldIdx = parseInt(worldIdx);
      mbgGame.warCtrl.releaseWar(dInfo.warIDDict[worldIdx], "playerRelease");
    }
    this.setBusyLv(mbgGame.warCtrl.m_WarObjCount);
  }
  // 缓存玩家的各种信息，给war用的
  onUpdateData(uuid, key, data) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[onUpdateData] no such player", uuid);
      return;
    }
    dInfo[key] = data;
    this.onPlayerDataChanged(uuid, key, data);
  }
  onCreateWar(uuid, dData) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[onCreateWar] no such player", uuid);
      return;
    }
    const worldIdx = dData.worldIdx;
    if (dInfo.warIDDict && dInfo.warIDDict[worldIdx]) {
      mbgGame.warCtrl.releaseWar(this.getWarIDByWorldIdx(uuid, worldIdx), "createNew");
      delete dInfo.warIDDict[worldIdx];
    }
    const oWar = mbgGame.warCtrl.createWar(uuid, dData);
    const wID = oWar.getWarID();
    dInfo.warIDDict[dData.worldIdx] = wID;
  }
  onBeginWar(uuid, dData) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[onBeginWar] no such player", uuid);
      return;
    }
    const wID = this.getWarIDByWorldIdx(uuid, dData.worldIdx);
    if (!wID) {
      this.logError("[onBeginWar] no such wID", uuid, dData.worldIdx);
      return;
    }
    dData.wID = wID;
    mbgGame.warCtrl.beginWarFromGS(dData);
  }
  onReleaseWar(uuid, dData) {
    // this.logInfo("[releaseWar]", uuid, dData.worldIdx);
    const worldIdx = dData.worldIdx;
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[releaseWar] no dInfo", "uuid", uuid, "worldIdx", worldIdx);
      return;
    }
    const wID = dInfo.warIDDict && dInfo.warIDDict[worldIdx];
    if (wID == null) {
      return;
    }
    delete dInfo.warIDDict[worldIdx];
    mbgGame.warCtrl.releaseWar(wID, "GS.releaseWar");
    this.setBusyLv(mbgGame.warCtrl.m_WarObjCount);
  }
  onCallWarFunc(uuid, worldIdx, func, args) {
    const dInfo = this.m_uuid2Data[uuid];
    if (!dInfo) {
      this.logError("[onCallWarFunc] no such player", uuid, func);
      return;
    }
    if (worldIdx == null) {
      this.logError("[onCallWarFunc] no worldIdx", uuid, func, args);
      return;
    }
    const denferder = false;
    if (typeof (worldIdx) === "number") {
      const wID = this.getWarIDByWorldIdx(uuid, worldIdx);
      if (!wID) {
        if (mbgGame.debuglog) {
          this.logInfo("callWarFunc no war", worldIdx, func, uuid);
        }
        return;
      }
      mbgGame.warCtrl.callWarFunc("GS", denferder, wID, func, args);
    } else {
      const worldIdxes = worldIdx;
      for (let i = 0; i < worldIdxes.length; i++) {
        const wID = this.getWarIDByWorldIdx(uuid, worldIdxes[i]);
        if (!wID) {
          if (mbgGame.debuglog) {
            this.logInfo("callWarFunc no war", worldIdxes[i], func, uuid);
          }
          continue;
        }
        mbgGame.warCtrl.callWarFunc("GS", denferder, wID, func, args);
      }
    }
  }
  sendNetStatToGS() {
    const statNames = ['GS-in', 'GS-out', 'FS-in', 'FS-out'];
    const BSName = `BS(${mbgGame.server_config.BSID})`;
    const dData = {};
    for (let i = 0; i < statNames.length; i++) {
      const name = `${BSName}-${statNames[i]}`;
      const val = mbgGame.common.stat.logAccumVal(name, "KB");
      dData[name] = val;
    }
    this.sendCmd("netStat", { data: dData });
  }
}


module.exports = BSMgr;