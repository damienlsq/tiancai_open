const log4js = require("log4js");

function initLogger() {
  const errFilename = `err.log`;
  // 日志格式就不写配置文件了,需要所有游戏统一日志格式
  const logConfig = {
    appenders: {
      out: {
        type: "console",
        layout: {
          type: "messagePassThrough",
        },
      },
      errAppender: {
        type: "file",
        filename: errFilename,
      },
      err: {
        type: "logLevelFilter",
        level: "error",
        appender: 'errAppender',
      },
      client: {
        type: 'file',
        filename: `client.log`,
      },
    },
    categories: {
      default: { appenders: ['out', 'err'], level: 'all' },
      client: { appenders: ['client'], level: 'all' },
    },
    pm2: true,
  };
  console.log("errFilename", errFilename);
  log4js.configure(logConfig);
  return true;
}

function getLogger(sName) {
  const logger = log4js.getLogger(sName);
  return logger;
}

module.exports = {
  initLogger,
  getLogger,
};