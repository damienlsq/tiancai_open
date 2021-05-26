const co = require('co');
const apn = require('node-apn-http2');
const DingTalkRobot = require('dingtalk-notify');
const requestco = require('co-request');
const Cache = require('../gameserver/cache');
const aliyunOpenAPI = require('../gameserver/aliyun-openapi');
const umengPush = require('../gameserver/umeng');
const oneSignal = require('../gameserver/onesignal');
// var pm2 = require('pm2');

const clanCtrl = require('./clan');
const mailCtrl = require('./mail');

let pushServerUrl = 'http://127.0.0.1:3043';

const gameName = 'tc';
const MYSQL_PLAYERDATE_VERSION = '1'; // 存盘版本号
const server_list = `${gameName}_s_server_list`;
const player_data = `${gameName}_pl_h_data:`; // 为了方便使用,这里写死key好了
const nickname_list = `${gameName}_s_nickname_list`; // 保存所有昵称,用来检查是否存在重名

const CServerInfo = mbgGame.common.db_mgr.CHash.extend({
  FuncType: 'server',
  SubType: 'info',
});

const serverCrashList = mbgGame.common.db_mgr.CSet.extend({
  FuncType: 'server',
  SubType: 'crash',
});

// 通用,用来生成各种自增长ID
const serverCount = mbgGame.common.db_mgr.CNormal.extend({
  // key: tag
  FuncType: 'count',
  *getID(type) {
    this.SubType = type;
    return yield this.incr();
  },
});

