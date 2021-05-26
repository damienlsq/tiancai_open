const Cache = require('../gameserver/cache');
const uuid_module = require('uuid');
const co = require('co');
const mailCtrl = require('./mail');

// /////////////////////////////
// /     联盟系统
// /////////////////////////////

// 0 聊天 1 申请 2 系统 3 友谊 4 求助 5 分享战报 6 分享道具

// 联盟名字列表
const NClanListByName = mbgGame.common.db_mgr.CSet.extend({
  FuncType: "clan",
  SubType: "name",

  * checkName(name) {
    const ret = yield this.sismember(name);
    return !ret;
  },
  * registerName(name) {
    return yield this.sadd(name);
  },
  * removeName(name) {
    return yield this.srem(name);
  },
});

// 联盟数据
const NClan = mbgGame.common.db_mgr.CHash.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "data",
});

// 联盟玩家在线UUID集合
const NClanOnline = mbgGame.common.db_mgr.CSet.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "online",
});

// 联盟事件
const NClanEvent = mbgGame.common.db_mgr.CHash.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "event",
});

// 联盟位置集合
const NClanGEO = mbgGame.common.db_mgr.CGeo.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "geo",
});

// 活跃联盟集合，用于联盟查找
const NClanActive = mbgGame.common.db_mgr.CSet.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "active",
});

// 活跃联盟集合，用于联盟查找
const NClanRank = mbgGame.common.db_mgr.CSortedSet.extend({
  // key: uuid
  FuncType: "clan",
  SubType: "rank",
});
let g_clanRankListTime = 0;
let g_clanRankList = [];

