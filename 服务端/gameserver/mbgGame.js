const moment = require('moment');
const _ = require('underscore');
const s = require('underscore.string');

_.mixin(s.exports());
global._ = _;
global.moment = moment;


const Class = require("./class");
const keywordFilter = require("./keyword-filter");
const db_mgr = require('./db_mgr');
const timer = require('./timer');
const utils = require('./utils');
const cache = require('./cache');
const cmdfunc = require('./cmdfunc');
const logger = require('./logger');
const stat = require('./stat');

const mbgGame = {
  ProjectName: 'tiancai_open', // 游戏标识
  basePort: 0, // 游戏基本端口号
  platform: "Server",
  common: {
    // 各种类
    Class,
    // 子模块
    db_mgr,
    timer,
    utils,
    keywordFilter,
    cache,
    cmdfunc,
    logger,
    stat,
  },
  getServerPort(service) {
    return mbgGame.server_config[service].port + (mbgGame.basePort * 100);
  },
  profileBegin(key) {
    const now = new Date().getTime();
    this._profileTime = this._profileTime || {};
    let ident; // 区发码，为了支持并发
    let realKey = `${key}${ident || ''}`;
    while (this._profileTime[realKey]) {
      ident = (ident || 0) + 1;
      realKey = `${key}${ident}`;
    }
    this._profileTime[realKey] = {
      s: now, // 开始时间戳
      sl: now, // 上一个phase的时间戳
      p: 0, // 阶段phase
    };
    // mbgGame.logger.info(`profile - ${realKey} - start`);
    return realKey;
  },
  profileNow(realKey, isEnd) {
    const now = new Date().getTime();
    const dData = this._profileTime[realKey];
    const phaseTime = now - dData.sl;
    const totalTime = now - dData.s;
    dData.sl = now;
    dData.p += 1;
    // mbgGame.logger.info(`profile - ${realKey} - ${isEnd ? 'end' : dData.p} - ${phaseTime} ms, ${totalTime} ms`);
  },
  profileEnd(realKey) {
    this.profileNow(realKey, true);
    delete this._profileTime[realKey];
  },
};

module.exports = mbgGame;