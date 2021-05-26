const cmdfunc = require('../gameserver/cmdfunc');
const gs2bs_cmd = require('./gs2bs_cmd');
const BSMgr = require('./mgr_for_bs');
const WarCtrl = require('../logic/w_warctrl');

const ForwardServerId2Handlers = {};

/*
    [forwarder] BS2GS handler
*/
function onBS2GSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] BS2GS connected, sID:${sID}, cID:${cID}`);
  mbgGame.warCtrl.stopAllWarUpdate('BS2GS Connected');
}

function onBS2GSDisconnected(sID, cID) {
  if (mbgGame.warCtrl.isWarUpdating()) {
    mbgGame.logger.info(`BS[${mbgGame.server_config.BSID}] [forwarder] BS2GS disconnected, sID:${sID}, cID:${cID}`);
    mbgGame.warCtrl.stopAllWarUpdate('BS2GS Disconnected');
  }
}

function onBS2GSMsg(sID, cID, dData) {
  // mbgGame.logger.info(`[forwarder] BS2GS msg, sID`, sID, `cID`, cID, dData);
  cmdfunc.handleCmd(null, dData, gs2bs_cmd.GS2BS_CMD_FUNC);
  // response to GS
  if (dData._pIdx > 0) {
    mbgGame.bsmgr.sendResponse2GS(dData._pIdx);
  }
}

/*
    [forwarder] BS2FS handler
*/
function onBS2FSConnected(sID, cID) {
  mbgGame.logger.info(`BS[${mbgGame.server_config.BSID}] [forwarder] BS2FS connected, sID:${sID}, cID:${cID}`);
}

function onBS2FSDisconnected(sID, cID) {
  mbgGame.logger.info(`BS[${mbgGame.server_config.BSID}] [forwarder] BS2FS disconnected, sID:${sID}, cID:${cID}`);
}

function onBS2FSMsg(FSServerId, cID, dPacketData) {
  // mbgGame.debuglog = true;
  // mbgGame.logger.info(`[forwarder] BS2FS msg, FSServerId`, FSServerId, `cID`, cID, dPacketData);
  const dData = dPacketData.data;
  switch (dPacketData._cmd) {
    case "setPair":
      {
        mbgGame.bsmgr.setFSPair(FSServerId, cID, dData.pair);
        break;
      }
    case "callWarFunc":
      {
        const token = dData.token;
        const wID = dData.wID;
        const funcName = dData.func;
        if (mbgGame.debuglog) {
          mbgGame.bsmgr.logInfo("callWarFunc1:", wID, funcName);
        }
        if (!mbgGame.warCtrl.isClientCmd(funcName)) {
          break;
        }
        const args = dData.args;
        if (mbgGame.debuglog) {
          mbgGame.bsmgr.logInfo("callWarFunc, arg", wID, funcName, args);
        }
        const oWar = mbgGame.warCtrl.getWarObj(wID);
        if (!oWar) {
          if (mbgGame.debuglog) {
            mbgGame.bsmgr.logInfo("callWarFunc, no oWar", wID);
          }
          break;
        }
        if (!mbgGame.warCtrl.validCmd(oWar, funcName)) {
          if (mbgGame.debuglog) {
            mbgGame.bsmgr.logInfo("callWarFunc, validCmd failed", wID, funcName);
          }
          break;
        }
        if (mbgGame.debuglog) {
          mbgGame.bsmgr.logInfo("getToken:", oWar.getToken(),
            "getTargetToken:", oWar.getTargetToken(), "token:", token);
        }
        // 验证token，必须持有该场战斗的token才能执行战斗函数
        let defender;
        if (oWar.getToken() === token) {
          defender = false;
        } else if (oWar.getTargetToken() === token) {
          defender = true;
        } else {
          if (mbgGame.debuglog) {
            mbgGame.logger.info("callWarFunc, wrong token", token);
          }
          break;
        }
        mbgGame.warCtrl.callWarFunc("C", defender, wID, funcName, args);
        break;
      }
    default:
      break;
  }
  // mbgGame.debuglog = false;
}


function onPoll() {
  const fwd = mbgGame.fwd;
  if (!fwd) {
    mbgGame.logger.info("[onPoll] no fwd");
    return;
  }
  setImmediate(onPoll);
  if (_.isEmpty(mbgGame.ForwardServerIDs)) {
    return;
  }
  for (let i = 0; i < mbgGame.ForwardServerIDs.length; i += 1) {
    const sID = mbgGame.ForwardServerIDs[i];
    do {
      fwd.pollOnce(sID, mbgGame.devMode ? 10 : 1);
      const evt = fwd.getCurEvent();
      if (evt <= 0) {
        break;
      }
      if (evt === 5) {
        continue;
      }
      // mbgGame.logger.info("[forwarder] onPoll, evt", evt, "sID", sID);
      const cID = fwd.getCurProcessClientID();
      const handlers = ForwardServerId2Handlers[sID];
      if (!handlers) {
        continue;
      }
      switch (evt) {
        case 1: // connected
          {
            handlers.onConnected(sID, cID);
            break;
          }
        case 2: // disconnected
          {
            handlers.onDisconnected(sID, cID);
            break;
          }
        case 3: // message
          {
            let packet = fwd.getCurProcessPacket();
            packet = packet.toString();
            // mbgGame.logger.info(`message`, packet);
            mbgGame.common.stat.addAccumVal(
              `BS(${mbgGame.server_config.BSID})-${sID === mbgGame.BS2GSServerId ? 'GS' : 'FS'}-in`,
              packet.length);
            let dData;
            try {
              dData = JSON.parse(packet);
            } catch (e) {
              dData = null;
              mbgGame.logError(`[forwarder] invalid packet, not json, packet:${packet}`, e);
            }
            if (dData) {
              handlers.onMsg(sID, cID, dData);
            }
            break;
          }
        default:
          break;
      }
    } while (true);
  }
}


function setupForwarder(dConfig) {
  const forwarder = require('forwarder-node');

  mbgGame.fwd = new forwarder.Forwarder();
  const fwd = mbgGame.fwd;
  mbgGame.logger.info("[forwarder] version:", fwd.version());
  fwd.setupLogger();

  /*
      trace = 0,
      debug = 1,
      info = 2,
      warn = 3,
      err = 4, // Default
      critical = 5,
      off = 6
  */
  // fwd.setLogLevel(1);
  // fwd.setDebug(true);
  mbgGame.BS2GSServerId = 1;

  fwd.initServers([{
    id: mbgGame.BS2GSServerId,
    desc: dConfig.BS2GS_FWD.name,
    netType: "enet",
    port: mbgGame.getServerPort('BS2GS_FWD'),
    peers: 1,
    encrypt: false,
    encryptkey: "1234567812345678",
    base64: false,
    compress: false,
    address: "localhost",
    timeoutMin: 1 * 60 * 1000,
    timeoutMax: 2 * 60 * 1000,
    isClient: true,
    reconnect: true,
  }]);
  fwd.setProtocolRule(mbgGame.BS2GSServerId, 2, "Process");
  ForwardServerId2Handlers[mbgGame.BS2GSServerId] = {
    onConnected: onBS2GSConnected,
    onDisconnected: onBS2GSDisconnected,
    onMsg: onBS2GSMsg,
  };
  mbgGame.ForwardServerId2Handlers = ForwardServerId2Handlers;
  mbgGame.ForwardServerIDs = [mbgGame.BS2GSServerId];

  mbgGame.FSHandlers = {
    onConnected: onBS2FSConnected,
    onDisconnected: onBS2FSDisconnected,
    onMsg: onBS2FSMsg,
  };
  mbgGame.FSServerIDs = [];
  setImmediate(onPoll);

  // 流量统计 1分钟记1次 记录的是累计值
  mbgGame.common.timer.setRepeatTimer(60 * 1000, () => {
    // mbgGame.bsmgr.sendNetStatToGS();
  });
}

function onServerStarted() {
  mbgGame.logger.info("[bs_start.onServerStarted]");
  mbgGame.bsmgr = new BSMgr();
  mbgGame.warCtrl = new WarCtrl();
  mbgGame.logger.info("[init BS2GS client], mode: forwarder");
  if (process.env.NODE_ENV === "development") {
    mbgGame.devMode = true;
  }
  // Forwarder Server: BS->GS
  setupForwarder(mbgGame.server_config);
  mbgGame.shutdown = function() {
    mbgGame.logger.info("shutdown now");
  };
}


module.exports = {
  onServerStarted,
};