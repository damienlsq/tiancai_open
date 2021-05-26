const co = require('co');
const cmdfunc = require('./gameserver/cmdfunc');
const net = require('./net');
const serverCtrl = require('./ctrl/server');
const arenaCtrl = require('./ctrl/arena');
const GambleCtrl = require('./ctrl/gamble');
const ReplayCtrl = require('./ctrl/replay');
const MapCtrl = require('./ctrl/map');
const TCBattleMgr = require('./ctrl/tcbattle');
const friendwar = require('./ctrl/friendwar');
const rankListCtrl = require('./ctrl/rank');
const chatCtrl = require('./ctrl/chat');
const boardCtrl = require('./ctrl/board');
const CWarData = require('./logic/wardata');
const BSMgr = require("./bs/mgr_for_gs");
const bs2gs_cmd = require('./bs/bs2gs_cmd');
const config = require('./net/config');

/*
var heapdump = require('heapdump');
var os = require('os');

function dump_now() {
    var filepath = '/data/logs/heapdumps/tc/' + Date.now() + '.heapsnapshot'
    mbgGame.logger.info("[try_to_dumpheap] "+filepath);
    heapdump.writeSnapshot(filepath);
    mbgGame.logger.info("[dumpheap] ok "+filepath);
}
*/


const ForwardServerId2Handlers = {};

// ---- REDIS connection ----

function onGSChannelMsg_RedisSub(message) {
  mbgGame.logger.info("[onGSChannelMsg] redis-subscribe, msg:", message);
  const mes = message.split(" ");
  // 固定第一个参数是指令,第二个是指定服务器,第三以后是自定义
  switch (mes[0]) {
    case 'initConfig':
      {
        if (mes[1] && mes[1] !== mbgGame.server_config.HOSTNAME) {
          return;
        }
        co(function* () {
          yield config.initConfig();
        }).catch((err, result) => {
          mbgGame.logError(`[onGSChannelMsg_RedisSub] ${message}`, err);
        });
        break;
      }
    default:
      {
        co(function* () {
          yield mbgGame.serverCtrl.channelMsg(message);
        }).catch((err, result) => {
          mbgGame.logError(`[onGSChannelMsg_RedisSub] ${message}`, err);
        });
        break;
      }
  }
}

function onGSChannelMsg_Bills(message, channel) {
  mbgGame.logger.info("[onGSChannelMsg_Bills] redis-subscribe, msg:", message, "channel:", channel);
  mbgGame.serverCtrl.channelMsgBills(message);
}

function* onGSDBReady_RedisSub() {
  mbgGame.logger.info("[onGSDBReady_RedisSub]");
  const db = mbgGame.common.db_mgr.getDB("redis-subscribe");
  yield db.subscribe(`${mbgGame.ProjectName}:mbg_stat`);
  mbgGame.logger.info("[onGSDBReady_RedisSub] subscribed stat");

  const billsdb = mbgGame.common.db_mgr.getDB("redis-subscribe-bills");
  yield billsdb.subscribe("mbg_pay");
  mbgGame.logger.info("[onGSDBReady_RedisSub] subscribed mbg_pay");
}


// ---- gs(Server) <-> bs(Client) ----

function onBS2GSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] BS2GS connected, sID`, sID, `cID`, cID);
  const BSID = mbgGame.bsmgr.registerBS(sID, cID);
  mbgGame.logger.info("[forwarder] registerBS BSID", BSID);
}

function onBS2GSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] BS2GS disconnected, sID`, sID, `cID`, cID);
  const BSID = mbgGame.bsmgr.getBSIDBySockPair(sID, cID);
  if (BSID) {
    mbgGame.bsmgr.unregisterBS(BSID, "forwarder");
  }
}

function onBS2GSMsg(sID, cID, dData) {
  cmdfunc.handleCmd(null, dData, bs2gs_cmd.BS2GS_CMD_FUNC);
}


// ---- gs(Client) <-> clans(Server) ----

function onGS2ClanSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] GS2ClanS connected, sID`, sID, `cID`, cID);
}

function onGS2ClanSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] GS2ClanS disconnected, sID`, sID, `cID`, cID);
}

