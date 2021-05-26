function do_setBSID(dHeader, dData) {
  mbgGame.bsmgr.onSetBSID(dData);
}

function do_updateConfig(dHeader, dData) {
  mbgGame.bsmgr.onUpdateConfig(dData);
}

function do_heartbeat(dHeader, dData) {
  mbgGame.bsmgr.onHeartbeat(dData);
}

function do_playerOnline(dHeader, dData) {
  mbgGame.bsmgr.onPlayerOnline(dData.uuid);
}

function do_playerOffline(dHeader, dData) {
  mbgGame.bsmgr.onPlayerOffline(dData.uuid);
}

function do_playerRelease(dHeader, dData) {
  mbgGame.bsmgr.onPlayerRelease(dData.uuid);
}

function do_playerUpdateData(dHeader, dData) {
  mbgGame.bsmgr.onUpdateData(dData.uuid, dData.key, dData.data);
}

function do_createWar(dHeader, dData) {
  mbgGame.bsmgr.onCreateWar(dData.uuid, dData.data);
}

function do_beginWar(dHeader, dData) {
  mbgGame.bsmgr.onBeginWar(dData.uuid, dData.data);
}

function do_releaseWar(dHeader, dData) {
  mbgGame.bsmgr.onReleaseWar(dData.uuid, dData.data);
}

function do_callWarFunc(dHeader, dData) {
  mbgGame.bsmgr.onCallWarFunc(dData.uuid, dData.worldIdx, dData.func, dData.args);
}

function do_initFSConnection(dHeader, dData) {
  mbgGame.bsmgr.onInitFSConnection(dData.host, dData.all);
}


module.exports = {
  GS2BS_CMD_FUNC: {
    initFSConnection: do_initFSConnection,
    setBSID: do_setBSID,
    updateConfig: do_updateConfig,
    heartbeat: do_heartbeat,
    // 玩家上线标志 战斗这边需要知道玩家的当前状态
    online: do_playerOnline,
    // 玩家客户端下线标志
    offline: do_playerOffline,
    // 玩家服务端下线标志
    releasePlayer: do_playerRelease,
    // 更新全局数据，因为PVE三场战斗一些数据是通用的
    // 全局数据的结构由GS决定，PVE战斗可直接查询这些信息
    updateData: do_playerUpdateData,
    createWar: do_createWar, // 生成战斗对象
    beginWar: do_beginWar, // 开始战斗，create后才能begin，begin可以重复调用
    releaseWar: do_releaseWar, // 释放战斗对象
    callWarFunc: do_callWarFunc, //简单RPC，GS调用war的函数
  },
};