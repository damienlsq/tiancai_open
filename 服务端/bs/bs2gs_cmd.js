const Cache = require('../gameserver/cache');

function do_register(dHeader, dData) {
  mbgGame.logger.info("[do_register]", dData);
  mbgGame.bsmgr.registerBS(dHeader.sockID, dHeader.connectID);
}

function do_heartbeatRes(dHeader, dData) {
  mbgGame.bsmgr.onHeartbeatRes(dData.BSID, dData.data);
}

function do_response(dHeader, dData) {
  // mbgGame.logger.info("[do_warevent]", dData);
  mbgGame.bsmgr.onResponse(dData.BSID, dData.pIdx);
}


function do_warevent(dHeader, dData) {
  // mbgGame.logger.info("[do_warevent]", dData);
  mbgGame.bsmgr.onWarEvent(dData.BSID, dData.uuid, dData.worldIdx, dData.event, dData.data);
}

function do_serverWarning(dHeader, dData) {
  // mbgGame.logger.info("[do_updateBSBusyLv]", dData);
  mbgGame.serverCtrl.sendServerWarning(`[BSError]: ${dData.msg}`);
}

function do_updateBSBusyLv(dHeader, dData) {
  // mbgGame.logger.info("[do_updateBSBusyLv]", dData);
  mbgGame.bsmgr.updateBSBusyLv(dData.BSID, dData.lv);
}

function do_updateBSPID(dHeader, dData) {
  // mbgGame.logger.info("[do_updateBSBusyLv]", dData);
  mbgGame.bsmgr.updateBSPID(dData.BSID, dData.pid);
}



// BS的包直接发去Client，需要经过GS、FS
// TODO：是否可能做成BS直接发去FS
function do_forward(dHeader, dData) {
  if (typeof (dData.uuid) === "string") {
    const nPlayer = Cache.get(`Player:${dData.uuid}`);
    if (!nPlayer) {
      // mbgGame.logError("do_forward no nPlayer");
      return;
    }
    if (nPlayer.isReconnecting()) {
      // mbgGame.logError("do_forward isReconnecting");
      return;
    }
    if (nPlayer.isClientOffline()) {
      // mbgGame.logError("do_forward isClientOffline");
      return;
    }
    nPlayer.sendCmd(dData.cmd, dData.data);
  } else {
    const uuids = dData.uuid;
    for (let i = 0, len = uuids.length; i < len; i++) {
      const uuid = uuids[i];
      const nPlayer = Cache.get(`Player:${uuid}`);
      if (!nPlayer || nPlayer.isReconnecting()) {
        return;
      }
      if (nPlayer.isClientOffline()) {
        return;
      }
      nPlayer.sendCmd(dData.cmd, dData.data);
    }
  }
}

// BS发了BS的流量统计信息给GS
function do_netStat(dHeader, dData) {
  mbgGame.serverCtrl.saveNetStat(dData.data);
}

module.exports = {
  BS2GS_CMD_FUNC: {
    register: do_register,
    heartbeatRes: do_heartbeatRes,
    warevent: do_warevent,
    setBusyLv: do_updateBSBusyLv,
    warning: do_serverWarning,
    setPID: do_updateBSPID,
    response: do_response,
    forward: do_forward,
    netStat: do_netStat,
  },
};