
const co = require('co');

global.mbgGame = require('./gameserver/mbgGame');
const CServer = require('./gameserver/server');

const bs_start = require('./bs/bs_start');

co(function* () {
  mbgGame.server = new CServer();
  mbgGame.server.setName('BS');
  yield mbgGame.server.initServer({
    noDB: true,
    server_started: [
      bs_start.onServerStarted,
    ],
  });
  mbgGame.server.trigger("server_started");
}).catch((err, result) => {
  mbgGame.logError("[start bs err]", err);
});