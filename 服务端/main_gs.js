const co = require('co');

global.mbgGame = require('./gameserver/mbgGame');
const CServer = require('./gameserver/server');
const iap = require('./gameserver/iap');

const gs_start = require('./gs_start');
const net = require('./net');

mbgGame.C2GS_CMD_FUNC = net.C2GS_CMD_FUNC;

function init_C2GS_CMD_FUNC(C2GS_CMD_FUNC) {
    const dFuncs = {};
    _.extend(dFuncs, C2GS_CMD_FUNC);
    _.extend(dFuncs, iap.C2GS_CMD_FUNC);
    return dFuncs;
}

co(function* () {
    mbgGame.server = new CServer("GS");
    mbgGame.C2GS_CMD_FUNC = init_C2GS_CMD_FUNC(mbgGame.C2GS_CMD_FUNC);
    yield mbgGame.server.initServer({
        server_started: [
            gs_start.onGSStarted,
        ],
        redisOnReady: gs_start.onGSDBReady_RedisSub,
    });
}).catch((err, result) => {
    mbgGame.logError("[start gs err]", err);
});