const clanCtrl = {

  /*
    联盟系统，redis中的数据为最可靠数据，并且作为cache和mysql的中间数据
  */
  * redisToMysql(clanUUID) {
    const mysql = mbgGame.common.db_mgr.getDB("mysql-users");
    const cData = new NClan(clanUUID);
    const dRedisData = yield cData.hgetall();
    if (dRedisData) {
      // mysql存盘为完整的整个json
      let lo = 0;
      let la = 0;
      if (dRedisData.geo) {
        const arr = dRedisData.geo.split(",");
        if (arr.length === 2) {
          lo = arr[0];
          la = arr[1];
        }
      }
      const mysqlData = {
        uuid: clanUUID,
        shortuuid: clanUUID.substring(0, 4) + clanUUID.substring(clanUUID.length - 4), // 短UUID，用于显示给玩家
        name: dRedisData.name,
        owner: dRedisData.owner,
        extra: `${dRedisData.mode},${dRedisData.score},${dRedisData.count},${lo},${la},${dRedisData.flag},${dRedisData.tScore || 0}`,
        data: JSON.stringify(dRedisData),
      };
      if (dRedisData.geo) {
        const cGeo = new NClanGEO();
        const ret = yield cGeo.geohash(clanUUID);
        if (ret) {
          mysqlData.geohash = ret[0];
        }
      }
      // 读取event信息
      const cEvent = new NClanEvent(clanUUID);
      mysqlData.events = yield cEvent.hgetall();
      if (mysqlData.events) {
        mysqlData.events = JSON.stringify(mysqlData.events);
      }

      let res = yield mysql.query("SELECT * FROM tc_clan WHERE uuid = ? ", clanUUID);
      if (res && res.length) {
        delete mysqlData.uuid;
        res = yield mysql.query('update tc_clan set ? where uuid = ?', [
          mysqlData,
          clanUUID,
        ]);
      } else {
        res = yield mysql.query('insert into tc_clan set ?', [
          mysqlData,
        ]);
      }
      yield cData.setExpireBySeconds(mbgGame.config.redisClanExpireTime || 30 * 86400);
      yield cEvent.setExpireBySeconds(mbgGame.config.redisClanExpireTime || 30 * 86400);

      mbgGame.logger.info("[clan redisToMysql]", clanUUID);
      if (res && res.affectedRows) return true;
    }
    return false;
  },
  * mysqlToRedis(clanUUID) {
    const mysql = mbgGame.common.db_mgr.getDB("mysql-users");
    let redisData;
    if (!clanUUID) return null;
    // "SELECT * FROM tc_clan WHERE uuid = 0  会返回所有数据，好奇怪
    const result = yield mysql.query("SELECT * FROM tc_clan WHERE uuid = ? ", clanUUID);
    if (result && result.length) {
      const mysqlData = result[0];
      // 玩家数据都存在data里面,先分解出结构
      redisData = JSON.parse(mysqlData.data);
      const cData = new NClan(clanUUID);
      yield cData.hmset(redisData);
      yield cData.setExpireBySeconds(mbgGame.config.redisClanExpireTime || 30 * 86400);
      if (mysqlData.events) {
        redisData.events = JSON.parse(mysqlData.events);
        const cEvent = new NClanEvent(clanUUID);
        yield cEvent.hmset(redisData.events);
        yield cEvent.setExpireBySeconds(mbgGame.config.redisClanExpireTime || 30 * 86400);
      }

      // 重新加入geo队列，使其可以推荐
      if (redisData.geo) {
        const arr = redisData.geo.split(",");
        const cGeo = new NClanGEO();
        if (arr[0] && arr[1]) {
          yield cGeo.geoadd(arr[0], arr[1], clanUUID);
        }
      }
    }
    return redisData;
  },
  // 从redis中移除数据
  * removeRedis(clanUUID) {
    // 删redis
    const cData = new NClan(clanUUID);
    yield cData.del();
    const cEvent = new NClanEvent(clanUUID);
    yield cEvent.del();
    const cOnline = new NClanOnline(clanUUID);
    yield cOnline.del();
    const cGeo = new NClanGEO();
    yield cGeo.zrem(clanUUID);

    const sActive = new NClanActive();
    yield sActive.srem(clanUUID);

    const zRank = new NClanRank();
    yield zRank.zrem(clanUUID);
  },
  buildApplyEvent(nApplier) {
    const logic = nApplier.getPlayerLogic();
    const eventData = {
      uuid: nApplier.getUUID(),
      name: logic.nickName(),
      t: moment().unix(),
      job: 2, // 需要最少职位2以上才能看
      mode: 1, // 1 申请
    };
    return eventData;
  },
  buildChatEvent(nPlayer, msg) {
    const logic = nPlayer.getPlayerLogic();
    const eventData = {
      t: moment().unix(),
      msg,
      mode: 0, // 0 聊天信息
      uuid: nPlayer.getUUID(),
      name: logic.nickName(),
      icon: nPlayer.getChatTotem(),
    };
    return eventData;
  },
  buildFriendWarEvent(nPlayer, type, code, msg) {
    const logic = nPlayer.getPlayerLogic();
    const eventData = {
      t: moment().unix(),
      msg,
      mode: 3, // 3 友谊战信息
      uuid: nPlayer.getUUID(),
      name: logic.nickName(),
      icon: nPlayer.getChatTotem(),
      status: 0, // 0 邀请中  1 战斗中  2 已结束
      type,
      code,
    };
    return eventData;
  },
  buildRequestEvent(nPlayer, sid, idx, msg) {
    const logic = nPlayer.getPlayerLogic();
    const eventData = {
      t: moment().unix(),
      msg: msg || '',
      mode: 4, // 4 联盟求助信息
      uuid: nPlayer.getUUID(),
      name: logic.nickName(),
      icon: nPlayer.getChatTotem(),
      sid,
      idx,
      curR: 0, // 玩家当前帮助
      curB: 0, // 玩家当前祝福
    };
    return eventData;
  },
  buildWarReplayEvent(nPlayer, wUUID, warInfo, msg) {
    const logic = nPlayer.getPlayerLogic();
    const eventData = {
      t: moment().unix(),
      msg: msg || '',
      mode: 5, // 5 联盟战报信息
      uuid: nPlayer.getUUID(),
      name: logic.nickName(),
      icon: nPlayer.getChatTotem(),
      wUUID,
      warInfo,
    };
    return eventData;
  },
  buildShareItemEvent(nPlayer, itemData, msg) {
    const logic = nPlayer.getPlayerLogic();
    const eventData = {
      t: moment().unix(),
      msg: msg || '',
      mode: 6, // 6 联盟道具分享信息
      uuid: nPlayer.getUUID(),
      name: logic.nickName(),
      icon: nPlayer.getChatTotem(),
      itemData,
    };
    return eventData;
  },
  buildSystemEvent(msg, nPlayer) {
    const eventData = {
      t: moment().unix(),
      msg,
      mode: 2, // 2 系统信息
    };
    if (nPlayer) {
      const logic = nPlayer.getPlayerLogic();
      eventData.name = logic.nickName();
    }
    return eventData;
  },
  buildSendEventData(event) {
    // 发送给客户端等事件需要特别处理，去掉uuid
    const data = _.clone(event);
    delete data.uuid;
    delete data.get;
    return data;
  },
  getMembers(clanData) {
    // 返回所有成员列表
    const members = {};
    _.mapObject(clanData, (v, k) => {
      if (k.substring(0, 2) === 'm_') {
        if (_.isString(v)) {
          members[k.substring(2)] = JSON.parse(v);
        } else {
          members[k.substring(2)] = v;
        }
      }
    });
    // console.log("getMembers:", members);
    return members;
  },
  * getClanBase(clanUUID) {
    let data;
    const cData = new NClan(clanUUID);
    data = yield cData.hmget(["name", 'score', 'mode', 'count', 'tScore']);
    let returnData = {};
    if (!data || !data[0]) {
      // 数据可能被mysql缓存了
      data = yield this.mysqlToRedis(clanUUID);
      if (!data) {
        mbgGame.logger.info("[getClanBase] MYSQL NO DATA", clanUUID);
        return null;
      }
      returnData = {
        name: data.name,
        score: +data.score,
        mode: +data.mode,
        count: +data.count,
        tScore: +data.tScore || 0,
      };
    } else {
      returnData = {
        name: data[0],
        score: +data[1],
        mode: +data[2],
        count: +data[3],
        tScore: +data[4] || 0,
      };
    }
    return returnData;
  },
  * getClanData(clanUUID) {
    // 缓存没有数据，就从redis里面读取
    if (!clanUUID) return null;
    const cData = new NClan(clanUUID);
    let data = yield cData.hgetall();
    if (!data) {
      mbgGame.logger.info("[getClanData] REDIS NO DATA", clanUUID);
      // redis也没有数据，从mysql读取
      data = yield this.mysqlToRedis(clanUUID);
      if (!data) {
        // mysql都没有数据，说明已经删除了
        mbgGame.logger.info("[getClanData] MYSQL NO DATA", clanUUID);
        return null;
      }
    }
    yield this.updateClanScore(cData, data, clanUUID);
    // mbgGame.logger.info("[getClanData]", clanUUID, data);
    return data;
  },
  * getClanEvent(clanUUID, id) {
    let data;
    const cEvent = new NClanEvent(clanUUID);
    if (id) {
      data = yield cEvent.hget(id);
      if (data) {
        data = JSON.parse(data);
      }
    } else {
      data = yield cEvent.hgetall();
      if (data) {
        delete data.eIDMax;
        _.mapObject(data, (value, key) => {
          data[key] = JSON.parse(value);
        });
      }
      // 清除一下过期数据
      const delKeys = yield this.removeClanEvent(clanUUID, 0, data);
      delKeys.forEach((key) => {
        delete data[key];
      });
    }
    // mbgGame.logger.info("[getClanEvent]", clanUUID, id, data);
    return data;
  },
  * getClanEventByWUUID(clanUUID, wUUID) {
    if (!clanUUID || !wUUID) return null;
    const cEvent = new NClanEvent(clanUUID);
    const data = yield cEvent.hgetall();
    let event = null;
    if (data) {
      delete data.eIDMax;
      _.mapObject(data, (value, key) => {
        if (value.wUUID === wUUID) {
          event = value;
        }
      });
    }
    return event;
  },
  * sendClanAllMemberEvent(clanUUID, eventData, needJob) {
    const cData = new NClan(clanUUID);
    const clanData = yield cData.hgetall();
    if (!clanData) return;
    const members = this.getMembers(clanData);
    const memberUUIDS = _.keys(members);
    const pushUUIDS = [];
    for (let i = 0; i < memberUUIDS.length; i++) {
      const uuid = memberUUIDS[i];
      const member = members[uuid];
      if (needJob) {
        // 需要判断权限
        if (member.job === 0) continue; // 成员就肯定没有权限
        if (member.job > needJob) continue;
      }
      if (member.lt === 1) {
        // 玩家在线
        mbgGame.serverCtrl.sendCmdByUUID(uuid, 'clanEvent', eventData);
        // console.log("send clanData by xfs!!", eventData);
      } else {
        // 用户设置了免推送
        if (member.dnd) continue;
        pushUUIDS.push(uuid);
        // console.log("send clanData notification!!", msg, uuid);
      }
    }
    if (pushUUIDS.length > 0) {
      // 发送推送通知，过滤掉richtext码
      let msg = eventData.add.data.msg;
      msg = msg.replace(/<[^>]+>/g, '');
      if (eventData.add.data.mode === 0) {
        msg = `${eventData.add.data.name} : ${msg}`;
      }
      yield mbgGame.serverCtrl.sendNotification(msg, pushUUIDS);
    }
  },
  * sendClanData(clanUUID, cmd, sendData, needJob) {
    const COnline = new NClanOnline(clanUUID);
    const onlineMembers = yield COnline.smembers();
    for (let i = 0; i < onlineMembers.length; i++) {
      // if (value.lt !== 1) return;
      /*
      if (needJob) {
        // 需要判断权限
        if (value.job === 0) return; // 成员就肯定没有权限
        if (value.job > needJob) return;
      }
      */
      const uuid = onlineMembers[i];
      const nPlayer = Cache.get(`Player:${uuid}`);
      if (nPlayer) {
        nPlayer.sendCmd(cmd, sendData);
        // console.log("send clanEvent online!!", sendData);
      } else { // 跨服
        mbgGame.serverCtrl.sendCmdByUUID(uuid, cmd, sendData);
        // console.log("send clanEvent xfs!!", sendData, uuid);
      }
    }
  },
  // 发送联盟信息
  * sendClanEvent(clanUUID, eventData) {
    if (!clanUUID || !eventData) return -1;
    const cEvent = new NClanEvent(clanUUID);
    const id = yield cEvent.hincrby('eIDMax', 1);

    yield cEvent.hset(id, JSON.stringify(eventData));

    const sendEventData = {
      add: {
        id,
        data: this.buildSendEventData(eventData),
      },
    };

    if (eventData.mode === 0 ||
      eventData.mode === 1 ||
      eventData.mode === 3 ||
      eventData.mode === 4) {
      // 需要离线通知的消息
      yield this.sendClanAllMemberEvent(clanUUID, sendEventData, eventData.job);
      return id;
    }

    // yield this.removeClanEvent(clanUUID);
    yield this.sendClanData(clanUUID, 'clanEvent', sendEventData, eventData.job);

    return id;
  },
  getClanEventExpireTime(value) {
    let expireTime = (mbgGame.config.clanEventExpire || 86400);
    if (value.mode === 4) {
      // 服务器保留超过2倍时间，求助
      expireTime = mbgGame.config.constTable.clanRequestTTL * 2;
    }
    if (value.mode === 3) {
      // 友谊赛
      if (value.status === 0 || value.status === 1) {
        // 邀请中， 时间较短
        expireTime = mbgGame.config.friendWarCodeExpireTime || 1800;
      }
    }
    if (value.expire) {
      expireTime = +value.expire;
    }
    return expireTime;
  },
  // 修改clan event，这里主要处理存盘和发送，逻辑调用方负责管理
  * modifyClanEvent(clanUUID, id, eventData) {
    const cEvent = new NClanEvent(clanUUID);
    yield cEvent.hset(id, JSON.stringify(eventData));
    const sendEventData = {
      modify: {
        id,
        data: this.buildSendEventData(eventData),
      },
    };
    // yield this.removeClanEvent(clanUUID);
    yield this.sendClanData(clanUUID, 'clanEvent', sendEventData);
  },
  // 清除clan event
  * removeClanEvent(clanUUID, id, clanEvents) {
    const cEvent = new NClanEvent(clanUUID);
    const delKeys = [];
    if (id) {
      yield cEvent.hdel(id);
      delKeys.push(id);
    }
    // 清除过期数据
    if (clanEvents) {
      const now = moment().unix();
      let keys = _.keys(clanEvents);
      // 清除过期的信息
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = clanEvents[key];

        if (now - value.t > this.getClanEventExpireTime(value)) {
          delete clanEvents[key];
          yield cEvent.hdel(key);
          delKeys.push(key);
        }
      }
      keys = _.keys(clanEvents);
      if (keys.length > (mbgGame.config.clanEventMax || 50)) {
        // 优先清除聊天或系统信息
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = clanEvents[key];

          if (value.mode !== 1 && value.mode !== 4) {
            // 删第一条， 排除申请和开箱请求
            delete clanEvents[key];
            yield cEvent.hdel(key);
            delKeys.push(key);
            break;
          }
        }
      }
    }
    if (delKeys.length) {
      yield this.sendClanData(clanUUID, 'clanEvent', {
        del: delKeys,
      });
    }
    return delKeys;
  },
  * createClan(netCtrl, info) {
    // 返回所有邮件的标题和读取标志附件标志
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const uuid = nPlayer.getUUID();
    const now = moment().unix();
    const cList = new NClanListByName();
    const nickName = logic.nickName();

    if (!nickName) return -1;
    // 检查名字是否重复
    let ret = yield cList.checkName(info.name);
    if (!ret) {
      netCtrl.sendWarning(netCtrl.getString("invalidName"));
      return -1; // 不能用
    }

    let clanUUID = uuid_module.v4();
    clanUUID = clanUUID.toUpperCase();
    const clanData = {
      name: info.name, // 联盟名字，唯一
      shortuuid: uuid.substring(0, 4) + uuid.substring(uuid.length - 4), // 短UUID，用于显示给玩家
      owner: nickName, // 会长呢称
      owneruuid: uuid, // 会长uuid
      createTime: now, // 创建时间
      desc: '', // 联盟宣言
      mode: 0, // 批准模式：0 允许任何人加入  1 加入需要审批  2  不允许加入
      score: 0, // 加入要求分段
      count: 1, // 人数
      flag: info.flag, // 联盟旗
    };
    const geo = nPlayer.getInfo("geo");
    if (geo) {
      clanData.geo = geo;
    }

    if (info.mode === 0 || info.mode === 1 || info.mode === 2) {
      clanData.mode = info.mode;
    }
    if (info.score >= 0 && info.score <= 5000) {
      clanData.score = +info.score || 0;
    }
    if (info.desc) {
      clanData.desc = info.desc;
    }

    if (mbgGame.config.constTable.createClanNeed) {
      if (logic.getDiamonds() < mbgGame.config.constTable.createClanNeed) {
        netCtrl.sendWarning(netCtrl.getString("moneyNotEnough", {
          unit: netCtrl.getString("diamonds"),
        })); // 不够钱购买
        return false;
      }
      logic.addDiamonds(-mbgGame.config.constTable.createClanNeed, null, 'createClan');
    }

    const cData = new NClan(clanUUID);
    // 登记名字
    ret = yield cList.registerName(info.name);
    if (!ret) return -1;

    clanData[`m_${uuid}`] = JSON.stringify({
      name: nickName,
      job: 1, // 默认职位都是0, 1 会长 2 副会长
      at: now, // 加入时间
      lt: 1,
      tc: logic.m_Stat.getStatVal('topCharaID'),
    });
    yield cData.hmset(clanData);
    yield nPlayer.setClan(clanUUID);
    nPlayer.logInfo("[createClan]", clanUUID, cData.key(), clanData);

    const COnline = new NClanOnline(clanUUID);
    yield COnline.sadd(uuid);

    if (clanData.geo) {
      const arr = clanData.geo.split(",");
      const cGeo = new NClanGEO();
      yield cGeo.geoadd(arr[0], arr[1], clanUUID);
    }
    yield this.sendClanEvent(clanUUID, this.buildSystemEvent(nPlayer.getString('clanCreateInfo'), nPlayer));

    // 存一下mysql
    yield this.redisToMysql(clanUUID);

    nPlayer.sendCmd('clanEvent', {
      op: 'join',
      name: info.name,
      job: 1,
      online: 1,
      count: 1,
      flag: clanData.flag,
    });
    return 0;
  },
  * modifyClan(netCtrl, info) {
    const nPlayer = netCtrl.getCtrl();
    const clan_uuid = nPlayer.getClanUUID();
    if (!clan_uuid) return -1;
    const clanData = yield this.getClanMe(clan_uuid, nPlayer.getUUID());
    if (!clanData) return -1;

    const member = clanData.me;
    if (!member || member.job === 0 || member.job > 2) return -1;
    const modifyData = {};
    const geo = nPlayer.getInfo("geo");
    if (geo) {
      clanData.geo = geo;
      modifyData.geo = clanData.geo;
      const arr = modifyData.geo.split(",");
      const cGeo = new NClanGEO();
      yield cGeo.geoadd(arr[0], arr[1], clan_uuid);
    }

    if (info.mode === 0 || info.mode === 1 || info.mode === 2) {
      modifyData.mode = info.mode;
      clanData.mode = modifyData.mode;
    }
    if (info.score >= 0 && info.score <= 5000) {
      modifyData.score = +info.score || 0;
      clanData.score = modifyData.score;
    }
    if (info.flag) {
      modifyData.flag = info.flag;
    }
    if (info.desc) {
      modifyData.desc = info.desc;
      clanData.desc = modifyData.desc;
    }
    const cData = new NClan(clan_uuid);
    yield cData.hmset(modifyData);

    // 存一下mysql
    yield this.redisToMysql(clan_uuid);

    nPlayer.sendCmd('clanEvent', modifyData);
    return 0;
  },
  // 查找联盟
  * searchClan(netCtrl, condition) {
    // const nPlayer = netCtrl.getCtrl();
    const now = moment().unix();

    // 把玩家搜索结果缓存起来
    netCtrl.cacheClanSearchData = {
      time: now,
      list: [],
    };
    if (condition.recommend ||
      !condition.str ||
      condition.str.length > 64 ||
      condition.str.search(/[ \'\"\n\\,/`# 　\%]/) !== -1
    ) {

      /*
      // 推荐模式，推荐30个玩家附近联盟
      // 获取玩家的位置, 如果没有，就随机抽
      const geo = nPlayer.getInfo("geo");
      let longitude = 113.365151;
      let latitude = 22.946372;
      if (geo) {
        const arr = geo.split(",");
        longitude = arr[0];
        latitude = arr[1];
      }

      const cGeo = new NClanGEO();
      // const lst = yield cGeo.georadius(longitude, latitude, '200', 'km', 'asc', 30);
      const lst = yield cGeo.zrange(0, -1);
      */
      const clanActive = new NClanActive();
      // 在活跃列表中随机10个联盟出来给玩家选择
      const lst = yield clanActive.srandmember(10);
      // nPlayer.logInfo("[searchClan]", lst);
      for (let i = 0; i < lst.length; i++) {
        const clan_uuid = lst[i];
        const cData = new NClan(clan_uuid);
        const ret = yield cData.hmget([
          "name",
          "owner",
          "geo",
          "mode",
          "score",
          "count",
          "flag",
          "tScore",
        ]);
        if (!ret || !ret[0]) {
          continue;
        }
        netCtrl.cacheClanSearchData.list.push({
          uuid: clan_uuid,
          name: ret[0],
          owner: ret[1],
          geo: ret[2],
          mode: +ret[3],
          score: +ret[4],
          count: +ret[5],
          flag: +ret[6],
          tScore: +ret[7],
        });
      }
    }
    if (netCtrl.cacheClanSearchData.list.length < 1) {
      const mysql = mbgGame.common.db_mgr.getDB("mysql-users");
      const result = yield mysql.query("select uuid,name,owner,extra from tc_clan where name like ? limit 0,30", [
        `%${condition.str || ''}%`,
      ]);
      if (result && result.length) {
        for (let i = 0; i < result.length; i++) {
          const res = result[i];
          let extra;
          if (!res.extra) {
            extra = [0, 0, 0, 0, 0, 0, 0];
          } else {
            extra = res.extra.split(',');
          }
          netCtrl.cacheClanSearchData.list.push({
            uuid: res.uuid,
            name: res.name,
            owner: res.owner,
            geo: `${extra[3]},${extra[4]}`,
            mode: +extra[0],
            score: +extra[1],
            count: +extra[2],
            flag: +extra[5],
            tScore: +extra[6],
          });
        }
      }
      // console.log("search data ", result);
    }
  },
  * getClanRankList() {
    const now = moment().unix();
    // 把排行榜数据缓存起来，10分钟才更新一次
    if (!g_clanRankListTime || now - g_clanRankListTime > 600) {
      g_clanRankList = [];
      // 重新生成ranklist cache
      const rankSet = new NClanRank();
      const clanUUIDS = yield rankSet.zrevrange(0, 200);
      for (let i = 0; i < clanUUIDS.length; i++) {
        const clan_uuid = clanUUIDS[i];
        const cData = new NClan(clan_uuid);
        let ret = yield cData.hmget([
          "name",
          "owner",
          "geo",
          "mode",
          "score",
          "count",
          "flag",
          "tScore",
        ]);
        if (!ret || !ret[0]) {
          // 从db中读
          const mData = yield this.mysqlToRedis(clan_uuid);
          if (!mData) {
            // 还是拿不到就continue
            continue;
          }
          // 重新读一次
          ret = yield cData.hmget([
            "name",
            "owner",
            "geo",
            "mode",
            "score",
            "count",
            "flag",
            "tScore",
          ]);
          if (!ret || !ret[0]) {
            // 还是没有
            continue;
          }
        }
        g_clanRankList.push({
          uuid: clan_uuid,
          name: ret[0],
          owner: ret[1],
          geo: ret[2],
          mode: +ret[3],
          score: +ret[4],
          count: +ret[5],
          flag: +ret[6],
          tScore: +ret[7],
        });
      }
      g_clanRankListTime = now;
    }
    return g_clanRankList;
  },
  // 联盟排行榜
  * clanRankList(netCtrl) {
    // const nPlayer = netCtrl.getCtrl();
    const list = yield this.getClanRankList();
    return list;
  },
  // 加入联盟, 2种模式，一种是自己加入，一种是审批
  * addClanMember(clanName, member_uuid, member_name, clanUUID) {
    if (!clanName || !member_name || !member_uuid) return -1;
    const now = moment().unix();
    const member = {
      name: member_name,
      job: 0, // 默认职位都是0, 1 会长 2 副会长
      at: now, // 加入时间
    };

    // 先判断一下被加入者是否有数据
    const nPlayer = Cache.get(`Player:${member_uuid}`);
    let online = 0;
    if (nPlayer) {
      yield nPlayer.setClan(clanUUID);
      member.lt = 1;

      const COnline = new NClanOnline(clanUUID);
      yield COnline.sadd(member_uuid);
      online = yield COnline.count();
    } else {
      // 玩家身上设置标记，直接设置玩家redis标志, 判断一下玩家是否有redis数据，如果没有，就算加入失败了，因为他已经可能长期没有玩
      const redis = mbgGame.common.db_mgr.getDB("redis-users");
      // 先判断一下该玩家是否有redis数据
      const ret = redis.exists(`tc_pl_h_data:${member_uuid}`);
      if (!ret) {
        // 不在线就直接失败
        return -1;
      }
      yield redis.hset(`tc_pl_h_data:${member_uuid}`, 'clan_uuid', clanUUID);
    }

    // 立刻存盘
    const cData = new NClan(clanUUID);
    yield cData.hset(`m_${member_uuid}`, JSON.stringify(member));
    const count = yield cData.hincrby('count', 1);

    // 刷新一下在线的成员的人数信息
    mbgGame.serverCtrl.sendCmdByUUID(member_uuid, 'clanEvent', {
      op: 'join',
      name: clanName,
      job: member.job,
      online,
      count,
    });
    yield this.sendClanData(clanUUID, 'clanEvent', {
      op: 'online',
      online,
      count,
    });
    return 0;
  },
  // 申请加入联盟
  * applyClan(netCtrl, clanUUID) {
    // 返回所有邮件的标题和读取标志附件标志
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const name = logic.nickName();
    const uuid = nPlayer.getUUID();

    if (!name) {
      return -1;
    }
    if (nPlayer.getClanUUID()) {
      return -1;
    }
    const clanData = yield this.getClanBase(clanUUID);
    if (!clanData) return -1;

    // nPlayer.logInfo("[clanData]", clanData);
    if (clanData.mode === 2) {
      // 不允许加入
      netCtrl.sendInfo(nPlayer.getString('clanAvoidJoin'));
      return 1;
    }

    if (clanData.score) { // 积分不够
      if (logic.m_Stat.getStatVal('MaxScore') < clanData.score) {
        netCtrl.sendInfo(nPlayer.getString('clanJoinFail'));
        return 4;
      }
    }

    if (clanData.mode === 0) {
      if (clanData.count >= mbgGame.config.constTable.clanMemberMax) {
        netCtrl.sendInfo(nPlayer.getString('clanJoinFull'));
        return -1;
      }
      // 直接加入
      const ret = yield this.addClanMember(clanData.name, uuid, name, clanUUID);
      if (ret === 0) {
        yield this.sendClanEvent(clanUUID, this.buildSystemEvent(nPlayer.getString("clanJoinInfo", {
          name,
        }), nPlayer));
      }
      return 2; // 直接加入成功了
    }

    if (clanData.mode === 1) {
      // 查找过滤重复申请数据
      const clanEvents = yield this.getClanEvent(clanUUID);
      let bRepeat = false;
      if (clanEvents) {
        _.mapObject(clanEvents, (value, key) => {
          if (value.mode === 1 && value.uuid === uuid) {
            bRepeat = true;
          }
        });
      }
      if (bRepeat) return 3; // 不要重复申请
      const eventData = this.buildApplyEvent(nPlayer);
      eventData.msg = netCtrl.getString('clanApplyAsk', {
        name,
      });
      // 申请加入
      yield this.sendClanEvent(clanUUID, eventData);
      netCtrl.sendInfo(netCtrl.getString('clanApplyInfo'));
      return 0;
    }
    return 0;
  },
  * approveClan(netCtrl, id, isOK) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const name = logic.nickName();
    const uuid = nPlayer.getUUID();

    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    const cData = new NClan(clanUUID);
    const clanData = yield cData.hmget(['name', 'count', `m_${uuid}`]);
    if (!clanData || !clanData[0] || !clanData[1] || !clanData[2]) return -1;

    // 判断权限
    const member = JSON.parse(clanData[2]);
    if (!member) return -1;
    if (member.job < 1) return -1;

    const event = yield this.getClanEvent(clanUUID, id);
    // console.log("approveClan:", clanData, event, member);
    if (!event || !event.uuid || event.mode !== 1 || !event.name) return -1;
    const targetName = event.name;
    if (isOK) {
      if (+clanData[1] >= mbgGame.config.constTable.clanMemberMax) {
        netCtrl.sendInfo(nPlayer.getString('clanJoinFull'));
        return -1;
      }
      const ret = yield this.addClanMember(clanData[0], event.uuid, event.name, clanUUID);
      if (ret === 0) {
        yield this.sendClanEvent(clanUUID, this.buildSystemEvent(nPlayer.getString('clanJoinOK', {
          name,
          target: targetName,
        })));
      }
    } else {
      yield this.sendClanEvent(clanUUID, this.buildSystemEvent(nPlayer.getString('clanJoinDeny', {
        name,
        target: targetName,
      }), nPlayer));
    }

    yield this.removeClanEvent(clanUUID, id);
    return 0;
  },
  * promoteClan(netCtrl, id, isPromote, isConfirm) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const name = logic.nickName();
    const uuid = nPlayer.getUUID();

    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    const clanData = yield this.getClanData(clanUUID);
    if (!clanData) return -1;

    // 判断权限
    const members = this.getMembers(clanData);
    const targetUUID = _.findKey(members, {
      name: id,
    });
    const member = members[uuid];
    const targetMember = members[targetUUID];
    // nPlayer.logInfo("promoteClan", member, targetUUID, targetMember, mbgGame.config.constTable.clanJobMax);
    if (!member || !targetMember || !targetUUID) return -1;
    if (member.job === 0) return -1; // 普通成员没权限这样做
    // 提升权限， 提升人的权限必须大于提升者
    if (targetMember.job !== 0 && member.job >= targetMember.job) return -1; // 权限不够
    if (isPromote) {
      if (targetMember.job === 2) {
        // 转让会长，必须有确认标志，防止误操作
        if (isConfirm !== 1) return -1;
      }

      if (targetMember.job === 0) {
        targetMember.job = mbgGame.config.constTable.clanJobMax; // 提到目前允许的最低权限
      } else {
        targetMember.job -= 1;
      }
    } else {
      if (targetMember.job === mbgGame.config.constTable.clanJobMax) {
        targetMember.job = 0;
      }
      if (targetMember.job > 1) {
        targetMember.job += 1;
      }
    }
    // 异常修正
    if (targetMember.job > mbgGame.config.constTable.clanJobMax) {
      targetMember.job = mbgGame.config.constTable.clanJobMax;
    }
    if (targetMember.job < 0) {
      targetMember.job = 0;
    }
    const cData = new NClan(clanUUID);
    const chgData = {};
    chgData[`m_${targetUUID}`] = JSON.stringify(targetMember);
    if (targetMember.job === 1) {
      // 如果目标被提升到会长，就更换会长，自己变为副会长
      member.job = 2;
      chgData[`m_${uuid}`] = JSON.stringify(member);
      chgData.owner = targetMember.name;
      chgData.owneruuid = targetUUID;
    }
    yield cData.hmset(chgData);

    yield this.sendClanEvent(clanUUID, this.buildSystemEvent(nPlayer.getString(isPromote ? 'clanPromoteInfo' : 'clanDemoteInfo', {
      name,
      target: targetMember.name,
      job: nPlayer.getString(`clanJob${targetMember.job}`),
    }), nPlayer));
    return targetMember;
  },
  // 联盟删除
  * removeClan(clanUUID) {
    // 通知所有在线玩家联盟删除
    const clanData = yield this.getClanData(clanUUID);
    if (!clanData) return -1;

    const members = this.getMembers(clanData);
    const keys = _.keys(members);
    // 清除过期的信息
    for (let i = 0; i < keys.length; i++) {
      const uuid = keys[i];

      mbgGame.serverCtrl.sendCmdByUUID(uuid, 'clanEvent', {
        op: 'quit',
      });
      const nPlayer = Cache.get(`Player:${uuid}`);
      if (!nPlayer) continue;
      yield nPlayer.removeClan();
    }
    const clan_name = clanData.name;

    yield this.removeRedis(clanUUID);
    // 释放名字
    const cList = new NClanListByName();
    yield cList.removeName(clan_name);

    // 删除mysql数据
    const mysql = mbgGame.common.db_mgr.getDB("mysql-users");
    yield mysql.query("delete from tc_clan where uuid = ?", clanUUID);

    mbgGame.logger.info("[removeClan] ", clanUUID);
    return 0;
  },
  * kickClan(netCtrl, id, isExit) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const name = logic.nickName();
    const uuid = nPlayer.getUUID();

    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    const clanData = yield this.getClanData(clanUUID);
    if (!clanData) return -1;

    // 判断权限
    const members = this.getMembers(clanData);
    let eventMsg;
    const member = members[uuid];
    if (!member) return -1;
    const cData = new NClan(clanUUID);
    const COnline = new NClanOnline(clanUUID);
    let targetUUID = uuid;
    if (isExit) {
      // 如果是会长退出联盟，则解散联盟
      if (member.job === 1) {
        yield this.removeClan(clanUUID);
        yield nPlayer.removeClan();
        return 0;
      }
      yield cData.hdel(`m_${uuid}`);

      yield COnline.srem(uuid);
      yield nPlayer.removeClan();
      eventMsg = nPlayer.getString('clanExitInfo', {
        name,
      });
    } else {
      targetUUID = _.findKey(members, {
        name: id,
      });
      if (!targetUUID) return -1;
      const targetMember = members[targetUUID];
      if (!targetMember) return -1;
      if (member.job === 0) return -1; // 普通成员没权限这样做
      // 踢人的权限必须大于被踢者
      if (targetMember.job > 0 && member.job > targetMember.job) return -1; // 权限不够

      eventMsg = nPlayer.getString('clanKickInfo', {
        name,
        target: targetMember.name,
      });
      yield cData.hdel(`m_${targetUUID}`);

      const nTargetPlayer = Cache.get(`Player:${targetUUID}`);
      if (nTargetPlayer) {
        yield nTargetPlayer.removeClan();
      }
      yield mailCtrl.addMail(targetUUID, {
        kTitle: 'mailt_clan',
        kContent: 'mailc_clanKick',
      });
    }
    const count = yield cData.hincrby('count', -1);
    const online = yield COnline.count();

    yield COnline.srem(targetUUID);
    mbgGame.serverCtrl.sendCmdByUUID(targetUUID, 'clanEvent', {
      op: 'quit',
    });

    yield this.sendClanEvent(clanUUID, this.buildSystemEvent(eventMsg, nPlayer));

    // 刷新一下在线的成员的人数信息
    yield this.sendClanData(clanUUID, 'clanEvent', {
      op: 'online',
      online,
      count,
    });
    return 0;
  },
  * helpClan(netCtrl, id, isBless) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    logic.logInfo("helpClan getLeftTimes", logic.getLeftTimes("helpClan"));
    if (logic.getLeftTimes("helpClan") <= 0) {
      return -1;
    }
    const name = logic.nickName();
    const uuid = nPlayer.getUUID();
    const now = moment().unix();

    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    const event = yield this.getClanEvent(clanUUID, id);
    // console.log("approveClan:", clanData, event, member);
    if (!event || !event.uuid || event.mode !== 4 || !event.name || !event.sid) return -1;
    // 判断是否已经过期
    if (now - event.t > this.getClanEventExpireTime(event)) {
      yield this.removeClanEvent(clanUUID, id);
      return -1;
    }

    if (!isBless) {
      // 不能自己操作
      if (event.uuid === uuid) return -1;

      // 判断次数
      if (event.curR >= mbgGame.config.constTable.clanRequestTimes) return -1;
      // 每人只可以帮助1次
      if (event.logsR && event.logsR[name]) return -1;

      event.curR += 1;
      event.logsR = event.logsR || {};
      if (event.logsR[name]) {
        event.logsR[name] += 1;
      } else {
        event.logsR[name] = 1;
      }
      logic.addLeftTimes("helpClan", -1);
      // 通过邮件来实现箱子操作
      yield mailCtrl.addMail(event.uuid, {
        special: {
          op: 'cmt',
          id: event.sid,
        },
      });

      // 给奖励
      const award = mbgGame.common.utils.deepClone(mbgGame.config.award.clanHelp);
      if (award) {
        logic.giveAward(award, 'clanHelp');

        /*
        const awardStr = logic.buildAwardString(award);
        logic.sendNotify(nPlayer.getString('clanHelpAward', {
          award: awardStr,
        }));
        */
      }
      logic.m_Stat.addStatVal("clanHelp", 1);
    } else {
      // 判断次数
      if (event.curB >= mbgGame.config.constTable.clanBlessTimes) return -1;
      if (event.logsB && event.logsB[name]) return -1;

      if (mbgGame.config.constTable.clanBlessPrice) {
        if (logic.getDiamonds() < mbgGame.config.constTable.clanBlessPrice) {
          netCtrl.sendWarning(netCtrl.getString("moneyNotEnough", {
            unit: netCtrl.getString("diamonds"),
          })); // 不够钱购买
          return 0;
        }
        logic.addDiamonds(-mbgGame.config.constTable.clanBlessPrice, null, 'clanBless');
      }

      event.curB += 1;
      event.logsB = event.logsB || {};
      if (event.logsB[name]) {
        event.logsB[name] += 1;
      } else {
        event.logsB[name] = 1;
      }

      // 通过邮件来实现箱子操作
      yield mailCtrl.addMail(event.uuid, {
        special: {
          op: 'cms',
          id: event.sid,
        },
      });

      // 给奖励
      const award = mbgGame.common.utils.deepClone(mbgGame.config.award.clanBless);
      if (award) {
        logic.giveAward(award, 'clanBless');

        /*
        const awardStr = logic.buildAwardString(award);
        logic.sendNotify(nPlayer.getString('clanBlessAward', {
          award: awardStr,
        }));
        */
      }
      logic.m_Stat.addStatVal("clanBless", 1);
    }

    nPlayer.logInfo(`[helpClan] ${clanUUID} ${uuid} ( ${event.curR} / ${event.curB} ) isBless:${isBless}`);
    yield this.modifyClanEvent(clanUUID, id, event);

    // 发送消息给对方，如果他在线，让他刷新时间
    mbgGame.serverCtrl.sendCmdByUUID(event.uuid, 'clanEvent', {
      op: 'checkHelp',
    });
    return 0;
  },
  * chestISOpen(clanUUIDAndEID, playerUUID, sid) {
    console.log('[chestISOpen]', clanUUIDAndEID, playerUUID, sid);
    const arr = clanUUIDAndEID.split(',');
    if (!arr || arr.length !== 2) return;
    const clanUUID = arr[0];
    const id = +arr[1];
    const event = yield this.getClanEvent(clanUUID, id);
    console.log('[chestISOpen]', event);
    if (!event || event.mode !== 4 || event.uuid !== playerUUID || event.sid !== sid) return;

    // 删除该事件
    yield this.removeClanEvent(clanUUID, id);
  },
  // 发起友谊赛
  * startFriendWar(netCtrl, type) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const uuid = nPlayer.getUUID();

    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    // 查找过滤重复数据
    const clanEvents = yield this.getClanEvent(clanUUID);
    let bRepeat = false;
    if (clanEvents) {
      _.mapObject(clanEvents, (value, key) => {
        if (value.mode !== 3) return;
        if (value.uuid !== uuid) return;
        if (value.status === 0 || value.status === 1) {
          bRepeat = true;
        }
      });
    }
    if (bRepeat) return -1;
    mbgGame.logger.info("startFriendWar", type);
    const code = yield mbgGame.FrdWarCtrl.makeCode(nPlayer.getUUID(), type);
    const eventID = yield clanCtrl.sendClanEvent(clanUUID, clanCtrl.buildFriendWarEvent(nPlayer, type, code,
      nPlayer.getString('clanFriendWarInfo', {
        name: logic.nickName(),
        type: nPlayer.getString(`friendwar${type}`),
      })
    ));
    yield mbgGame.FrdWarCtrl.bindEventID(nPlayer.getUUID(), code, eventID);
    return eventID;
  },
  // 取消友谊赛
  * stopFriendWar(netCtrl, id) {
    const nPlayer = netCtrl.getCtrl();
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;

    // 删除事件
    mbgGame.FrdWarCtrl.deleteCode(nPlayer.getUUID());
    yield this.removeClanEvent(clanUUID, id);
    return 0;
  },
  * getFriendWarCode(netCtrl, id, type) {
    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return -1;
    const event = yield this.getClanEvent(clanUUID, id);
    // console.log("approveClan:", clanData, event, member);
    if (!event || event.uuid === nPlayer.getUUID() || event.mode !== 3) return -1;

    // 锁定事件
    event.msg = nPlayer.getString('clanFriendWarBegin', {
      name: event.name,
      target: logic.nickName(),
      type: nPlayer.getString(`friendwar${type}`),
    });
    event.status = 1;
    event.challenger = logic.nickName();
    yield this.modifyClanEvent(clanUUID, id, event);
    return event.code;
  },
  friendWarResult(nPlayer, winnerName, loserName, isDraw, wUUID, eventID, type) {
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return;
    mbgGame.logger.info("friendWarResult:", winnerName, loserName, isDraw, wUUID, eventID);
    const keyStr = isDraw ? 'clanFriendWarDraw' : 'clanFriendWarRet';
    const self = this;
    co(function*() {
      const event = yield self.getClanEvent(clanUUID, eventID);

      if (!event || event.mode !== 3) return;

      event.msg = nPlayer.getString(keyStr, {
        winner: winnerName,
        loser: loserName,
        type: nPlayer.getString(`friendwar${type}`),
      });
      event.wUUID = wUUID;
      event.status = 2;
      if (isDraw) {
        event.isDraw = 1;
      } else {
        event.winner = winnerName;
      }
      yield self.modifyClanEvent(clanUUID, eventID, event);
    }).catch((err, result) => {
      mbgGame.logger.info("[friendWarResult] error ", err, result);
    });
  },
  * setDNDClan(netCtrl) {
    const nPlayer = netCtrl.getCtrl();
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return 0;
    const playerUUID = nPlayer.getUUID();

    nPlayer.logInfo("[setDNDClan] ", clanUUID);
    const clanData = yield this.getClanMe(clanUUID, playerUUID);
    if (!clanData) {
      return 0;
    }
    const member = clanData.me;
    if (member.dnd) {
      // 如果原本已经设置了免推送，就删除设置
      delete member.dnd;
    } else {
      member.dnd = 1;
    }
    const cData = new NClan(clanUUID);
    yield cData.hset(`m_${playerUUID}`, JSON.stringify(member));
    return member.dnd;
  },
  * updateClanScore(cData, clanData, clanUUID) {
    // 更新联盟积分
    const members = this.getMembers(clanData);
    const memberUUIDS = _.keys(members);
    let tScore = 0;
    for (let i = 0; i < memberUUIDS.length; i++) {
      const uuid = memberUUIDS[i];
      const member = members[uuid];
      if (member.mS > 0) {
        tScore += Math.round(member.mS / 2);
      }
    }
    yield cData.hset('tScore', tScore);
    // 添加到联盟排行榜
    const rankSet = new NClanRank();
    yield rankSet.zadd(tScore, clanUUID);
  },
  * getClanMe(clanUUID, playerUUID) {
    let data;
    const memberKey = `m_${playerUUID}`;
    const cData = new NClan(clanUUID);
    data = yield cData.hmget([
      'name',
      memberKey,
      'count',
      'flag',
      'tScore',
    ]);
    let returnData = {};
    if (!data || !data[0]) {
      // 数据可能被mysql缓存了
      data = yield this.mysqlToRedis(clanUUID);
      if (!data) {
        mbgGame.logger.info("[getClanForLogin] MYSQL NO DATA", clanUUID);
        return null;
      }
      if (!data[memberKey]) {
        mbgGame.logger.info("[getClanForLogin] CLAN NO MEMBER", clanUUID, playerUUID);
        return null;
      }
      returnData = {
        name: data.name,
        me: JSON.parse(data[memberKey]),
        count: +data.count,
        flag: +data.flag,
        tScore: +data.tScore || 0,
      };
    } else {
      if (!data[1]) {
        mbgGame.logger.info("[getClanForLogin] CLAN NO MEMBER", clanUUID, playerUUID);
        return null;
      }
      mbgGame.logger.info("[getClanForLogin]", clanUUID, data);
      returnData = {
        name: data[0],
        me: JSON.parse(data[1]),
        count: +data[2],
        flag: +data[3],
        tScore: +data[4] || 0,
      };
    }
    return returnData;
  },
  * clanLogin(nPlayer) {
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return;
    const playerUUID = nPlayer.getUUID();

    nPlayer.logInfo("[clanLogin] ", clanUUID);
    const clanData = yield this.getClanMe(clanUUID, playerUUID);
    if (!clanData) {
      // 联盟已删除或被踢
      yield nPlayer.removeClan();
      nPlayer.logInfo("[clanLogin] 不能获取联盟信息，可能已经删除", clanUUID);
      return;
    }
    const pobj = nPlayer.getPlayerLogic();
    const member = clanData.me;

    /*
        // 刷新玩家的旗, 如果有修改
        if (clanData.flag !== nPlayer.getTotem()) {
          yield nPlayer.setInfo('totem', clanData.flag);
        }
    */
    // 登记一下玩家最高等级角色id
    member.tC = pobj.m_Stat.getStatVal('topCharaID');
    // 标记玩家在线
    member.lt = 1;
    // 更新玩家最高pvp积分
    member.mS = pobj.m_Stat.getStatVal('MaxScore');

    const cData = new NClan(clanUUID);
    yield cData.hset(`m_${playerUUID}`, JSON.stringify(member));

    // 登记联盟在线
    const COnline = new NClanOnline(clanUUID);
    yield COnline.sadd(playerUUID);
    const online = yield COnline.count();

    const cEvent = new NClanEvent(clanUUID);
    const maxID = yield cEvent.hget('eIDMax');

    // 这里处理一下有多少联盟新消息等
    nPlayer.sendCmd('clanEvent', {
      op: 'join',
      name: clanData.name,
      job: member.job,
      online,
      count: clanData.count,
      tScore: clanData.tScore || 0,
      flag: clanData.flag,
      dnd: member.dnd || 0,
      maxID,
    });

    yield this.sendClanData(clanUUID, 'clanEvent', {
      op: 'online',
      online,
      count: clanData.count,
      member,
    });

    // 登记联盟到活跃列表
    const clanActive = new NClanActive();
    yield clanActive.sadd(clanUUID);
  },
  * generatorClanLogout(nPlayer) {
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return;
    const playerUUID = nPlayer.getUUID();

    nPlayer.logInfo("[clanLogout] ", clanUUID);
    const clanData = yield this.getClanMe(clanUUID, playerUUID);
    if (!clanData) return;
    const cData = new NClan(clanUUID);
    const member = clanData.me;
    member.lt = moment().unix();

    yield cData.hset(`m_${playerUUID}`, JSON.stringify(member));
    // 取消联盟在线
    const COnline = new NClanOnline(clanUUID);
    yield COnline.srem(playerUUID);
    const online = yield COnline.count();

    // 通知联盟在线玩家，该玩家下线了
    yield this.sendClanData(clanUUID, 'clanEvent', {
      op: 'offline',
      online,
      count: clanData.count,
      member,
    });

    if (online === 0) {
      // todo 目前要来测试联盟的存盘机制，令redis数据快速回收
      // 联盟存盘到mysql
      yield this.redisToMysql(clanUUID);

      // 清除联盟活跃列表
      const clanActive = new NClanActive();
      yield clanActive.srem(clanUUID);
    }
  },
  clanLogout(nPlayer) {
    const self = this;
    co(function*() {
      yield self.generatorClanLogout(nPlayer);
    }).catch((err, result) => {
      mbgGame.logger.info("[clanLogout] error ", err, result);
    });
  },
  // 更新玩家信息
  * clanUpdatePlayerInfo(nPlayer) {
    const clanUUID = nPlayer.getClanUUID();
    if (!clanUUID) return;
    const playerUUID = nPlayer.getUUID();

    nPlayer.logInfo("[clanUpdatePlayerInfo] ", clanUUID);
    const clanData = yield this.getClanMe(clanUUID, playerUUID);
    if (!clanData) {
      // 联盟已删除或被踢
      yield nPlayer.removeClan();
      nPlayer.logInfo("[clanLogin] 不能获取联盟信息，可能已经删除", clanUUID);
      return;
    }
    const member = clanData.me;

    // 刷新玩家的旗
    // yield nPlayer.setInfo('totem', clanData.flag);

    // 登记一下玩家最高等级角色id
    member.name = nPlayer.getInfo("nickname");

    const cData = new NClan(clanUUID);
    yield cData.hset(`m_${playerUUID}`, JSON.stringify(member));

    // 如果玩家是盟主，改盟主名字
    if (clanData.owneruuid === playerUUID) {
      yield cData.hmset({
        owner: member.name,
      });
      // 存一下mysql
      yield this.redisToMysql(clanUUID);
    }
  },
};

module.exports = clanCtrl;