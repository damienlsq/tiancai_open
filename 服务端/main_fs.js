
const co = require('co');
const assert = require('assert');
const logger = require('./gameserver/logger');


global.mbgGame = require('./gameserver/mbgGame');
const CServer = require('./gameserver/server');

/*
    C2FS handler
*/
function onC2FSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] C2FS connected, sID`, sID, `cID`, cID);
}

function onC2FSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] C2FS disconnected, sID`, sID, `cID`, cID);
}

function onC2FSMsg(sID, cID, dPacketData) {
  mbgGame.logger.info(`[forwarder] C2FS msg, sID`, sID, `cID`, cID, dPacketData);
  const dHeader = dPacketData.header;
  const dData = dPacketData.data;
  if (!dHeader || !dData) {
    return;
  }
  if (dHeader._cmd === "clientlog") {
    const clientLogger = logger.getLogger('client');
    clientLogger.info(`[${dData.id}]`, dData);
  }
}

/*
    GS2FS handler
*/
function onGS2FSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] GS2FS connected, sID`, sID, `cID`, cID);
}


function onGS2FSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] GS2FS disconnected, sID`, sID, `cID`, cID);
}

function onGS2FSMsg(sID, cID, dData) {
  mbgGame.logger.info(`[forwarder] GS2FS msg, sID`, sID, `cID`, cID, dData);
}

/*
    BS2FS handler
*/
function onBS2FSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] BS2FS connected, sID`, sID, `cID`, cID);
  assert(sID);
  mbgGame.fwd.sendText(sID, cID, JSON.stringify({
    _cmd: 'setPair',
    data: {
      pair: [sID, cID],
    },
  }));
}


function onBS2FSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] BS2FS disconnected, sID`, sID, `cID`, cID);
}

function onBS2FSMsg(sID, cID, dData) {
  mbgGame.logger.info(`[forwarder] BS2FS msg, sID`, sID, `cID`, cID, dData);
}

/*
    FS2XFS handler
*/
function onFS2XFSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] FS2XFS connected, sID`, sID, `cID`, cID);
}


function onFS2XFSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] FS2XFS disconnected, sID`, sID, `cID`, cID);
}

function onFS2XFSMsg(sID, cID, dData) {
  mbgGame.logger.info(`[forwarder] FS2XFS msg, sID`, sID, `cID`, cID, dData);
}

const ForwardServerId2Handlers = {};