const serverCtrl = mbgGame.common.db_mgr.CSet.extend({
  FuncType: 'server',
  SubType: 'online',

  // 为保证redis和mysql的数据同步性, 不做从内存保存到mysql,玩家数据只会从redis读入内存
  *redisToMysql(uuid) {
    const mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    const dRedisData = yield redis.hgetall(player_data + uuid);
    if (dRedisData) {
      // mysql存盘为完整的整个json
      const mysqlData = {};
      _.keys(dRedisData).forEach((x) => {
        if (x === 'server') return; // 不保存登录服务器到mysql
        mysqlData[x] = dRedisData[x];
      });
      const res = yield mysql.query(
        `update ${mbgGame.ProjectName}_playerdata set version = ?,data = ? where uuid = ? `,
        [MYSQL_PLAYERDATE_VERSION, JSON.stringify(mysqlData), uuid],
      );

      mbgGame.logger.info('[redisToMysql]', uuid);
      if (res && res.affectedRows) return true;
    }
    return false;
  },
  // 注册回调函数, 查找商品映射id
  onPurchaseQueryProductId(product_id, channel_id) {
    let id = product_id;
    if (mbgGame.config.iosIAPConfig && mbgGame.config.iosIAPConfig[channel_id]) {
      _.mapObject(mbgGame.config.iosIAPConfig[channel_id], (appleID, itemID) => {
        if (product_id === appleID) {
          id = itemID;
        }
      });
    }
    return id;
  },
  // 注册回调函数, 活动商品价格
  onPurchaseQueryPrice(product_id) {
    const dItem = mbgGame.config.shopConfig[product_id];
    if (!dItem) {
      mbgGame.logError(`[onPurchaseQueryPrice] error product_id ${product_id}`);
      return 0;
    }
    return parseInt(+dItem.price * 100);
  },
  // 注册回调函数, 充值回调
  onPurchaseSuccess(uuid, product_id) {
    const dItem = mbgGame.config.shopConfig[product_id];
    if (!dItem) {
      mbgGame.logError(`[onPurchaseSuccess] error product_id : ${uuid}, ${product_id}`);
      return false;
    }
    mbgGame.logger.info('[onPurchaseSuccess]', uuid, dItem);
    const nPlayer = Cache.get(`Player:${uuid}`);
    if (nPlayer) {
      const logic = nPlayer.getPlayerLogic();
      return logic.m_ItemBag.shopBuy(product_id, true);
    }
    return false; // 标记状态未发货
  },

  channelMsgBills(message) {
    const mes = message.split(' ');
    if (mes[0] !== mbgGame.ProjectName) return; // 其它游戏充值
    mbgGame.logger.info('[onChannelMsg] redis-subscribe, msg:', message, 'mes:', mes);
    switch (mes[1]) {
      case 'charged': {
        const nPlayer = Cache.get(`Player:${mes[2]}`);
        if (nPlayer) {
          nPlayer.sendCmd('paySuccess', {
            code: 'ok',
          });
        }
        break;
      }
      case 'refundOK': {
        // 退款接口
        mbgGame.logger.info('[onChannelMsg] refundOK', mes);
        break;
      }
      default:
        break;
    }
  },
  *channelMsg(message) {
    mbgGame.logger.info('[onChannelMsg] redis-subscribe, msg:', message);
    const mes = message.split(' ');

    switch (mes[0]) {
      case 'refreshAll':
        this.serverOnStatRefresh();
        break;
      case 'loadGift':
        yield this.loadGift();
        break;
      case 'clearChat':
        mbgGame.chatCtrl.clearChat();
        break;
      case 'removeChat':
        if (!mes[1]) return;
        mbgGame.chatCtrl.removeChat(JSON.parse(mes[1]), mes[2]);
        break;
      case 'robot': {
        if (mbgGame.server_config.tags.indexOf('main') === -1) return;
        if (mes[1] === 'init') {
          yield mbgGame.Arena.initRobot(true);
          yield mbgGame.Arena.onRefreshGenerator('initRobot');
          yield mbgGame.TCBattleMgr.onRefreshGenerator();
        } else if (mes[1] === 'clear') {
          yield mbgGame.Arena.cleanRobot();
          yield mbgGame.Arena.onRefreshGenerator('clearRobot');
          yield mbgGame.TCBattleMgr.onRefreshGenerator();
        }
        break;
      }
      case 'chat': {
        let content = message.substr(5);

        try {
          content = JSON.parse(content);
        } catch (e) {
          mbgGame.logger.info(`channelMsg chat error:${e.message}`);
          return;
        }

        mbgGame.chatCtrl.sendChatOnline(content);
        break;
      }
      case 'kickPlayer': {
        if (!mes[1]) return;
        let forceKick = false;
        if (mes[2] && mes[2] === mbgGame.server_config.HOSTNAME) {
          forceKick = true;
        }

        yield this.kickUser(mes[1], forceKick, 'push_kick');
        break;
      }
      case 'matchClosed': {
        mbgGame.Gamble.onMatchClosed(+mes[1], mes[2]);
        break;
      }
      case 'setClientLog': {
        if (!mes[1]) {
          mbgGame.logger.info('setClientLog, uuid is null', mes[1]);
          return;
        }
        const nPlayer = Cache.get(`Player:${mes[1]}`);
        if (!nPlayer) {
          mbgGame.logger.info('setClientLog, nPlayer is null', mes[1]);
          return;
        }
        nPlayer.logDebugC = nPlayer.logDebugRealC;
        nPlayer.logDebugS = nPlayer.logDebugRealS;
        mbgGame.logger.info('setClientLog, ok', mes[1]);
        nPlayer.sendCmd('control', {
          isClientLog: 1,
        });
        break;
      }
      case 'serverStarted': {
        const host = mes[0];
        const serverName = mes[1];
        mbgGame.logger.info(`[channel] msg:serverStarted, host:${host} serverName:${serverName}`);
        const dAllServerInfo = yield this.getAllServerInfo();
        mbgGame.bsmgr.initFSConnection(dAllServerInfo, 'channel');
        break;
      }
      case 'maintain': {
        yield this.serverMaintain();
        break;
      }
      case 'systemBroadcast': {
        let content = message.substr(16);

        try {
          content = JSON.parse(content);
        } catch (e) {
          mbgGame.logger.info(`channelMsg systemBroadcast error:${e.message}`);
          return;
        }
        const res = yield this.smembers();
        for (let i = 0; i < res.length; i++) {
          const x = res[i];
          const nPlayer = Cache.get(`Player:${x}`);
          if (!nPlayer) {
            continue;
          }
          const netCtrl = nPlayer.getNetCtrl();
          if (netCtrl) {
            const lang = netCtrl.getLang();
            if (content[lang]) {
              netCtrl.sendWarning(content[lang]);
              mbgGame.logger.info('systemBroadcast', x, content[lang]);
            }
          }
        }
        break;
      }
      case 'removeClan': {
        break;
      }
      case 'newMail': {
        // 通知检查邮件
        const nPlayer = Cache.get(`Player:${mes[1]}`);
        if (!nPlayer) return;
        nPlayer.sendCmd('newMail', {
          count: 1,
        });
        return;
      }
      default:
        break;
    }

    if (!mes[1] || mes[1] !== mbgGame.server_config.HOSTNAME) {
      return;
    }
    switch (mes[0]) {
      case 'frdwarBegin': {
        const [, , code, uuidA, uuidB, host, FSId, cid, sDefender] = mes;
        let dDefender;
        try {
          dDefender = JSON.parse(sDefender);
        } catch (e) {
          mbgGame.logError('[frdwarBegin] parse defender data failed', mes);
          break;
        }
        yield mbgGame.FrdWarCtrl.beginRemoteWar(code, uuidA, uuidB, host, FSId, cid, dDefender);
        break;
      }
      case 'frdwarEnd': {
        mbgGame.FrdWarCtrl.onRemoteWarEnd(...mes);
        break;
      }
      case 'redisToMysql': {
        if (!mes[2]) return;
        yield this.redisToMysql(mes[2]);
        break;
      }
      case 'maintain_single': {
        yield this.serverMaintain();
        break;
      }
      case 'maintain_deploy': {
        yield this.serverMaintain(true);
        break;
      }
      case 'seamlessDeploy': {
        const res = yield this.smembers();
        for (let i = 0; i < res.length; i++) {
          const x = res[i];
          const nPlayer = Cache.get(`Player:${x}`);
          if (!nPlayer) {
            continue;
          }
          const netCtrl = nPlayer.getNetCtrl();
          if (netCtrl) {
            netCtrl.sendMessage('', 'seamlessReconnect', '');
          }
        }
        break;
      }
      case 'saveToRedis': {
        if (!mes[2]) return;
        const nPlayer = Cache.get(`Player:${mes[2]}`);
        if (!nPlayer) return;
        // cach存盘到redis
        yield nPlayer.saveAsync();
        break;
      }
      case 'blockUser': {
        if (!mes[2]) return;
        yield this.blockUser(mes[2]);
        return;
      }
      case 'bindEmail': {
        if (!mes[2]) return;
        const nPlayer = Cache.get(`Player:${mes[2]}`);
        if (!nPlayer) return;
        const netCtrl = nPlayer.getNetCtrl();

        const mysql = mbgGame.common.db_mgr.getDB('mysql-users');

        if (mes[3] === 'bind') {
          // 绑定
          const ret = yield mysql.query(`select uuid from ${mbgGame.ProjectName}_playerinfo where email = ? `, [
            mes[4],
          ]);
          if (ret && ret.length >= 1) {
            if (netCtrl) {
              netCtrl.sendWarning(netCtrl.getString('emailBindFailed'));
            }
          }

          yield mysql.query(`update ${mbgGame.ProjectName}_playerinfo set email = ? where uuid = ? `, [mes[4], mes[2]]);
          yield nPlayer.setInfo('emailVerify', 1);

          mbgGame.logger.info('bindEmail', mes);

          if (netCtrl) {
            netCtrl.sendWarning(netCtrl.getString('emailBindOK'));
          }
        } else if (mes[3] === 'unbind') {
          // 解绑
          yield mysql.query(`update ${mbgGame.ProjectName}_playerinfo set email = null where uuid = ? `, [mes[2]]);
          yield nPlayer.removeInfo('emailVerify');
          yield nPlayer.removeInfo('email');
          if (netCtrl) {
            netCtrl.sendWarning(netCtrl.getString('emailUnBindOK'));
          }
        } else if (mes[3] === 'changeAccount') {
          // 帐号切换成功
          if (netCtrl) {
            // 通知新的uuid,然后重启
            netCtrl.sendCmd('accountInfo', {
              status: 77,
              uuid: mes[5],
            });
            return;
          }
        } else if (mes[3] === 'gmSet') {
          if (mes[4]) {
            yield nPlayer.setInfo('email', mes[4]);
            yield nPlayer.setInfo('emailVerify', 1);
          } else {
            yield nPlayer.removeInfo('emailVerify');
            yield nPlayer.removeInfo('email');
          }
          return;
        }
        if (netCtrl) {
          // 刷新用户界面
          netCtrl.sendCmd('accountInfo', {
            status: -1,
          });
        }
        break;
      }
      case 'restart':
        mbgGame.logger.info('[shutdown] reason: restart');
        mbgGame.shutdown();
        return;
      case 'refresh':
        yield this.serverOnStatRefresh();
        break;
      case 'refreshAliyun':
        yield this.refreshAliYun();
        break;
      case 'stop':
        // pm2.stop('gs_tc');
        return;
      case 'nickname': {
        // 修改呢称
        const nPlayer = Cache.get(`Player:${mes[2]}`);
        if (!nPlayer) return;
        const oldName = nPlayer.getInfo('nickname');
        yield mbgGame.serverCtrl.remove_nickname(oldName);
        if (mes[3]) {
          yield nPlayer.setInfo('nickname', mes[3]);
          yield mbgGame.serverCtrl.register_nickname(mes[3]);
        } else {
          yield nPlayer.removeInfo('nickname');
        }
        nPlayer.sendUserInfo();
        return;
      }
      case 'setInfo': {
        if (!mes[2]) return;
        const nPlayer = Cache.get(`Player:${mes[2]}`);
        if (!nPlayer) return;
        if (mes[4]) {
          yield nPlayer.setInfo(mes[3], mes[4]);
        } else {
          yield nPlayer.removeInfo(mes[3]);
        }
        nPlayer.sendUserInfo();
        break;
      }
      default:
        break;
    }
  },
  sendCmdByUUID(uuid, cmd, dData) {
    const nPlayer = Cache.get(`Player:${uuid}`);
    if (!nPlayer) {
      // remote send
      mbgGame.fwd.forwardText(
        mbgGame.FS2GSServerId,
        0,
        JSON.stringify({
          cmd: 'forward',
          uuid,
          data: JSON.stringify({
            header: {
              _cmd: cmd,
            },
            data: dData,
          }),
        }),
        mbgGame.FS2XFSServerId,
        0,
        true,
      );
    } else {
      nPlayer.sendCmd(cmd, dData);
    }
  },
  *getPlayerServer(uuid) {
    // 此函数可以获取玩家是否在线，在那台server
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    let serverName = yield redis.hget(player_data + uuid, 'server');
    if (serverName && serverName.indexOf('"') !== -1) {
      serverName = JSON.parse(serverName);
    }
    return serverName;
  },
  *kickUser(uuid, forceKick, pushKey) {
    const nPlayer = Cache.get(`Player:${uuid}`);
    if (!nPlayer) {
      if (forceKick) {
        // 强制踢人
        const redis = mbgGame.common.db_mgr.getDB('redis-users');
        yield redis.hdel(player_data + uuid, 'server');
      }
      return;
    }
    if (pushKey === 'push_shutdown' || pushKey === 'push_maintain') {
      // 维护不能使用offline，因为里面用co，异步操作了，需要直接同步使用realOffline_generator
      nPlayer.sendNotification(nPlayer.getString(pushKey));
      yield clanCtrl.generatorClanLogout(nPlayer);
      yield nPlayer.realOffline_generator('kick');
    } else {
      nPlayer.offline(true, 'kickUser', pushKey); // 强制离线
    }
    mbgGame.logger.info('[kickPlayer] ', uuid);
  },
  // 账号封停
  *blockUser(uuid) {
    const nPlayer = Cache.get(`Player:${uuid}`);
    if (!nPlayer) return;
    // 玩家在线
    if (nPlayer.getInfo('blockUser')) {
      yield nPlayer.removeInfo('blockUser');
      mbgGame.logger.info('blockUser: online removeBlock', uuid);
    } else {
      yield nPlayer.setInfo('blockUser', 1);
      nPlayer.sendCmd('block', {
        msg: nPlayer.getString('blockUser'),
      });
      mbgGame.logger.info('blockUser: online setBlock', uuid);
    }
    mbgGame.logger.info('[blockUser] ', uuid);

    yield this.kickUser(uuid, true, 'push_kick');
  },
  *addOnline(uuid) {
    yield this.sadd(uuid);
    mbgGame.logger.info('add online', uuid);
  },
  *removeOnline(uuid) {
    // 只有real offline才会执行此函数
    yield this.srem(uuid);
    mbgGame.logger.info('remove online', uuid);
  },
  *loadGift() {
    const redis = mbgGame.common.db_mgr.getDB('redis-stat');
    const gift = yield redis.get(`${mbgGame.ProjectName}_k_gift_setup`);
    if (gift) {
      mbgGame.gift = JSON.parse(gift);
      for (let i = 0; i < mbgGame.gift.length; i++) {
        const data = mbgGame.gift[i];
        if (data.channel_id) {
          data.channel_id = data.channel_id.split(',');
        }
      }
    } else {
      mbgGame.gift = [];
    }
    mbgGame.logger.info('[loadGift]', mbgGame.gift);
  },
  *getAllServerInfo() {
    const redis = mbgGame.common.db_mgr.getDB('redis-stat');
    const serverNames = yield redis.smembers(server_list);
    if (!serverNames) {
      return null;
    }
    mbgGame.logger.info('getAllServerInfo, servrNames:', serverNames);
    const dInfo = {};
    for (let i = 0; i < serverNames.length; i++) {
      const serverName = serverNames[i];
      const serverInfo = new CServerInfo(serverName);
      serverInfo.setDB('redis-stat');
      const keys = ['host', 'inner_ip'];
      const ret = yield serverInfo.hmget(keys);
      if (ret) {
        if (!ret[0] || !ret[1]) {
          continue;
        }
        const host = ret[0];
        let ip = ret[1];
        if (host === mbgGame.server_config.HOSTNAME) {
          ip = 'localhost';
        }
        dInfo[host] = {
          ip,
        };
      } else {
        mbgGame.logger.info('no server info:', serverName);
      }
    }
    mbgGame.logger.info('getAllServerInfo:', dInfo);
    return dInfo;
  },
  *serverOnStatRefresh() {
    if (!mbgGame.serverInfo) {
      // 还没初始化好mbgGame.serverInfo
      return;
    }

    const footReport = `在线: ${mbgGame.serverCtrl.serverPlayerCount}`;
    // footReport += ` 负载: ${mbgGame.bsmgr.getBusyInfo()} `;
    // footReport += ` 延迟: ${mbgGame.bsmgr.getHeartbeatDelayInfo()}  `;
    const pid2info = mbgGame.bsmgr.getPID2Info();
    pid2info[process.pid] = `在线:${mbgGame.serverCtrl.serverPlayerCount}`;
    if (mbgGame.FSPID) {
      pid2info[mbgGame.FSPID] = `连接数 ENet:${mbgGame.FSENetConns} WS:${mbgGame.FSWSConns}`;
    }

    // mbgGame.logger.info('server_public_ip:', server_public_ip);
    // mbgGame.logger.info('server_inner_ip:', server_inner_ip);
    // const statData = this.getNetStatData();

    const dData = {
      name: mbgGame.server_config.name,
      host: mbgGame.server_config.HOSTNAME,
      ip: mbgGame.server_config.server_public_ip,
      inner_ip: mbgGame.server_config.server_inner_ip,
      start_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      playerCount: this.serverPlayerCount || 0,
      logTime: moment().unix(),
      footReport,
      pid2info: JSON.stringify(pid2info),
      // extraInfo: `流量统计： ${JSON.stringify(statData, null, ' ')}  `,
    };
    // 给后台监控用的图表数据
    let chartValue = yield mbgGame.serverInfo.hget('chartValue');
    if (chartValue) {
      chartValue = JSON.parse(chartValue);
    } else {
      chartValue = {};
    }
    const logKey = `${moment().hours()}:${moment().minutes()}`;
    const statList = [this.serverPlayerCount || 0];
    // statList.push(this.getNetStatData());
    chartValue[logKey] = statList;
    dData.chartValue = JSON.stringify(chartValue);

    // mbgGame.logger.info("serverInfo hmset", dData);
    yield mbgGame.serverInfo.hmset(dData);

    // 读取全局维护标志
    mbgGame.maintainTime = yield mbgGame.serverInfo.DB().get(`${mbgGame.ProjectName}_server_maintain`);
    if (mbgGame.maintainTime) {
      mbgGame.maintainTime = JSON.parse(mbgGame.maintainTime);
    }
    // 读取单机维护标志
    mbgGame.maintainTime_Single = yield mbgGame.serverInfo
      .DB()
      .get(`${mbgGame.ProjectName}_server_maintain_${mbgGame.server_config.HOSTNAME}`);
    if (mbgGame.maintainTime_Single) {
      mbgGame.maintainTime_Single = JSON.parse(mbgGame.maintainTime_Single);
    }

    // 热更新版本
    mbgGame.hotVersion = yield mbgGame.serverInfo.hget('hotVersion');

    const redis = mbgGame.common.db_mgr.getDB('redis-stat');
    mbgGame.serverOnlineName = yield redis.smembers(server_list);

    // 激活链接
    let mysql = mbgGame.common.db_mgr.getDB('mysql-users');
    mysql.query('select 1');
    mysql = mbgGame.common.db_mgr.getDB('mysql-bills');
    mysql.query('select 1');

    // mbgGame.logger.info(`[serverOnStatRefresh] online:${mbgGame.serverCtrl.serverPlayerCount} serverOnline:${mbgGame.serverOnlineName.length}`);
  },
  *serverMaintain(isDeploy) {
    // 刷新维护标志
    const now = +moment();
    yield this.serverOnStatRefresh();

    let maintainTime;
    if (mbgGame.maintainTime_Single) maintainTime = mbgGame.maintainTime_Single;
    if (mbgGame.maintainTime) maintainTime = mbgGame.maintainTime;
    if (maintainTime || isDeploy) {
      // 踢所有玩家下线
      mbgGame.logger.info('[serverMaintain] 维护开始');
      if (maintainTime) {
        mbgGame.logger.info(
          `[serverMaintain] 维护时间：${maintainTime.duration} 秒,模式：${mbgGame.maintainTime ? '全服' : '单服'}`,
        );
      }
      if (isDeploy) {
        mbgGame.logger.info('[serverMaintain] 模式：更新');
      }

      // 设置服务器状态为正在维护
      yield mbgGame.serverInfo.hset('maintainLog', 1);
      if (isDeploy) {
        mbgGame.isServerShutdown = true;
      }
      const res = yield this.smembers();
      mbgGame.logger.info('[serverMaintain] 存盘玩家数据', res.length);
      for (let i = 0; i < res.length; i++) {
        yield this.kickUser(res[i], false, 'push_maintain');
        // mbgGame.logger.log('mbgGame.config.award.maintainAward:', mbgGame.config.award.maintainAward);
        if (mbgGame.config && mbgGame.config.award && mbgGame.config.award.maintainAward) {
          yield mailCtrl.addMail(res[i], {
            kTitle: 'mailt_maintain',
            kContent: 'mailc_maintain',
            award: mbgGame.config.award.maintainAward,
          });
        }
      }
      yield mbgGame.serverInfo.hdel('maintainLog');
      mbgGame.logger.info(`[serverMaintain] 玩家已经全部踢下线，耗时 ${+moment() - now} ms`);
      // 即使同时存在单机维护或全局维护，也只做一个
      return;
    }
    delete mbgGame.isServerShutdown;
    mbgGame.logger.info('[server] maintain 维护取消');
  },
  *serverOnStart() {
    // 服务器关闭和启动时清除服务器所有在线
    mbgGame.logger.info('[serverOnStart] clear all online and register server');
    yield this.del();
    const redis = mbgGame.common.db_mgr.getDB('redis-stat');

    mbgGame.serverInfo = new CServerInfo(mbgGame.server_config.HOSTNAME);
    mbgGame.serverInfo.setDB('redis-stat');

    const crashList = new serverCrashList(mbgGame.server_config.HOSTNAME);
    const res = yield crashList.smembers();
    for (let i = 0; i < res.length; i++) {
      mbgGame.logger.info('save last crash player to mysql ', res[i]);
      const ret = yield this.redisToMysql(res[i]);
      if (ret) {
        yield redis.expire(player_data + res[i], mbgGame.config.redisSaveExpire || 30 * 86400);
      }
    }
    yield crashList.del();

    // 读取验证码等奖励设置
    yield this.loadGift();

    mbgGame.serverCount = new serverCount();
    this.serverPlayerCount = 0;

    yield mbgGame.serverInfo.hdel('maintainLog');
    yield redis.sadd(server_list, mbgGame.server_config.HOSTNAME);

    mbgGame.logger.info('[serverOnStart] host:', mbgGame.server_config.HOSTNAME, 'name:', mbgGame.server_config.name);
    yield this.serverOnStatRefresh();
    yield redis.publish(
      `${mbgGame.ProjectName}:mbg_stat`,
      `serverStarted ${mbgGame.server_config.HOSTNAME} ${mbgGame.server_config.name}`,
    );
    const dAllServerInfo = yield mbgGame.serverCtrl.getAllServerInfo();
    mbgGame.bsmgr.initFSConnection(dAllServerInfo, 'started');

    if (process.env.NODE_ENV !== 'development') {
      mbgGame.serverCtrl.sendServerWarning(`GS重启`);
    }

    yield this.refreshAliYun();

    mbgGame.common.timer.setRepeatTimer(1000 * 30, () => {
      co(function* () {
        yield mbgGame.serverCtrl.serverOnStatRefresh();
      }).catch((err, result) => {
        mbgGame.logger.info('[server Timer] error ', err, result);
      });
    });
  },
  clearOnlineForShutdown() {
    // 服务器关闭和启动时调用,清除服务器所有在线
    const self = this;
    mbgGame.logger.info('[Server exit] SIGINT ... ');
    mbgGame.isServerShutdown = true;
    co(function* () {
      const t = new Date();
      mbgGame.logger.info('clear all online for shutdown', self.key());
      yield mbgGame.serverInfo.hdel('report');
      yield mbgGame.serverInfo.hdel('reportHint');

      const crashList = new serverCrashList(mbgGame.server_config.HOSTNAME);
      const res = yield self.smembers();
      mbgGame.logger.info('online player count:', res.length);
      let ret;
      for (let i = 0; i < res.length; i++) {
        const x = res[i];
        yield self.kickUser(x, true, 'push_shutdown');
        yield crashList.sadd(x);
        mbgGame.logger.info('[shutdown] save ', x, ' to redis, result:', ret);
      }
      yield self.del();
      yield mbgGame.serverInfo.hdel('maintainLog');

      if (!mbgGame.debuglog) {
        const redis = mbgGame.common.db_mgr.getDB('redis-stat');
        yield redis.srem(server_list, mbgGame.server_config.HOSTNAME);
        // 通知所有服务器刷新在线服务器列表
        yield redis.publish(`${mbgGame.ProjectName}:mbg_stat`, 'refreshAll');
      }

      mbgGame.logger.info('[Server exit]', new Date() - t, 'ms');
      mbgGame.fwd && mbgGame.fwd.release();
      process.exit(0);
    }).catch((err, result) => {
      mbgGame.logger.info('shutdown error ', err, result);
    });
  },
  *setAliyunSLBWeight() {
    if (!mbgGame.aliyunConfig || !mbgGame.server_config.instantId) return;
    if (mbgGame.server_config.slbWeight === -1 || mbgGame.server_config.slbWeight === null) return; // 不调整
    if (mbgGame.server_config.slbWeight < 0 || mbgGame.server_config.slbWeight > 100) return;

    yield aliyunOpenAPI.setBackendServers(
      mbgGame.aliyunConfig.LoadBalancerId,
      mbgGame.server_config.instantId,
      mbgGame.server_config.slbWeight,
    );
  },

  *setServerInfo() {
    // 获取或生成serverid
    const info = yield mbgGame.serverInfo.hgetall();
    if (info) {
      mbgGame.server_config.name = info.name;
      if (info.tags) {
        // mbgGame.server_config.tags = JSON.parse(info.tags);
      }
    }
    // mbgGame.server_config.tags = mbgGame.server_config.tags || [];

    if (!mbgGame.server_config.name) {
      // 如果还没有配置，说明是新建服务器，自动获取serverid和servername
      mbgGame.server_config.name = process.env.NODE_ENV === 'development' ? `测试服` : `正式服`;
      yield mbgGame.serverInfo.hset('name', mbgGame.server_config.name);
    }
  },
  *refreshAliYun() {
    // 读取阿里云instant等配置
    const redis = mbgGame.common.db_mgr.getDB('redis-stat');
    const res = yield redis.hget(`mbgStat:GameConfig_${mbgGame.ProjectName}`, 'aliyunConfig');
    if (res) {
      mbgGame.aliyunConfig = JSON.parse(res);
    }
    if (!mbgGame.aliyunConfig || !mbgGame.aliyunConfig.accessKeyId || !mbgGame.aliyunConfig.accessKeySecret) return;
    mbgGame.server_config.server_inner_ip = require('os').networkInterfaces().eth0[0].address;
    const instantData = yield aliyunOpenAPI.queryECSInstanceId(mbgGame.server_config.server_inner_ip);
    if (instantData) {
      yield mbgGame.serverInfo.hset('instantId', instantData.InstanceId);
      mbgGame.server_config.server_public_ip = instantData.PublicIpAddress.IpAddress[0];
    }
    mbgGame.server_config.instantId = yield mbgGame.serverInfo.hget('instantId');
    mbgGame.server_config.slbWeight = yield mbgGame.serverInfo.hget('slbWeight');

    const logLevel = yield mbgGame.serverInfo.hget('debugLog');
    if (logLevel) {
      mbgGame.debugLog = logLevel;
    } else {
      delete mbgGame.debugLog;
    }

    // yield this.setAliyunSLBWeight();

    yield this.setServerInfo();
  },
  // apple apn push
  initForPush() {
    if (mbgGame.otherConfig && mbgGame.otherConfig.APN) {
      mbgGame.apnProvider = new apn.Provider({
        production: true,
        token: {
          key: Buffer.from(mbgGame.otherConfig.APN.key),
          keyId: mbgGame.otherConfig.APN.keyId,
          teamId: mbgGame.otherConfig.APN.teamId,
        },
        connectionRetryLimit: 1,
        hideExperimentalHttp2Warning: true,
      });
      mbgGame.logger.info('Init apple APN, bundle_id', mbgGame.IOSIAPConfig.bundle_id);
    }

    if (mbgGame.otherConfig && mbgGame.otherConfig.oneSignal) {
      // init for signal
      oneSignal.init(mbgGame.otherConfig.oneSignal.AppID, mbgGame.otherConfig.oneSignal.RestApiKey);
    }
  },
  *sendNotification_umeng(token, title, mes, t) {
    if (!token || !mes || !mbgGame.otherConfig || !mbgGame.otherConfig.umengPush) return;
    const msg = {
      ticker: 'title',
      title,
      text: mes,
      after_open: 'go_app',
    };
    let res;
    if (t) {
      res = yield umengPush.push_unicast_delay(
        mbgGame.otherConfig.umengPush.AppKey,
        mbgGame.otherConfig.umengPush.MasterSecret,
        token,
        msg,
        t,
      );
      mbgGame.logger.info('[androidNoti umeng] delay ', t, res, mes);
    } else {
      res = yield umengPush.push_unicast(
        mbgGame.otherConfig.umengPush.AppKey,
        mbgGame.otherConfig.umengPush.MasterSecret,
        token,
        msg,
      );
      mbgGame.logger.info('[androidNoti umeng] ', res, mes);
    }
  },
  *sendNotification_onesignal(token, title, mes) {
    if (!token || !mes || !mbgGame.otherConfig || !mbgGame.otherConfig.oneSignal) return;
    const res = yield oneSignal.notify(title, mes, [token]);
    mbgGame.logger.info('[androidNoti onesinnal] ', res, mes);
  },
  sendNotification_APN(token, mes, token_type) {
    // 1 release  4 test  5 release debug  6 test debug
    if (!mbgGame.apnProvider) return;

    // mbgGame.logger.info('send notice:', mes, token_type, token);

    const note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 1;
    // note.sound = "ping.aiff";
    note.alert = mes;
    // note.payload = { messageFrom: 'John Appleseed' };
    note.topic = mbgGame.IOSIAPConfig.bundle_id;

    mbgGame.apnProvider.send(note, token);

    /*
    .then((result) => {
      // see documentation for an explanation of result
      // mbgGame.logger.info('[APN] sendResult', JSON.stringify(result));
    });
    */
  },
  *sendNotification(mes, uuid, t) {
    yield mbgGame.serverCtrl.sendNoti(uuid, mes, t);
    /*
    const nPlayer = Cache.get(`Player:${uuid}`);
    let s;
    if (!nPlayer) {
      const redis = mbgGame.common.db_mgr.getDB('redis-users');
      let playerData = yield redis.hmget(player_data + uuid, 'info');
      playerData = JSON.parse(playerData[0]);
      if (!playerData || !playerData.push_token) return;
      s = playerData.push_token;
    } else {
      s = nPlayer.getInfo('push_token');
    }

    if (!s) return;
    const token_type = s.substring(0, 1);
    const token = s.substring(2);
    switch (token_type) {
      case '5': // mbg dev
      case '6': // test dev
      case '8': // mbgTest dev
        return; // dev就不要发了，dev就是xcode调试版本
      case '7': // mbgTest
        return; // 这个版本也不发了，因为这个是跑正式版服务器，但用个人开发证书，配置会很乱
      case '1': // mbg 正式服
      case '4': // test 测试服
        mbgGame.serverCtrl.sendNotification_APN(token, mes, token_type);
        return;
      case '2': // onesignal
        yield mbgGame.serverCtrl.sendNotification_onesignal(token, this.getString('zh', 'gameName'), mes);
        return;
      case '3': // 友盟
        yield mbgGame.serverCtrl.sendNotification_umeng(token, this.getString('zh', 'gameName'), mes, t);
        break;
      default:
        break;
    }
    */
  },

  *check_nickname(nickname) {
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    const ret = yield redis.sismember(nickname_list, nickname);
    return !ret;
  },
  *register_nickname(nickname) {
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    yield redis.sadd(nickname_list, nickname);
  },
  *remove_nickname(nickname) {
    const redis = mbgGame.common.db_mgr.getDB('redis-users');
    yield redis.srem(nickname_list, nickname);
  },

  getString(lang, key, options, noerror = false) {
    lang = lang || 'zh';
    const polyglot_key = `${lang}.${key}`;
    const str = mbgGame.i18n.polyglot.t(polyglot_key, options);
    if (str === polyglot_key) {
      if (!noerror) {
        mbgGame.logError(`i18n lost key:${polyglot_key}`);
      }
      return '';
    }
    return str;
  },

  sendServerWarning(msg) {
    if (!mbgGame.reportConfig || !mbgGame.reportConfig.dingTalkErrorToken) return;
    const sendRobot = new DingTalkRobot(mbgGame.reportConfig.dingTalkErrorToken);
    sendRobot.sendMarkdown({
      title: '异常 - 天才联盟',
      text: `#### 天才联盟
    ${msg}
> ###### ${mbgGame.server_config.name} - ${mbgGame.server_config.HOSTNAME} - ${
        mbgGame.server_config.server_public_ip
      } (${moment().format('h:mm:ss')}）`,
    });
  },
  // 流向 = node进程自己的别名-目标node进程的别名-(收包：in，发包：out)
  // (BS(BSID)/GS/FS/XFS)-(BS(BSID)/GS/FS/XFS)-(in/out)
  saveNetStat(data) {
    if (_.isEmpty(data)) {
      return;
    }
    if (!this.m_NetStatData) {
      this.m_NetStatData = {
        // 流向: 累计多少bytes
      };
    }
    Object.assign(this.m_NetStatData, data);
    // mbgGame.logger.info("saveNetStat", this.m_NetStatData);
  },
  getNetStatData() {
    return this.m_NetStatData || {};
  },
  *aiMessageAPI(msg) {
    const content = {
      key: '6c0197a2788546f385724d8af5434c0d',
      info: msg,
    };

    const res = yield requestco.post({
      url: 'http://www.tuling123.com/openapi/api',
      method: 'POST',
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      body: content,
    });

    mbgGame.logger.info('[aiMessageAPI]', res.body);

    if (res.body.code === 100000) {
      return res.body.text;
    }

    return null;
  },

  *registerNoti(uuid, token, bundle_id, type) {
    return; // 废弃
    if (!type || !token || !uuid) return;
    const postData = {
      api: 'add',
      data: {
        type,
        token,
        uuid,
        bundle_id,
        gameId: 'tc',
      },
    };

    mbgGame.logger.log('[pushNotification] register:', pushServerUrl, postData);
    yield requestco.post({
      url: pushServerUrl,
      method: 'POST',
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      body: postData,
    });
  },

  *sendNoti(uuid, mes, t) {
    return; // 废弃
    if (!mes || !uuid) return;
    const postData = {
      api: 'send',
      data: {
        mes,
        uuid,
        gameId: 'tc',
      },
    };
    if (t) {
      postData.data.t = t;
    }

    mbgGame.logger.log('[pushNotification] send:', postData);
    yield requestco.post({
      url: pushServerUrl,
      method: 'POST',
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      body: postData,
    });
  },
});

module.exports = {
  serverCtrl,
};
