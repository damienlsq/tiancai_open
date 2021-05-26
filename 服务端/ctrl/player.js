const logger = require('../gameserver/logger');
const co = require('co');
const Cache = require('../gameserver/cache');
const token = require('token');
const CPlayerListenerBase = require('../logic/listener').CPlayerListener;
const playerLogic = require('../logic/player');
const clanCtrl = require('./clan');
const mailCtrl = require('./mail');
const platformCtrl = require('./platform');

token.defaults.secret = 'tiancaimbg';
token.defaults.timeStep = 24 * 60 * 60; // 24h in seconds

const playerLock = mbgGame.common.db_mgr.CExpireNormal.extend({
  FuncType: 'pl',
  SubType: 'locked',
});

class CPlayerListener extends CPlayerListenerBase {
  CType() {
    return 'CPlayerListener';
  }
  onAttrUpdated(key, val) {
    const nPlayer = this.getCtrl();
    if (nPlayer.isReconnecting()) return;
    const sendData = {};
    sendData[key] = val;
    nPlayer.sendCmd('attr', sendData);
  }
}

const NPlayerHashWithPID = mbgGame.common.db_mgr.CHash.extend({
  // name = uuid
  FuncType: 'pl',

  getUUID() {
    return this.key().substr(this.key().indexOf(':') + 1);
  },
  getShortID() {
    const uuid = this.getUUID();
    return uuid.substring(0, 4) + uuid.substring(uuid.length - 4);
  },
  isOnline() {
    return !this.m_Offlined;
  },
  // 增加一个存盘记录一些临时变量,如果指定了outTime,那么该变量有效期为outTime(秒)
  setTimeVar(key, data, outTime) {
    if (!_.isNumber(outTime) || outTime <= 0) {
      this.logError('setTimeVar outTime', outTime, key);
      return null;
    }
    let varList = this.getVal('var');
    if (!varList) {
      varList = {};
      this.setValOnly('var', varList);
    }
    const value = varList[key] || {};
    value.d = data;
    const now = moment().unix();
    if (outTime && !value.t) {
      // 如果有t值就不更新
      value.ot = now + outTime;
    }
    value.t = now;
    varList[key] = value;
    this.syncTimeVar(key);
    return value;
  },
  syncTimeVar(key) {
    const sendData = {};
    sendData[key] = this.getTimeVarObj(key, true);
    this.sendCmd('timeVar', sendData);
  },
  getTimeVar(key, noCheck) {
    if (!noCheck) {
      this.checkExpiredTimeVar();
    }
    const varList = this.getVal('var'); // 是个{}
    if (varList && varList[key]) {
      return varList[key].d;
    }
    return null;
  },
  checkExpiredTimeVar() {
    const varList = this.getVal('var'); // 是个{}
    if (!varList) {
      return;
    }
    const now = moment().unix();
    const remList = [];
    // 删除所有过期的key value
    for (const _key in varList) {
      const data = varList[_key];
      if (data.ot && data.ot <= now) {
        remList.push(_key);
      }
    }
    if (remList && remList.length > 0) {
      for (let i = 0; i < remList.length; i++) {
        const _key = remList[i];
        delete varList[_key];
      }
      this.sendCmd('timeVarRemove', remList);
      const self = this;
      co(function* () {
        yield self.onTimeVarRemoved(remList);
      }).catch((err) => {
        mbgGame.logError(`[ctrl.player.onTimeVarRemoved]`, err);
      });
    }
  },
  *onTimeVarRemoved(remList) {
    for (let i = 0; i < remList.length; i++) {
      const key = remList[i];
      if (key === 'wheel') {
        const pobj = this.getPlayerLogic();
        pobj.m_WheelWar.getDBData();
      } else if (key === 'dailyMail') {
        yield this.checkDailyMail();
      }
    }
  },
  getTimeVarObj(key, noCheck) {
    if (!noCheck) {
      this.checkExpiredTimeVar();
    }
    const varList = this.getVal('var');
    return varList && varList[key];
  },
  delTimeVar(key) {
    const varList = this.getVal('var');
    if (!varList) {
      return;
    }
    delete varList[key];
  },
  // 设置当天有效的变量(到隔天早上4点),比较常用,所以提出来
  setTodayVar(key, value) {
    return this.setTimeVar(
      key,
      value,
      moment({
        hour: 4,
        minute: 0,
        seconds: 0,
      }).unix() +
      86400 -
      moment().unix(),
    ); // 86400=24小时
  },
});