function onPoll() {
  const fwd = mbgGame.fwd;
  if (!fwd) {
    mbgGame.logger.info("[onPoll] no fwd");
    return;
  }
  setImmediate(onPoll);
  for (let i = 0; i < mbgGame.ForwardServerIDs.length; i += 1) {
    const sID = mbgGame.ForwardServerIDs[i];
    do {
      fwd.pollOnce(sID, mbgGame.devMode ? 10 : 1);
      const evt = fwd.getCurEvent();
      if (evt <= 0) {
        break;
      }
      if (evt === 4) {
        mbgGame.common.stat.addAccumVal(
          `FS-${mbgGame.ServerId2Name[sID]}-in`,
          fwd.getCurInPacketSize());
        // TODO 需要知道转发到哪个sID
        mbgGame.common.stat.addAccumVal(
          `FS-${mbgGame.ServerId2Name[sID]}-f`,
          fwd.getCurOutPacketSize());
        continue;
      }
      if (evt === 5) {
        // 当前事件因为某些原因没有成功处理，而且还有新的事件，需要再pollOnce一次
        continue;
      }
      // mbgGame.logger.info("[forwarder] onPoll, evt", evt, "sID", sID);
      const handlers = ForwardServerId2Handlers[sID];
      if (!handlers) {
        mbgGame.logError(`[forwarder] no handlers sID ${sID}`);
        break;
      }
      const cID = fwd.getCurProcessClientID();
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
            let dData;
            try {
              dData = JSON.parse(packet);
            } catch (e) {
              dData = null;
              mbgGame.logError(`[forwarder] invalid packet, not json, packet: ${packet}`);
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


function onFSStatTimeout() {
  // mbgGame.logger.info("onFSStatTimeout");
  const statNames = [
    'CENet-in',
    'CWS-in',
    'GS-in',
    'BS-in',
    'CENet-f',
    'CWS-f',
    'GS-f',
    'BS-f',
  ];
  const dData = {};
  for (let i = 0; i < statNames.length; i++) {
    const name = `FS-${statNames[i]}`;
    const val = mbgGame.common.stat.logAccumVal(name, "KB");
    dData[name] = val;
  }
  const sData = JSON.stringify({
    header: {
      _cmd: "fs.stat",
    },
    _cmd: "fs.stat",
    data: {
      pid: process.pid,
      stat: mbgGame.fwd.stat(),
      data: dData,
    },
  });
  // mbgGame.logger.info("sData", sData);
  assert(mbgGame.Name2ServerId.GS);
  mbgGame.fwd.sendText(mbgGame.Name2ServerId.GS, 0, sData);
}

function setupForwarder(dConfig) {
  if (process.env.NODE_ENV === "development") {
    mbgGame.devMode = true;
  }
  const forwarder = require('forwarder-node');
  mbgGame.logger.info(`[setupForwarder] begin`);
  mbgGame.fwd = new forwarder.Forwarder();
  const fwd = mbgGame.fwd;
  mbgGame.logger.info("[forwarder] version:", fwd.version());
  // fwd.setupLogger("/data/logs/tc/fs_tc_forwarder_out.log");
  // fwd.setupLogger();
  // mbgGame.logger.info("[forwarder] setuplogger ok");
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
  mbgGame.ServerId2Name = {
    1: 'CENet',
    4: 'CWS',
    2: 'GS',
    3: 'BS',
    5: 'XFS',
  };
  mbgGame.Name2ServerId = {};
  for (const id in mbgGame.ServerId2Name) {
    mbgGame.Name2ServerId[mbgGame.ServerId2Name[id]] = +id;
  }

  // 路由表
  const routeConfig = {
    FS2C_WS_FWD: {
      type: 'ws',
      id: mbgGame.Name2ServerId.CWS,
      destId: mbgGame.Name2ServerId.GS,
      onConnected: onC2FSConnected,
      onDisconnected: onC2FSDisconnected,
      onMsg: onC2FSMsg,
    },
    FS2C_ENET_FWD: {
      type: 'enet',
      id: mbgGame.Name2ServerId.CENet,
      destId: mbgGame.Name2ServerId.GS,
      onConnected: onC2FSConnected,
      onDisconnected: onC2FSDisconnected,
      onMsg: onC2FSMsg,
    },
    FS2GS_FWD: {
      type: 'enet',
      id: mbgGame.Name2ServerId.GS,
      destId: mbgGame.Name2ServerId.CENet,
      onConnected: onGS2FSConnected,
      onDisconnected: onGS2FSDisconnected,
      onMsg: onGS2FSMsg,
    },
    FS2BS_FWD: {
      type: 'enet',
      id: mbgGame.Name2ServerId.BS,
      destId: mbgGame.Name2ServerId.CENet,
      onConnected: onBS2FSConnected,
      onDisconnected: onBS2FSDisconnected,
      onMsg: onBS2FSMsg,
    },
    FS2XFS_FWD: {
      type: 'enet',
      id: mbgGame.Name2ServerId.XFS,
      onConnected: onFS2XFSConnected,
      onDisconnected: onFS2XFSDisconnected,
      onMsg: onFS2XFSMsg,
    },
  };

  mbgGame.ForwardServerIDs = [];
  const fwdServersConfig = [];
  [
    'FS2C_WS_FWD',
    'FS2C_ENET_FWD',
    'FS2GS_FWD',
    'FS2BS_FWD',
    'FS2XFS_FWD',
  ].forEach((x) => {
    if (!dConfig[x]) return;
    const con = {
      id: routeConfig[x].id,
      netType: routeConfig[x].type,
      desc: dConfig[x].name,
      port: mbgGame.getServerPort(x),
      peers: 1,
      encrypt: false,
      encryptkey: "1234567812345678",
      base64: false,
      debug: false,
      compress: false,
      address: "localhost",
    };
    if (routeConfig[x].destId) {
      con.destId = routeConfig[x].destId;
    }
    // 自定义设置
    [
      'peers',
      'encrypt',
      'encryptkey',
      'base64',
      'compress',
      'address',
      'timeoutMin',
      'timeoutMax',
      'isClient',
      'reconnect',
    ].forEach((y) => {
      if (dConfig[x][y]) {
        con[y] = dConfig[x][y];
      }
    });

    fwdServersConfig.push(con);
    mbgGame.ForwardServerIDs.push(con.id);

    ForwardServerId2Handlers[con.id] = {
      onConnected: routeConfig[x].onConnected,
      onDisconnected: routeConfig[x].onDisconnected,
      onMsg: routeConfig[x].onMsg,
    };
  });
  console.log('fwdServersConfig', fwdServersConfig, mbgGame.ForwardServerIDs);
  fwd.initServers(fwdServersConfig);

  setImmediate(onPoll);

  mbgGame.common.timer.setRepeatTimer(1000 * 60, onFSStatTimeout);

  mbgGame.logger.info(`[setupForwarder] end`);
}

function onServerStarted() {
  mbgGame.logger.info("onServerStarted");
  setupForwarder(mbgGame.server_config);
  mbgGame.shutdown = function() {
    mbgGame.logger.info("shutdown now");
    if (mbgGame.fwd) {
      mbgGame.fwd.release();
      mbgGame.fwd = null;
    }
  };
}

co(function* () {
  mbgGame.server = new CServer("FS");
  yield mbgGame.server.initServer({
    noDB: true,
    server_started: [
      onServerStarted,
    ],
  });
}).catch((err, result) => {
  mbgGame.logError(`[start fs err]`, err);
});