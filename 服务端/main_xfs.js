
global.mbgGame = require('./gameserver/mbgGame');

const co = require('co');
const CServer = require('./gameserver/server');
const forwarder = require('forwarder-node');

const UUID2FwdPair = {
  // uuid: [xcID, FSId, cID] inCID是FS->XFS连接ID
};


// 登记连接信息
function do_addUser(xcID, dData) {
  const uuid = dData.uuid;
  UUID2FwdPair[uuid] = [xcID, dData.FSId, dData.cID];
  mbgGame.logger.info("addUser", uuid, UUID2FwdPair[uuid]);
}

// 登记连接信息
function do_delUser(xcID, dData) {
  const uuid = dData.uuid;
  if (UUID2FwdPair[uuid]) {
    delete UUID2FwdPair[uuid];
  }
  mbgGame.logger.info("delUser", uuid);
}


// 转发跨服包
function do_forward(xcID, dData) {
  const tagetUUID = dData.uuid;
  if (!UUID2FwdPair[tagetUUID]) {
    return;
  }
  const [target_xcID, target_FSId, target_cID] = UUID2FwdPair[tagetUUID];
  const sPacket = dData.data;
  const isBroadcast = false;
  const ret = mbgGame.fwd.forwardText(mbgGame.FS2XFSServerId,
    target_xcID,
    sPacket,
    target_FSId,
    target_cID); // isBroadcast isForceRaw, isBatchMode
  // mbgGame.logger.info("forward", ret, target_xcID, target_FSId, target_cID, sPacket);
}

const CMD_FUNC = {
  do_addUser,
  do_forward,
};

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
  // mbgGame.logger.info(`[forwarder] FS2XFS msg, sID`, sID, `cID`, cID, dData);
  const func = CMD_FUNC[`do_${dData.cmd}`];
  if (!func) {
    return;
  }
  func(cID, dData);
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
        continue;
      }
      if (evt === 5) {
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


function setupForwarder(dConfig) {
  mbgGame.logger.info(`[setupForwarder] begin`);
  mbgGame.fwd = new forwarder.Forwarder();
  const fwd = mbgGame.fwd;
  mbgGame.logger.info("[forwarder] version:", fwd.version());
  // fwd.setupLogger("/data/logs/tc/fs_tc_forwarder_out.log");
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


  mbgGame.FS2XFSServerId = 1;

  fwd.initServers([{
    id: mbgGame.FS2XFSServerId,
    desc: dConfig.FS2XFS_FWD.name,
    netType: "enet",
    port: mbgGame.getServerPort('FS2XFS_FWD'),
    peers: 100,
    encrypt: false,
    encryptkey: "1234567812345678",
    base64: false,
    compress: false,
    address: "localhost",
    timeoutMin: 1 * 60 * 1000,
    timeoutMax: 2 * 60 * 1000,
  }]);

  ForwardServerId2Handlers[mbgGame.FS2XFSServerId] = {
    onConnected: onFS2XFSConnected,
    onDisconnected: onFS2XFSDisconnected,
    onMsg: onFS2XFSMsg,
  };
  mbgGame.ForwardServerIDs = [
    mbgGame.FS2XFSServerId,
  ];
  // fwd.setServerDebug(mbgGame.FS2XFSServerId, true);
  fwd.setProtocolRule(mbgGame.FS2XFSServerId, 2, "Process");
  setImmediate(onPoll);
  mbgGame.logger.info(`[setupForwarder] end`);
}


mbgGame.shutdown = function() {
  mbgGame.logger.info("shutdown now");
  if (mbgGame.fwd) {
    mbgGame.fwd.release();
    mbgGame.fwd = null;
  }
};

co(function* () {
  if (process.env.NODE_ENV === "development") {
    mbgGame.devMode = true;
  }
  mbgGame.server = new CServer();
  mbgGame.server.setName("XFS");
  yield mbgGame.server.initServer({
    noDB: true,
  });
  setupForwarder(mbgGame.server_config);
}).catch((err, result) => {
  mbgGame.logError(`[start bs err]`, err);
});