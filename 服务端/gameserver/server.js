const os = require('os');
const logger = require('./logger');
const db_mgr = require('./db_mgr');
const developConfig = require('../config/global_config_development');
const productionConfig = require('../config/global_config_production');

function logError(str, err) {
  let msg;
  if (err && err.stack) {
    msg = `${str} ${err} - ${err.stack}`;
  } else {
    const stack = new Error().stack;
    msg = `${str} ${stack}`;
  }
  mbgGame.logger.error(msg);
  if (!mbgGame.serverCtrl) {
    return;
  }
  mbgGame.serverCtrl.sendServerWarning(msg);
}

// 一个进程只需要一个CServer实例
class CServer {
  constructor(name) {
    this.setName(name);
  }
  *initServer(options) {
    let config = developConfig;
    if (process.env.NODE_ENV === 'production') {
      config = productionConfig;
    }

    mbgGame.server_config = config[this.m_Name];
    mbgGame.server_config.Data = config.Data;
    mbgGame.server_config.DB = config.DB;
    mbgGame.server_config.HOSTNAME = os.hostname();
    mbgGame.server_config.tags = ['main'];

    if (!logger.initLogger(mbgGame.server_config)) {
      return false;
    }
    mbgGame.logger = logger.getLogger();
    mbgGame.logger.info(`[Server started] type=${this.m_Name}, cwd=`, `${process.cwd()}, env=`, process.env.NODE_ENV);
    mbgGame.logError = logError;
    if (!options.noDB && mbgGame.server_config.DB) {
      if (options.redisOnReady) {
        // redis onReady
        for (let i = 0; i < mbgGame.server_config.DB.length; i++) {
          const dConfig = mbgGame.server_config.DB[i];
          if (dConfig.name === 'redis-subscribe') {
            dConfig.onReady = options.redisOnReady;
          }
        }
      }
      yield db_mgr.initDSConnection(mbgGame.server_config.DB);
    }
    if (options) {
      this.setEventCallbackDict(options);
    }
    process.on('SIGINT', () => {
      if (mbgGame.shutdown) {
        mbgGame.logger.info('[shutdown] reason: SIGINT');
        mbgGame.shutdown();
      }
    });
    process.on('uncaughtException', (err) => {
      mbgGame.logger.info('uncaughtException', err, err.stack);
      logError('uncaughtException', err);
      // process.emit('exit', 1);
    });
    this.trigger('server_started');
    return true;
  }
  name() {
    return this.m_Name;
  }
  setName(name) {
    this.m_Name = name;
  }
  setEventCallbackDict(callBackDict) {
    this.m_EventCallbackDict = callBackDict;
  }
  trigger(sEvent) {
    const callBackDict = this.m_EventCallbackDict;
    if (!callBackDict) {
      return;
    }
    if (!callBackDict[sEvent]) {
      return;
    }
    const cbLst = callBackDict[sEvent];
    for (const i in cbLst) {
      const callback = cbLst[i];
      if (!callback) {
        mbgGame.logError(`[trigger] callback is null. idx=${i}`);
        continue;
      }
      callback();
    }
  }
}

module.exports = CServer;