function onGS2ClanSMsg(sID, cID, dData) {
  mbgGame.logger.info(`[forwarder] GS2ClanS msg, sID`, sID, `cID`, cID, dData);
}

// ---- gs(Server) <-> fs(Client) ----

function onFS2GSConnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] FS2GS connected, sID`, sID, `cID`, cID);
}

function onFS2GSDisconnected(sID, cID) {
  mbgGame.logger.info(`[forwarder] FS2GS disconnected, sID`, sID, `cID`, cID);
}

function onFS2GSMsg(sID, cID, dData) {
  // mbgGame.logger.info(`[forwarder] FS2GS msg, sID`, sID, `cID`, cID, dData);
  const fwd = mbgGame.fwd;
  // mbgGame.logger.info(`[forwarder] FS2GS packet:`, packet);
  // mbgGame.logger.info("[forwarder] FS2GS header clientID:", fwd.getCurHeaderClientID());
  if (mbgGame.debuglog) {
    // mbgGame.logger.info("[forwarder] FS2GS header ip:", fwd.getCurHeaderIP());
  }
  const ip = fwd.getCurHeaderIP();
  const dNetHeader = {
    sockID: sID,
    connectID: cID,
    meta: {
      fwd: 1,
      sid: fwd.getCurHeaderHostID(),
      cid: fwd.getCurHeaderClientID(),
      ip,
    },
  };
  if (dData.data) {
    dData.data.ip = ip;
  }
  cmdfunc.handleCmd(dNetHeader, dData, mbgGame.C2GS_CMD_FUNC);
}


function onPoll() {
  const fwd = mbgGame.fwd;
  if (!mbgGame.ForwardServerIDs || mbgGame.ForwardServerIDs.length === 0) {
    mbgGame.logger.info("[onPoll] no ForwardServerIDs");
    return;
  }
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
      if (evt === 5) {
        continue;
      }
      const handlers = ForwardServerId2Handlers[sID];
      if (!handlers) {
        mbgGame.logError(`[forwarder] no handlers sID ${sID}`);
        break;
      }
      // mbgGame.logger.info("[forwarder] onPoll, evt", evt);
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
            if (!packet) {
              break;
            }
            packet = packet.toString();
            if (!packet || packet.length <= 0) {
              break;
            }
            // mbgGame.logger.info(`message`, packet);
            let dData;
            try {
              dData = JSON.parse(packet);
            } catch (e) {
              dData = null;
              mbgGame.logError(`[forwarder] invalid packet, not json, packet: ${packet}`, e);
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


function setupForwarder() {
  const forwarder = require('forwarder-node');
  mbgGame.fwd = new forwarder.Forwarder();
  const fwd = mbgGame.fwd;
  mbgGame.logger.info("[forwarder] version:", fwd.version());
  // fwd.setupLogger("/data/logs/tc/gs_tc_forwarder_out.log");
  // fwd.setupLogger();
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
  mbgGame.ForwardServerIDs = [];

  let dConfig = mbgGame.server_config.GS2BS_FWD;
  mbgGame.FS2XFSServerId = 5; // 特殊使用
  if (dConfig) {
    mbgGame.GS2BSServerId = 1;
    mbgGame.ForwardServerIDs.push(mbgGame.GS2BSServerId);
    fwd.createServer({
      id: mbgGame.GS2BSServerId,
      desc: dConfig.name,
      netType: "enet",
      port: mbgGame.getServerPort('GS2BS_FWD'),
      peers: 100,
      encrypt: false,
      encryptkey: "1234567812345678",
      base64: false,
      compress: false,
      timeoutMin: 1 * 60 * 1000,
      timeoutMax: 2 * 60 * 1000,
      address: "localhost",
    });
    fwd.setProtocolRule(mbgGame.GS2BSServerId, 2, "Process");
    ForwardServerId2Handlers[mbgGame.GS2BSServerId] = {
      onConnected: onBS2GSConnected,
      onDisconnected: onBS2GSDisconnected,
      onMsg: onBS2GSMsg,
    };
  }

  dConfig = mbgGame.server_config.FS2GS_FWD;
  if (dConfig) {
    mbgGame.FS2GSServerId = 2;
    mbgGame.ForwardServerIDs.push(mbgGame.FS2GSServerId);
    fwd.createServer({
      id: mbgGame.FS2GSServerId,
      desc: dConfig.name,
      netType: "enet",
      port: mbgGame.getServerPort('FS2GS_FWD'),
      peers: 1,
      encrypt: false,
      encryptkey: "1234567812345678",
      base64: false,
      compress: false,
      address: "localhost",
      isClient: true,
      reconnect: true,
      timeoutMin: 1 * 60 * 1000,
      timeoutMax: 2 * 60 * 1000,
    });
    fwd.setProtocolRule(mbgGame.FS2GSServerId, 2, "Process");
    ForwardServerId2Handlers[mbgGame.FS2GSServerId] = {
      onConnected: onFS2GSConnected,
      onDisconnected: onFS2GSDisconnected,
      onMsg: onFS2GSMsg,
    };
  }

  setImmediate(onPoll);
}


mbgGame.shutdown = function() {
  mbgGame.logger.info("shutdown now");
  mbgGame.serverCtrl.clearOnlineForShutdown();
};

function onGSStarted() {
  mbgGame.logger.info("[gs_start.onGSStarted]");
  mbgGame.config = mbgGame.config || {};
  mbgGame.game = {
    config: {},
  };
  mbgGame.setting = mbgGame.setting || {};
  mbgGame.setting.LANGUAGE = "zh"; // default
  const db_mgr = mbgGame.common.db_mgr;
  db_mgr.setDefaultRedisDB("redis-users");
  db_mgr.setDefaultMySqlDB("mysql-users");

  if (process.env.NODE_ENV === "development") {
    mbgGame.devMode = true;
  }
  const db = mbgGame.common.db_mgr.getDB("redis-subscribe");
  db.onChannelMsg = onGSChannelMsg_RedisSub;

  const bills = mbgGame.common.db_mgr.getDB("redis-subscribe-bills");
  bills.onChannelMsg = onGSChannelMsg_Bills;


  co(function* () {
    // 在这里做各种服务器初始化工作

    mbgGame.logger.info("[onGSStarted] done");
    net.onServerStarted();

    mbgGame.bsmgr = new BSMgr();
    // 服务器redis管理类
    mbgGame.serverCtrl = new serverCtrl.serverCtrl(mbgGame.server_config.HOSTNAME);
    yield mbgGame.serverCtrl.serverOnStart();

    yield config.initConfig();

    mbgGame.Replay = new ReplayCtrl();
    mbgGame.WarData = new CWarData();
    mbgGame.Arena = new arenaCtrl.NArena();
    mbgGame.Gamble = new GambleCtrl();
    mbgGame.MapCtrl = new MapCtrl();
    mbgGame.TCBattleMgr = new TCBattleMgr();

    mbgGame.Gamble.startMatchLoop();
    mbgGame.Replay.startHeartbeat();
    yield mbgGame.Arena.startMain();
    yield mbgGame.Arena.fixbug();
    yield mbgGame.Arena.onRefreshGenerator();
    yield mbgGame.TCBattleMgr.onRefreshGenerator('serverStart');

    mbgGame.FrdWarCtrl = new friendwar.FriendWarCtrl();

    mbgGame.rankList = new rankListCtrl.rankList();

    // 初始化
    mbgGame.chatCtrl = new chatCtrl.chatServer();
    mbgGame.boardCtrl = new boardCtrl.boardServer();
    // mbgGame.logger.info("名字",randomName.name.get(2));
    // mbgGame.logger.info("描述",randomName.surnames.getOne());

    // 启动Push服务
    mbgGame.serverCtrl.initForPush();

    setupForwarder();
  }).catch((err, result) => {
    mbgGame.logError(`[onServerStarted] occur error`, err);
    process.exit(); // 初始化都失败，直接结束进程
  });
}

module.exports = {
  onGSStarted,
  onGSDBReady_RedisSub,
};