const player = NPlayerHashWithPID.extend({
  SubType: 'data',
  logDebugRealC(...args) {
    const shortID = this.getShortID();
    args.unshift(`[${shortID}-${this.getInfo('nickname')}-Cli]`);
    const clientLogger = logger.getLogger('client');
    clientLogger.info(...args);
  },
  logDebugRealS(...args) {
    const shortID = this.getShortID();
    args.unshift(`[${shortID}-Ser]`);
    const clientLogger = logger.getLogger('client');
    clientLogger.info(...args);
  },
  logInfo(...args) {
    const shortID = this.getShortID();
    args.unshift(`[${shortID}]`);
    mbgGame.logger.info(...args);
  },
  logError(...args) {
    const shortID = this.getShortID();
    args.unshift(`[${shortID}]`);
    mbgGame.logError(args.join(' '));
  },
  // 为保证redis和mysql的数据同步性, 不做从内存保存到mysql
  *mysqlToRedis() {
    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    const uuid = this.getUUID();
    if (!uuid) return false;
    let result = yield mysql.query('SELECT uuid FROM tc_playerinfo WHERE deleted = 0 and uuid = ? ', uuid);
    // mbgGame.logger.info("result:",result);
    if (!result || result.length < 1) {
      return false;
    }
    result = yield mysql.query('SELECT * FROM tc_playerdata WHERE uuid = ? ', uuid);
    // mbgGame.logger.info("result:",result);
    if (result && result.length) {
      const playerData = result[0];
      const redisData = {};
      // 玩家数据都存在data里面,先分解出结构
      const d = JSON.parse(playerData.data);
      _.keys(d).map((x) => {
        redisData[x] = d[x];
        return true;
      });

      const res = yield this.hmset(redisData);
      mbgGame.logger.info('[mysqlToRedis]', uuid);
      if (res === 'OK') return true;
    }
    return false;
  },
  getToken() {
    return this.m_Token;
  },
  validToken(sClientToken) {
    // sClientToken 后6位的token
    if (this.m_Token && this.m_Token === sClientToken) {
      return true;
    }
    this.logInfo('validToken failed.', this.m_Token, sClientToken);
    return false;
  },
  createToken() {
    let sToken = token.generate(this.getUUID());
    sToken = sToken.substr(0, 3) + sToken.substr(-5, 3);
    return sToken;
  },
  getString(key, options) {
    return this.getNetCtrl().getString(key, options);
  },
  *setGM(enabled) {
    if (enabled) {
      yield this.setInfo('gm', 1);
    } else {
      yield this.removeInfo('gm');
    }
    this.logInfo('[GM] set ', this.getUUID(), this.getInfo('gm'));
  },
  getWechatUserInfo() {
    const netCtrl = this.getNetCtrl();
    if (netCtrl.wechatUserInfo) {
      return netCtrl.wechatUserInfo;
    }
    const wechatUserInfo = this.getVal('wechat');
    if (!wechatUserInfo) return null;
    netCtrl.wechatUserInfo = wechatUserInfo;
    return netCtrl.wechatUserInfo;
  },
  *updateWechatMysql() {
    const netCtrl = this.getNetCtrl();
    let openid;
    let unionid;
    if (netCtrl.wechatUserInfo) {
      this.setValOnly('wechat', netCtrl.wechatUserInfo);
      openid = netCtrl.wechatUserInfo.openid;
      unionid = netCtrl.wechatUserInfo.unionid;
    } else {
      const wechatUserInfo = this.getVal('wechat');
      if (!wechatUserInfo) return;
      openid = wechatUserInfo.openid;
      unionid = wechatUserInfo.unionid;
    }
    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    yield mysql.query('update tc_playerinfo set wechat_id = ? , wechat_unionid = ? where uuid = ? ', [
      openid,
      unionid,
      this.getUUID(),
    ]);
  },
  // 更新第三方平台接口数据
  *updatePlatformData() {
    const netCtrl = this.getNetCtrl();
    if (netCtrl.channel_id !== 'aligames') {
      return;
    }
    if (netCtrl.platformData) {
      this.setValOnly('platformData', netCtrl.platformData);
    } else {
      const platformData = this.getVal('platformData');
      this.logInfo('[platformData] ', platformData);
      if (!platformData) return;
      netCtrl.platformData = platformData;
    }
    yield platformCtrl.collectUserData(this);
  },
  *setPushToken(pushToken) {
    if (!pushToken) return;
    pushToken = pushToken.replace(/[ <>]/g, '');
    yield this.setInfo('push_token', pushToken);
    let type = '';
    const arr = pushToken.split('.');
    let bundle_id = 'yourgamepackagename';
    switch (arr[0]) {
      case '1': // mbg 正式服
        type = 'apn';
        break;
      case '4': // test 测试服
        type = 'apn';
        bundle_id = 'yourgamepackagename-test';
        break;
      case '7':
        type = 'apn';
        bundle_id = 'yourgamepackagename-mbgtest';
        break;
      case '2': // onesignal
        type = 'onesignal';
        break;
      case '3': // 友盟
        type = 'umeng';
        break;
      default:
        type = arr[0];
        break;
    }
    yield mbgGame.serverCtrl.registerNoti(this.getUUID(), arr[1], bundle_id, type);
  },
  needNotification() {
    if (!this.isSilent() && !this.isClientOffline()) {
      // 不在安静模式 且 玩家在线 就不要发推送
      return false;
    }
    return true;
  },
  sendNotification(mes) {
    if (!this.needNotification()) {
      return;
    }
    const self = this;
    co(function* () {
      yield mbgGame.serverCtrl.sendNotification(mes, self.getUUID());
    }).catch((err, result) => {
      mbgGame.logError(`[ctrl.player.sendNotification]`, err);
    });
  },
  getInfo(key) {
    // 增加或减少变量, player info主要存放和逻辑无关的内容
    const info = this.getVal('info') || {};
    if (key) {
      return info[key];
    }
    return info;
  },
  getClanUUID() {
    return this.getVal('clan_uuid');
  },
  *getClanUUIDRedis() {
    const clanUUID = yield this.hget('clan_uuid');
    if (clanUUID) {
      this.setValOnly('clan_uuid', clanUUID);
      return clanUUID;
    }
    return null;
  },
  *setClan(clanUUID) {
    this.setValOnly('clan_uuid', clanUUID);
    yield this.saveAsync();
  },
  *removeClan() {
    this.removeVal('clan_uuid');
    yield this.saveAsync();
  },
  *removeInfo(key) {
    const info = this.getVal('info');
    if (info) {
      delete info[key];
      this.setValOnly('info', info);
      yield this.hmset({
        info: JSON.stringify(info),
      });
    }
  },
  *setInfo(key, value) {
    // info 一般为较为重要的变量设置,需要马上存盘
    const info = this.getVal('info') || {};
    info[key] = value;
    this.setValOnly('info', info);

    yield this.hmset({
      info: JSON.stringify(info),
    });
  },
  // 检查玩家是否在其它服务器
  *checkPlayer() {
    const self = this;
    // 玩家基础信息
    const serverName = yield this.getServerName();
    if (serverName && serverName !== mbgGame.server_config.HOSTNAME) {
      if (mbgGame.serverOnlineName.indexOf(serverName) === -1) {
        // 如果玩家的服务器不在线，强行清楚
        yield self.hdel('server');
        self.removeVal('server');
        this.logInfo('[checkPlayer] serverNotOnline');
        return true;
      }

      // 玩家正在玩的服务器不是当前服务器
      const redis = mbgGame.common.db_mgr.getDB('redis-stat');
      // 发送消息踢玩家下线
      yield redis.publish(`${mbgGame.ProjectName}:mbg_stat`, `kickPlayer ${self.getUUID()} ${serverName}`);
      this.logInfo(`[checkPlayer] send kickPlayer [${serverName}]`);
      return false;

      /*
      let server_ip = yield redis.hmget(server_info + serverName, "ip");
      server_ip = server_ip[0];
      mbgGame.logger.info("login to serverip", server_ip);
      if (server_ip){
 
      }
      */
    }

    this.logInfo('[checkPlayer]', self.key(), serverName);
    return true; // 玩家可以登录此服务器
  },
  // 标记玩家为内测用户，内测开始时，放到initPlayer, 必须手动放代码，以防不测
  setCloseBetaTest() {
    // 记录内测开始时间
    this.setVal('CloseBeta', moment().unix());
    this.logInfo('[setCloseBetaTest]');
  },
  // 重置玩家数据，给予玩家补偿，内测结束后，必须手动放代码
  *closeBetaTestAward() {
    const hasCloseBeta = yield this.hget('CloseBeta');
    if (!hasCloseBeta) {
      this.logInfo('[closeBetaTest] no CloseBeta', hasCloseBeta);
      this.logInfo('[closeBetaTest] uuid', this.getUUID(), this.key());
      const dAll = yield this.hgetall();
      this.logInfo(dAll);
      return null;
    }
    let dInfo = yield this.hget('info');
    dInfo = dInfo && JSON.parse(dInfo);
    this.logInfo('[closeBetaTest] ', dInfo && dInfo.nickname);
    // 查出充值记录
    const iStatSID = mbgGame.config.StatName2StatID.chargeGet;
    let dStat = yield this.hget('stat');
    dStat = dStat && JSON.parse(dStat);
    let diamonds = 0;
    if (dStat) {
      diamonds = dStat[iStatSID];
      this.logInfo('[closeBetaTest] diamonds', diamonds);
    } else {
      this.logInfo('[closeBetaTest] no charge ');
    }

    // Note:全局信息应该在后台统一清，这里只清除玩家自身的数据

    // 重置玩家公会数据
    yield this.removeClan();

    // 删除玩家所有邮件
    yield mailCtrl.clearMail(this.getUUID());

    // 清掉除了info之外的玩家个人数据
    const keys = yield this.hkeys();
    if (keys) {
      const reservedKeys = []; // 要保留的信息
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (reservedKeys.indexOf(key) !== -1) {
          continue;
        }
        yield this.hdel(key);
      }
    }
    // 清除内测标记
    yield this.hdel('CloseBeta');
    this.logInfo('[closeBetaTestAward] success');
    return {
      diamonds,
    };
  },

  *initPlayer(isNewUser) {
    if (!isNewUser) {
      const isExists = yield this.selfExists();
      if (!isExists) {
        // redis没有玩家数据,尝试从mysql读取
        const ret = yield this.mysqlToRedis();
        if (!ret) {
          // 如果该uuid连mysql都没有记录,那么是非法uuid
          // warn就好，可能是清档导致的
          mbgGame.logger.warn(`[initPlayer] mysqlToRedis failed. ${this.key()}`);
          return false;
        }
      }
    }

    /*
    let dBetaTestInfo;
    if (mbgGame.config.closeBetaTest) {
      if (!isNewUser) {
        // 处理内测数据补偿
        dBetaTestInfo = yield this.closeBetaTestAward();
        if (dBetaTestInfo) {
          isNewUser = true;
        }
      }
    }
    */
    const self = this;
    const netCtrl = this.getNetCtrl();
    const pobj = new playerLogic();
    self.setPlayerLogic(pobj);
    const listener = new CPlayerListener();
    listener.setCtrl(self);
    pobj.registerListener(listener);
    pobj.addDataObj('player', self);

    // 玩家基础信息
    let dRedisData;
    if (isNewUser) {
      // 初始化redis数据结构
      self.initData();
      // 默认新建玩家数据
      pobj.newPlayer();
      pobj.unlockPlot(1, true);
      pobj.unlockStoryWorld(6);
      pobj.unlockCharaByID(1);
      pobj.unlockCharaByID(3);

      const minFrames = Math.floor(mbgGame.config.constTable.flagMax[0] / 1000);
      const minFlags = Math.floor(mbgGame.config.constTable.flagMax[0] % 1000);
      const maxFrames = Math.floor(mbgGame.config.constTable.flagMax[1] / 1000);
      const maxFlags = Math.floor(mbgGame.config.constTable.flagMax[1] % 1000);
      const defaultTotem = _.random(minFrames, maxFrames) * 1000 + _.random(minFlags, maxFlags);
      if (netCtrl && netCtrl.wechatUserInfo) {
        this.setValOnly('wechat', netCtrl.wechatUserInfo);
        // 设置默认昵称
        if (netCtrl.wechatUserInfo.nickname) {
          yield this.setNickName(netCtrl.wechatUserInfo.nickname);
        }

        /*
        if (netCtrl.wechatUserInfo.headimgurl) {
          defaultTotem = -1;
        }
        */
      }
      pobj.m_Stat.setStatVal('totalTime', moment().unix());
      yield this.setInfo('totem', defaultTotem);

      /*
      // 这里放置内测开始代码，内测结束后删除
      if (!mbgGame.config.closeBetaTest) {
        this.setCloseBetaTest();
      }
      // 内测充值的钻石返还给玩家
      if (dBetaTestInfo && dBetaTestInfo.diamonds) {
        const diamonds = Math.ceil(dBetaTestInfo.diamonds * 1.5);
        yield mailCtrl.addMail(this.getUUID(), {
          kTitle: 'mailt_betaAward',
          kContent: 'mailc_betaAward',
          award: {
            diamonds,
          },
        });
      }
      */
      yield this.saveAsync();
      // 第一次初始化玩家数据的时候，也加上ttl
      yield this.setExpireBySeconds(mbgGame.config.redisSaveExpire || 30 * 86400);
    } else {
      dRedisData = yield self.hgetall();
      if (!dRedisData) {
        mbgGame.logError(`[initPlayer] no dRedisData. ${self.key()}`);
        return false;
      }
      // 把读入数据json.parse
      self.onLoaded(dRedisData);
    }
    for (let i = 0; i < 100000; i++) {
      const sToken = self.createToken();
      if (Cache.get(`Player:${sToken}`)) {
        continue;
      }
      self.m_Token = sToken;
      break;
    }
    // 加载完毕
    self.m_Inited = true;
    Cache.set(`Player:${self.getUUID()}`, self);
    Cache.set(`Player:${self.getToken()}`, self);
    mbgGame.serverCtrl.serverPlayerCount += 1;

    this.logInfo('[initPlayer] isNewUser:', isNewUser);
    pobj.onFirstInitPlayer(isNewUser);
    if (mbgGame.debuglog) {
      yield this.setGM(true);
    }
    return true;
  },
  *onEnterGame() {
    yield this.checkDailyMail();
  },
  *checkDailyMail() {
    const dDailyMail = this.getTimeVarObj('dailyMail');
    if (dDailyMail && !dDailyMail.ot) {
      this.logInfo('fixbug dailyMail', dDailyMail);
      this.delTimeVar('dailyMail');
    }
    if (mbgGame.config.constTable.dailyMail && !this.getTimeVar('dailyMail')) {
      // 如果不是新用户，就判断发送每日礼包
      let endTime;
      const now = moment().unix();
      let awardKey;
      for (let i = 0; i < mbgGame.config.constTable.dailyMail.length; i++) {
        const dConfig = mbgGame.config.constTable.dailyMail[i];
        const durationHour = dConfig.d || 3;
        const startHour = dConfig.t;
        const startTime = this.transHour2Timestamp(startHour);
        endTime = this.transHour2Timestamp(startHour + durationHour);
        if (now >= startTime && now <= endTime) {
          awardKey = dConfig.a;
          break;
        }
        // console.log("refreshTime", endTime, t, x, moment(t * 1000).format());
      }
      const duration = Math.max(0, endTime - now);
      if (duration > 0) {
        if (awardKey) {
          yield mailCtrl.addMail(this.getUUID(), {
            kTitle: `awdtitle${awardKey}`,
            kContent: `awddesc${awardKey}`,
            award: mbgGame.config.award[awardKey],
          });
          this.logInfo('dailyMail duration', duration, endTime, now);
          this.setTimeVar('dailyMail', 1, duration);
        }
      }
    }
  },
  transHour2Timestamp(hour) {
    let t;
    if (_.isNumber(hour)) {
      t = moment({
        hour,
        minute: 0,
        seconds: 0,
      }).unix();
    } else if (_.isString(hour)) {
      t = moment(hour, ['HH:mm', 'HH:mm:ss', 'HH']).unix();
    }
    return t;
  },
  *setNickName(name) {
    if (!name || name.length < 2 || name.length > 16) return false;
    const ret = yield mbgGame.serverCtrl.check_nickname(name);
    if (!ret) return false; // 不能用

    // 取消旧名
    const oldName = this.getInfo('nickname');
    if (oldName) {
      yield mbgGame.serverCtrl.remove_nickname(oldName);
    }

    yield this.setInfo('nickname', name);
    yield mbgGame.serverCtrl.register_nickname(name);

    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    const res = yield mysql.query('update tc_playerinfo set nickname = ? where uuid = ? ', [name, this.getUUID()]);

    this.logInfo('[setNickName]', res);
    return true;
  },
  getTotem() {
    return this.getInfo('totem') || 0;

    /*
    if (totem === -1) {
      const wechatInfo = this.getVal('wechat');
      if (wechatInfo) {
        totem = wechatInfo.headimgurl;
      }
    }
    */
  },
  getChatTotem() {
    const wechatInfo = this.getVal('wechat');
    if (wechatInfo) {
      return wechatInfo.headimgurl;
    }
    return 0;
  },
  sendUserInfo() {
    const userInfo = {
      nickname: this.getInfo('nickname'),
      totem: this.getTotem(),
      describe: this.getInfo('describe'),
      gc_id: this.getInfo('gc_id'),
      // email: this.getInfo("email"),
    };
    const wechatInfo = this.getVal('wechat');
    if (wechatInfo) {
      if (wechatInfo.nickname) {
        userInfo.wechatNickname = wechatInfo.nickname.substr(0, 8);
      }
      if (wechatInfo.headimgurl) {
        userInfo.headimgurl = wechatInfo.headimgurl;
      }
      userInfo.bindWechat = true;
    }
    const netCtrl = this.getNetCtrl();
    if (netCtrl.platformData) {
      if (netCtrl.platformData.nickname) {
        userInfo.wechatNickname = netCtrl.platformData.nickname;
      }
    }

    /*
       userInfo.gc_id_bindinfo = sendData.gc_id ? this.getString("binded") : this.getString("unbind");
 
        if (userInfo.email) {
          userInfo.email_verify = ctrl.getInfo("emailVerify");
          userInfo.email_bindinfo = userInfo.email_verify ? this.getString("binded") : this.getString("unverify");
        } else {
          userInfo.email_bindinfo = this.getString("unbind");
        }
    */
    this.sendCmd('userInfo', userInfo);
  },
  onSave() {
    // if (!this.isOnline()) return;
    // 发生存盘，说明有数据变更，刷新给客户端
    /*
    //TODO  只刷新改变的部分
    this.sendCmd("refresh", {
        "type": "player",
        "data": this.data()
    });
    */
  },
  setReconnecting(b) {
    this.m_reconnecting = b;
  },
  isReconnecting() {
    return this.m_reconnecting;
  },
  isInited() {
    return this.m_Inited === true;
  },
  getPlayerLogic() {
    return this.m_playerLogic;
  },
  setPlayerLogic(pobj) {
    this.m_playerLogic = pobj;
  },
  pid() {
    return this.name();
  },
  // 客户端是否离线
  isClientOffline() {
    const online = this.getVal('online');
    return online !== 1;
  },
  cleanOnlineFlag() {
    this.removeValOnly('online');
  },
  // 客户端是否在线
  isClientOnline() {
    const online = this.getVal('online');
    return online === 1;
  },
  // 标记客户端离线
  setClientOfflineFlag() {
    const online = this.getVal('online');
    if (online === 1) {
      this.setValOnly('online', 0);
    }
  },
  // 标记客户端在线
  setClientOnlineFlag() {
    if (this.getVal('online') === 1) {
      return;
    }
    this.setValOnly('online', 1);
  },
  stopHeartbeat() {
    if (this.m_HeartbeatTimer != null) {
      mbgGame.common.timer.removeTimer(this.m_HeartbeatTimer);
      delete this.m_HeartbeatTimer;
    }
  },
  heartbeat() {
    const self = this;
    self.heartbeatCount = 0;
    if (self.m_HeartbeatTimer) {
      this.logError('[heartbeat] has m_HeartbeatTimer');
      return;
    }
    this.logInfo('[heartbeat] start');
    self.m_HeartbeatTimer = mbgGame.common.timer.setRepeatTimer(mbgGame.config.PlayerHeartBeatInterval || 60000, () => {
      if (self.heartbeatCount > (mbgGame.config.PlayerHeartBeatTolerate || 15)) {
        self.logInfo(`[heartbeat] heartbeatCount>${mbgGame.config.PlayerHeartBeatTolerate}, uuid=`, self.getUUID());
        self.offline(true, 'heartbeat');
        return;
      }
      self.heartbeatCount += 1;
      self.sendCmd('heartbeat', {});
      if (mbgGame.debuglog) {
        // self.logInfo("[heartbeat]", self.heartbeatCount, self.getUUID());
      }
    });
  },
  isSilent() {
    return this.heartbeatCount >= 3;
  },
  heartbeatCB() {
    // this.logInfo("heartbeatCB", this.heartbeatCount);
    this.heartbeatCount = 0;
  },
  *online() {
    // 设置服务器记录
    this.logInfo('online server:', mbgGame.server_config.HOSTNAME);
    this.setVal('server', mbgGame.server_config.HOSTNAME);
    // 登记服务器在线
    yield mbgGame.serverCtrl.addOnline(this.getUUID());

    yield this.saveAsync();

    // 玩家在线的时候，重置redis计时器
    yield this.setExpireBySeconds(mbgGame.config.redisSaveExpire || 30 * 86400);
    this.stopHeartbeat();
    this.heartbeat();
  },

  // [debug] 删除用户 - 用户选择重置
  *removeData() {
    const uuid = this.getUUID();

    const force = true;
    this.offline(force, 'removeData'); // 强制离线

    // 清除redis数据
    this.del();

    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    yield mysql.query('update tc_playerinfo set deleted = 1 where uuid = ? ', [uuid]);
    yield mbgGame.Arena.removePlayer(this);
    yield this.remRankList();

    this.logInfo('[removeData] uuid ', uuid);
  },
  updateRaidRank(idx, maxLv) {
    const uuid = this.getUUID();
    co(function* () {
      yield mbgGame.rankList.setScore(`raid${idx}`, uuid, maxLv);
    }).catch((err, result) => {
      self.logError('[updateRaidRank] err ', JSON.stringify(err), result);
    });
  },
  // 添加到一些排行榜,玩家在realOffline时调用,主要生成一些排行榜给后端统计用
  *addRankList() {
    const uuid = this.getUUID();
    const pobj = this.getPlayerLogic();
    // 胜率统计
    const winTimes = pobj.m_Stat.getStatVal('WinTimes');
    const pvpTimes = pobj.m_Stat.getStatVal('PVPTimes');
    if (pvpTimes > 0 && winTimes > 0) {
      const winRate = ((winTimes / pvpTimes) * 100).toFixed(2);
      if (winRate > 30) {
        // 胜率大于30才统计
        yield mbgGame.rankList.setScore('winRate', uuid, winRate);
      }
    }
    yield mbgGame.rankList.setScore('diamonds', uuid, pobj.getDiamonds());
    yield mbgGame.rankList.setScore('coins', uuid, pobj.m_Stat.getStatVal('coins'));
  },
  *remRankList() {
    const uuid = this.getUUID();

    yield mbgGame.rankList.cleanRankData(uuid);
  },
  addItemAwardMail(dataList) {
    const self = this;
    this.getNetCtrl().sendNotify(this.getString('mailc_bagfull'));
    co(function* () {
      yield mailCtrl.addMail(self.getUUID(), {
        kTitle: 'mailt_bagfull',
        kContent: 'mailc_bagfull',
        award: {
          itemdatas: dataList,
        },
      });
    }).catch((err, result) => {
      self.logError('[addMail] err ', JSON.stringify(err), result);
    });
  },
  *getServerName() {
    let serverName = yield this.hget('server');
    if (serverName && serverName.indexOf(`"`) !== -1) {
      // 直接get出来的会有双引号
      serverName = JSON.parse(serverName);
    }
    return serverName;
  },
  *realOffline_generator(reason) {
    this.stopHeartbeat();
    const pobj = this.getPlayerLogic();
    const serverName = yield this.getServerName();
    let retToMysql = 999;
    let retSetExpire = 999;
    // 存盘 清除服务器标记
    yield this.hdel('server');
    this.removeVal('server');
    if (serverName && serverName === mbgGame.server_config.HOSTNAME) {
      // 存盘
      yield this.saveAsync();
      // 清除服务器在线
      yield mbgGame.serverCtrl.removeOnline(this.getUUID());

      // 存盘到mysql,并不会清除redis数据
      retToMysql = yield mbgGame.serverCtrl.redisToMysql(this.getUUID());
      if (retToMysql) {
        // 设置有效期,时长应该需要保证比mysql存盘时间要长
        // Debug
        retSetExpire = yield this.setExpireBySeconds(mbgGame.config.redisSaveExpire || 30 * 86400);
        // yield this.setExpireBySeconds(99999999 || mbgGame.config.redisSaveExpire || 30 * 86400);
      }
    }
    // 添加排行榜
    yield this.addRankList();
    // 异常数据监测
    try {
      yield this.checkAbnormal();
    } catch (e) {
      mbgGame.logError('[checkAbnormal] err:', e);
    }
    pobj.onServerOffline();
    // 清内存
    Cache.del(`Player:${this.getUUID()}`);
    Cache.del(`Player:${this.getToken()}`);
    mbgGame.serverCtrl.serverPlayerCount -= 1;
    const netCtrl = this.getNetCtrl();
    if (netCtrl) {
      netCtrl.release();
    }
    this.setNetCtrl(null);
    if (this.m_Offlining) {
      delete this.m_Offlining;
    }
    this.m_Offlined = true;

    this.logInfo(
      `[realOffline_generator] reason:${reason} save redis-server:`,
      serverName,
      'cur-server:',
      mbgGame.server_config.HOSTNAME,
      this.getUUID(),
      'ret',
      retToMysql,
      retSetExpire,
    );
  },
  // 服务端离线，服务器的player下线
  realOffline(pushKey, reason) {
    if (this.m_Offlining) return;
    if (this.m_Offlined) {
      this.logError('[realOffline] again?', this.getUUID());
      return;
    }
    this.logInfo('[realOffline] begin');
    this.m_Offlining = true;
    if (pushKey) {
      this.sendNotification(this.getString(pushKey));
    }
    const pobj = this.getPlayerLogic();
    pobj.onLeaveGame();
    const self = this;
    co(function* () {
      yield self.realOffline_generator(reason);
    }).catch((err, result) => {
      self.logError(err.stack);
      self.logError('[realOffline] err ', JSON.stringify(err), result);
    });
  },
  // 客户端离线，服务器的player依然在线
  offline(force, reason, pushKey) {
    this.logInfo('[ctrl.player] offline', reason, force, this.m_Offlining, this.m_Offlined);
    if (this.m_Offlining || this.m_Offlined) {
      return;
    }
    this.setClientOfflineFlag();
    // 玩家离线,这里离线的意义在于不需要发送网络包给玩家
    // 如玩家按home键进入后台等操作,都会触发offline
    const netCtrl = this.getNetCtrl();
    if (netCtrl) {
      netCtrl.sendWarning(this.getString('disconnectInfo'), 'restart');
    }
    this.stopHeartbeat();
    const pobj = this.getPlayerLogic();
    pobj.onClientOffline(force);
    clanCtrl.clanLogout(this);

    if (force) {
      this.realOffline(pushKey, reason);
    } else {
      // 通知xfs玩家下线
      mbgGame.fwd.forwardText(
        mbgGame.FS2GSServerId,
        0,
        JSON.stringify({
          cmd: 'delUser',
          uuid: pobj.getUUID(),
        }),
        mbgGame.FS2XFSServerId,
        0,
        true,
      );
    }
  },
  onArenaUnlocked() {
    const self = this;
    co(function* () {
      yield self.onArenaUnlocked_generator();
    }).catch((err, result) => {
      mbgGame.logError('[onArenaUnlocked] err ', err);
    });
  },
  *onArenaUnlocked_generator() {
    this.logInfo('onArenaUnlocked addPlayer');
    const has = yield mbgGame.Arena.hasPlayer(this);
    if (!has) {
      yield mbgGame.Arena.addPlayer(this);
      yield mbgGame.Arena.syncScoreAndRank(this, 'unlockpvp');
      this.logInfo('onArenaUnlocked addPlayer done');
    } else {
      this.logInfo('onArenaUnlocked error has player');
    }
  },
  refreshStatData() {
    // 刷新统计数据
    const pobj = this.getPlayerLogic();
    const self = this;

    co(function* () {
      mbgGame.rankList.multi();
      const keys = [
        ['like', 'LikeTimes'],
        ['unlike', 'UnlikeTimes'],
        ['tips', 'TipsTimes'],
        ['winStreak', 'winStreak'],
        ['AllWinTimesA', 'AllWinTimesA'],
        ['AllWinTimesP', 'AllWinTimesP'],
      ];
      for (let i = 0; i < keys.length; i++) {
        const k1 = keys[i][0];
        mbgGame.rankList.getScoreMulti(k1, self.getUUID());
      }
      const counts = yield mbgGame.rankList.exec();
      mbgGame.logger.info(`refreshStatData`, counts);
      for (let i = 0; i < keys.length; i++) {
        const k2 = keys[i][1];
        let count = counts[i];
        count = parseInt(count);
        if (count > 0) {
          const ok = pobj.m_Stat.setStatVal(k2, count);
          if (mbgGame.debuglog) {
            const iStatSID = mbgGame.config.StatName2StatID[k2];
            mbgGame.logger.info(`setStatVal ${k2}`, count, 'ok', ok, iStatSID);
          }
        }
      }
    }).catch((err, result) => {
      mbgGame.logError('[refreshStatData] err ', err);
    });
  },
  *feedback(data) {
    const insertData = {
      uuid: this.getUUID(),
    };
    if (data.content && data.content.length < 128 * 1024) {
      insertData.content = data.content;
    }
    if (data.email && data.email.length < 255) {
      insertData.email = data.email;
    }
    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    yield mysql.query('insert ignore into tc_feedback set ?', [insertData]);

    mbgGame.serverCtrl.sendServerWarning(`
1. ID：${this.getShortID()} [信息] [充值]
2. 昵称：${this.getInfo('nickname')}
3. 问题反馈：${data.content}`);
  },
  *checkAbnormal() {
    // 检查玩家数据是否有异常，如果有，就记录下来
    if (!mbgGame.config.abnormalCheck) return;
    let doInsert = false;
    const insertData = {
      uuid: this.getUUID(),
      desc: '',
    };
    const pobj = this.getPlayerLogic();
    pobj.logInfo('checkAbnormal', insertData.uuid);
    let checkValue;
    const self = this;
    if (mbgGame.config.abnormalCheck.stat) {
      _.mapObject(mbgGame.config.abnormalCheck.stat, (value, key) => {
        checkValue = pobj.m_Stat.getStatVal(key);
        if (checkValue > value) {
          insertData.desc += self.getString(`stat_${key}`);
          doInsert = true;
        }
      });
    }

    if (mbgGame.config.abnormalCheck.attr) {
      const attr = this.getVal('attr');
      _.mapObject(mbgGame.config.abnormalCheck.attr, (value, key) => {
        checkValue = attr[key];
        if (checkValue > value) {
          insertData.desc += self.getString(key);
          doInsert = true;
        }
      });
    }

    if (doInsert) {
      const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
      yield mysql.query('insert ignore into tc_abnormalplayer set ?', [insertData]);
    }
  },
});

module.exports = {
  player,
  playerLock,
};
