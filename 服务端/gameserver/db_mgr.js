const redis = require('redis');
const mysql = require('mysql');
const assert = require('assert');
const co_redis = require('co-redis');
const co = require('co');
const timer = require('./timer');
const Class = require("./class");

const DBList = [];
const Default = {};


function getDBByName(name) {
  const target_db = _.find(DBList, (db) => {
    return db.m_Name === name;
  });
  return target_db;
}

function removeDBByName(name) {
  const db = getDBByName(name);
  if (!db) {
    return;
  }
  const listidx = DBList.indexOf(db);
  if (listidx === -1) {
    return;
  }
  DBList.splice(listidx, 1);
}

function getDB(param) {
  return getDBByName(param);
}

function removeDB(param) {
  return removeDBByName(param);
}


// connect to Redis server
function* _connectRedisServer(dConfig) {
  const password = dConfig.password || 'thepasswordisme';
  const db_id = dConfig.name;
  let db = redis.createClient(dConfig.port, dConfig.host, {});
  db.on("error", (err) => {
    mbgGame.logError(`[REDIS <${db_id}> ][Error] `, err);
  });

  db.on("subscribe", (channel, count) => {
    mbgGame.logger.info(`[REDIS <${db_id}> ] event:subscribe, channel:`, channel, ", count:", count);
  });
  db.on("message", (channel, message) => {
    mbgGame.logger.info(`[REDIS <${db_id}> ] event:message, channel ${channel}: ${message}`);
    if (db.onChannelMsg) {
      db.onChannelMsg(message, channel);
    }
  });
  db = co_redis(db);
  yield db.auth(password);
  db.m_Name = dConfig.name;
  removeDBByName(dConfig.name);
  DBList.push(db);
  if (dConfig.select) {
    db.select(dConfig.select);
  }

  if (dConfig.onReady) {
    yield dConfig.onReady();
  } else {
    mbgGame.logger.info(`[REDIS<${db_id}> ] [no onReady function]`);
  }
}

function _getDBID(dConfig) {
  const db_id = dConfig.name;
  return db_id;
}


function _tryReconnectMysql(db_id, dConfig) {
  timer.setOnceTimer(4000, () => {
    mbgGame.logger.info(`[MYSQL <${db_id}> ] reconnecting.`);
    co(function*() {
      yield _connectMysqlServer(dConfig);
    }).catch((err, result) => {
      mbgGame.logError("[_connectMysqlServer err]", err);
    });
  });
}

function co_mysql(client) {
  const slice = [].slice;
  const query = client.query;
  const connect = client.connect;

  const o = {};

  o.query = function() {
    const args = slice.call(arguments);
    const p = new Promise((resolve, reject) => {
      args.push((err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });

      query.apply(client, args);
    });

    return p;
  };

  o.connect = function() {
    const args = slice.call(arguments);
    const p = new Promise((resolve, reject) => {
      args.push((err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });

      connect.apply(client, args);
    });

    return p;
  };

  return o;
}

function* _connectMysqlServer(dConfig) {
  // mbgGame.logger.info(dConfig);
  const connection = mysql.createConnection({
    host: dConfig.host,
    port: dConfig.port,
    user: dConfig.user,
    password: dConfig.password,
    database: dConfig.database,
    connectTimeout: 0,
    useConnectionPooling: true,
    charset: dConfig.charset,
  });
  const db_id = _getDBID(dConfig);
  const db = co_mysql(connection);
  db.m_Name = dConfig.name;

  removeDBByName(dConfig.name);
  connection.on('error', (err) => {
    mbgGame.logError(`[MYSQL <${db_id}> ] error: ${err.code}`, err);
    _tryReconnectMysql(db_id, dConfig);
  });
  DBList.push(db);

  try {
    yield db.connect();
    mbgGame.logger.info(`[MYSQL <${db_id}> ]  connect success.`);
  } catch (err) {
    mbgGame.logError(`[MYSQL <${db_id}> ] connect fail. code: ${err.code} ${err.fatal}`, err);
    connection.end();
    // 启动服务器时连不上mysql，关掉吧
    // reconnect
    // _tryReconnectMysql(db_id, dConfig);
  }
}

function* initDSConnection(config) {
  if (!config) {
    return;
  }
  for (let i = 0; i < config.length; i++) {
    const dConfig = config[i];
    // mbgGame.logger.info(dConfig);
    const db = null;
    let sType = null;
    if (dConfig.type) {
      sType = dConfig.type.toUpperCase();
    }
    if (sType === "REDIS" && dConfig.host) {
      yield _connectRedisServer(dConfig);
    } else if (sType === "MYSQL" && dConfig.host) {
      yield _connectMysqlServer(dConfig);
    }
  }
}


function setDefaultRedisDB(sName) {
  Default.RedisDB = sName;
}

function setDefaultMySqlDB(sName) {
  Default.MySqlDB = sName;
}


const CNetObjBase = Class.extend({
  Project: "", // 项目缩写，2个小写字母
  FuncType: "", // 功能(类型)缩写，2个小写字母
  SubType: "", // 相对FuncType的子类型, 任意字符串（不要太长）
  /*
  第一位是key的类型：
  k = 普通key
  h = hash key
  e = 会expire的key
  s = 集合
  z = 有序集合
  u = 并集
  t = 临时使用集合
  集合不带冒号，普通key 带冒号，然后key名
   */
  KeyType: "",
  ctor(name) {
    this.setName(name);
    this.onInit();
  },
  init(name) {
    this.setName(name);
    this.onInit();
  },
  onInit() { },
  releaseSelf() {
    if (this.m_Parent) {
      delete this.m_Parent;
    }
    if (this.m_Name) {
      delete this.m_Name;
    }
  },
  pro() {
    return mbgGame.ProjectName;
  },
  setParent(obj) {
    this.m_Parent = obj;
  },
  parent() {
    return this.m_Parent;
  },
  setFuncType(funcType) {
    this.funcType(funcType);
  },
  funcType(funcType) {
    if (funcType) {
      this.m_FuncType = funcType;
      return null;
    }
    return this.m_FuncType || this.FuncType;
  },
  setKeyType(keyType) {
    this.keyType(keyType);
  },
  keyType(keyType) {
    if (keyType) {
      this.m_KeyType = keyType;
      return null;
    }
    return this.m_KeyType || this.KeyType;
  },
  setSubType(subType) {
    this.subType(subType);
  },
  subType(subType) {
    if (subType) {
      this.m_SubType = subType;
      return null;
    }
    return this.m_SubType || this.SubType;
  },
  setSubIdx(subIdx) {
    this.subIdx(subIdx);
  },
  subIdx(subIdx) {
    if (subIdx) {
      this.m_SubIdx = subIdx;
      return null;
    }
    return this.m_SubIdx || this.SubIdx;
  },
  prefix() {
    return `${this.pro()}_${this.funcType()}_${this.keyType()}`;
  },
  setDB(db) {
    this.DB(db);
  },
  DB(db) {
    if (this.m_MultiObj) {
      return this.m_MultiObj;
    }
    if (db) {
      this.m_db = db;
    } else if (this.m_db) {
      if (typeof (this.m_db) === "string") {
        return getDB(this.m_db);
      }
      return this.m_db;
    } else {
      return getDB(Default.RedisDB);
    }
    return null;
  },
  mysqlDB() {
    return getDB(Default.MySqlDB);
  },
  setName(name) {
    this.m_Name = name;
  },
  name() {
    return this.m_Name;
  },
  // 子类重载，返回的是Redis的key名字
  key() {
    let prefix = this.prefix();
    const subType = this.subType();
    if (subType) {
      prefix += `_${subType}`;
      const subIdx = this.subIdx();
      if (subIdx) {
        prefix += subIdx;
      }
    }
    let key = prefix;
    if (this.name() != null) {
      key += `:${this.name()}`;
    }
    return key;
  },
  flatDict(dData) {
    const arr = [];
    if (dData) {
      for (const k in dData) {
        arr.push(k);
        arr.push(dData[k]);
      }
    }
    return arr;
  },
  toDict(lstData) {
    const dData = {};
    if (!lstData) {
      return dData;
    }
    for (let i = 0, len = lstData.length; i < len; i += 2) {
      dData[lstData[i]] = lstData[i + 1];
    }
    return dData;
  },
  // 通用的 或者 辅助的Redis接口
  del() {
    return this.DB().del(this.key());
  },
  exists(...args) {
    const db = this.DB();
    return db.exists(...args);
  },
  selfExists() {
    return this.exists(this.key());
  },
  ttl() {
    return this.DB().ttl(this.key());
  },
  expireat(t) {
    return this.DB().expireat(this.key(), t);
  },
  pexpireat(t) {
    return this.DB().pexpireat(this.key(), t);
  },
  setExpireBySeconds(s) {
    return this.DB().expire(this.key(), s);
  },
  setExpireByMSeconds(ms) {
    return this.DB().pexpire(this.key(), ms);
  },
  persist() {
    return this.DB().persist(this.key());
  },
  type() {
    return this.DB().type(this.key());
  },
  keys(pattern) {
    return this.DB().keys(pattern);
  },
  rename(newKey) {
    const ret = this.DB().rename(this.key(), newKey);
    this.setName(newKey);
    return ret;
  },
  mset(dData) {
    const db = this.DB();
    const param = this.flatDict(dData);
    return db.mset(...param);
  },
  mget(keys) {
    const db = this.DB();
    return this.DB().apply(db, keys);
  },
  multi() {
    if (!this.DB().multi) {
      mbgGame.logError("[no multi function]");
      return;
    }
    this.m_MultiObj = this.DB().multi();
  },
  exec() {
    if (!this.m_MultiObj) {
      mbgGame.logError("[no m_MultiObj]");
      return null;
    }
    const multiObj = this.m_MultiObj;
    this.m_MultiObj = null;
    return multiObj.exec();
  },
  * sql(query) {
    const result = yield this.mysqlDB().query(query);
    mbgGame.logger.info("[query=[", query, "]", result);
    return result;
  },
});


// 有序集合 zset
const CSortedSet = CNetObjBase.extend({
  KeyType: "z",
  zadd(score, member) {
    return this.DB().zadd(this.key(), score, member);
  },
  zincrby(score, member) {
    return this.DB().zincrby(this.key(), score, member);
  },
  zscore(member) {
    assert(member != null);
    return this.DB().zscore(this.key(), member);
  },
  copyTo(outkey) {
    return this.DB().zunionstore(outkey, 1, this.key());
  },
  zrem(member) {
    return this.DB().zrem(this.key(), member);
  },
  zremrangebyrank(start, end) {
    return this.DB().zremrangebyrank(this.key(), start, end);
  },
  zrank(member) {
    return this.DB().zrank(this.key(), member);
  },
  zrevrank(member) {
    return this.DB().zrevrank(this.key(), member);
  },
  zcard() {
    return this.DB().zcard(this.key());
  },
  zcount(min, max) {
    return this.DB().zcount(this.key(), min, max);
  },
  zrevrange(startIdx, stopIdx, option) {
    option = option || {};
    const args = [this.key(), startIdx, stopIdx];
    if (option.withscores) {
      args.push("WITHSCORES");
    }
    return this.DB().zrevrange.apply(this.DB(), args);
  },
  zrange(startIdx, stopIdx, option) {
    option = option || {};
    const args = [this.key(), startIdx, stopIdx];
    if (option.withscores) {
      args.push("WITHSCORES");
    }
    return this.DB().zrange.apply(this.DB(), args);
  },
  zrangebyscore(min, max, option) {
    option = option || {};
    const offset = option.offset || 0;
    const count = option.count || 0;
    const withscores = false;
    const args = [this.key(), min, max];
    if (option.withscores) {
      args.push("WITHSCORES");
    }
    if (count > 0) {
      args.push("LIMIT", offset, count);
    }
    return this.DB().zrangebyscore.apply(this.DB(), args);
  },
});


const CSet = CNetObjBase.extend({
  KeyType: "s",
  sadd(value) {
    return this.DB().sadd(this.key(), value);
  },
  spop() {
    return this.DB().spop(this.key());
  },
  sismember(value) {
    return this.DB().sismember(this.key(), value);
  },
  smembers() {
    return this.DB().smembers(this.key());
  },
  count() {
    return this.DB().scard(this.key());
  },
  smove(dest, value) {
    return this.DB().smove(this.key(), dest, value);
  },
  srem(value) {
    return this.DB().srem(this.key(), value);
  },
  srandmember(count) {
    return this.DB().srandmember(this.key(), count);
  },
  // TODO
  sdiff(...args) {
    return this.DB().sdiff(this.key(), ...args);
  },
  // TODO
  sdiffstore(value) {
    return this.DB().sdiffstore(this.key(), value);
  },
  // TODO
  sinter() {
    const args = [].slice.call(arguments);
    args.unshift(this.key());
    return this.DB().sinter.apply(this.DB(), args);
  },
  // TODO
  sinterstore(...args) {
    return this.DB().sinterstore(this.key(), ...args);
  },
  // TODO
  sunion(...args) {
    return this.DB().sunion(this.key(), ...args);
  },
  // TODO
  sunionstore(...args) {
    return this.DB().sunionstore(this.key(), ...args);
  },
});


const CList = CNetObjBase.extend({
  KeyType: "l",
  appendList(lst) {
    const db = this.DB();
    const dArgument = {};
    dArgument[0] = this.key();
    const len = lst.length;
    dArgument.length = len + 1;
    for (let i = 1; i <= len; i++) {
      dArgument[i] = lst[i - 1];
    }
    return db.rpush(...dArgument);
  },
  lpop() {
    return this.DB().lpop(this.key());
  },
  rpop() {
    return this.DB().rpop(this.key());
  },
  lpush(value) {
    return this.DB().lpush(this.key(), value);
  },
  // 1次插入多个value
  lpushList(values) {
    return this.DB().lpush(this.key(), ...values);
  },
  rpush(value) {
    return this.DB().rpush(this.key(), value);
  },
  // 1次插入多个value
  rpushList(values) {
    return this.DB().rpush(this.key(), ...values);
  },
  lpushex(value) {
    return this.DB().lpushex(this.key(), value);
  },
  rpushex(value) {
    return this.DB().rpushex(this.key(), value);
  },
  lrem(count, value) {
    return this.DB().lrem(this.key(), count, value);
  },
  lset(index, value) {
    return this.DB().lset(this.key(), index, value);
  },
  llen() {
    return this.DB().llen(this.key());
  },
  ltrim(start, stop) {
    return this.DB().ltrim(this.key(), start, stop);
  },
  lindex(idx) {
    return this.DB().lindex(this.key(), idx);
  },
  rpoplpush(anotherNList) {
    return this.DB().rpoplpush(this.key(), anotherNList.key());
  },
  lrange(start, stop) {
    return this.DB().lrange(this.key(), start, stop);
  },
  getall() {
    return this.lrange(0, -1);
  },
  onLoaded(lData) {
    //  mbgGame.logger.info(`[CList.onLoaded] key=${this.key()},data=${JSON.stringify(lData)}`);
    if (!lData) {
      this.m_Data = [];
    } else {
      this.m_Data = JSON.parse(lData);
    }
  },
  getList() {
    return this.m_Data;
  },
});

// GEO地理位置
const CGeo = CSortedSet.extend({
  KeyType: "g",
  geoadd(longitude, latitude, name) {
    return this.DB().geoadd(this.key(), longitude, latitude, name);
  },
  geopos(value) {
    return this.DB().geopos(this.key(), value);
  },
  geohash(value) {
    return this.DB().geohash(this.key(), value);
  },
  geodist(member1, member2, unit) {
    return this.DB().geodist(this.key(), member1, member2, unit | 'm');
  },
  georadius(longitude, latitude, radius, unit, sort, count) {
    // todo
    // 这个指令顺序颇怪
    // 正确 georadius tc_clan_g_geo 113.365151 22.946372 200 km WITHDIST ASC COUNT 3
    return this.DB().georadius(this.key(), longitude, latitude, radius, unit, 'count', count, sort);
  },
  georadiusbymember() {
    // todo

  },
});

// 字符串或数字
const CNormal = CNetObjBase.extend({
  KeyType: "k",
  set(value) {
    return this.DB().set(this.key(), value);
  },
  setnx(value) {
    return this.DB().setnx(this.key(), value);
  },
  get() {
    return this.DB().get(this.key());
  },
  incr(by) {
    const key = this.key();
    if (by) {
      return this.DB().incrby(key, by);
    }
    return this.DB().incr(key);
  },
  incrbyfloat(by) {
    const key = this.key();
    return this.DB().incrbyfloat(key, by);
  },
  incrby(by) {
    const key = this.key();
    return this.DB().incrby(key, by);
  },
  decr(by) {
    const key = this.key();
    if (by) {
      return this.DB().decrby(key, by);
    }
    return this.DB().decr(key);
  },
  getset(value) {
    const key = this.key();
    return this.DB().getset(key, value);
  },
  strlen() {
    const key = this.key();
    return this.DB().strlen(key);
  },
  getbit(offset) {
    return this.DB().getbit(this.key(), offset);
  },
  setbit(offset, value) {
    return this.DB().setbit(this.key(), offset, value ? 1 : 0);
  },
});

const CExpireNormal = CNormal.extend({
  KeyType: "e",
  setex(value, seconds) {
    return this.DB().setex(this.key(), value, seconds);
  },
  set(value, seconds) {
    if (seconds != null) {
      return this.DB().set(this.key(), value, "ex", seconds);
    }
    return this.DB().set(this.key(), value);
  },
  expire(seconds) {
    return this.DB().expire(this.key(), seconds);
  },
});

// 哈希表（字典）
const CHash = CNetObjBase.extend({
  KeyType: "h",
  OptimizeNet: false,
  hmset(dData) {
    if (_.isEmpty(dData)) {
      return this.del();
    }
    const undefinedKeys = [];
    for (const k in dData) {
      if (dData[k] == null) {
        undefinedKeys.push(k);
      } else if (typeof (dData[k]) !== 'string') {
        dData[k] = JSON.stringify(dData[k]);
      }
    }
    /*
    if (undefinedKeys.length > 0) {
      mbgGame.logger.warn("[hmset] undefinedKeys", undefinedKeys);
    }
    */
    for (let i = 0; i < undefinedKeys.length; i++) {
      delete dData[undefinedKeys[i]];
    }
    const self = this;
    const param = this.flatDict(dData);
    param.unshift(self.key());
    const db = this.DB();
    for (let i = 0; i < param.length; i++) {
      if (param[i] == null) {
        mbgGame.logError(`[hmset] wrong param: ${param}`);
        break;
      }
    }
    return db.hmset(...param);
  },
  hmget(subKeys) {
    const self = this;
    const param = mbgGame.common.utils.deepClone(subKeys);
    param.unshift(self.key());
    const db = this.DB();
    return db.hmget(...param);
  },
  hset(subKey, value) {
    return this.DB().hset(this.key(), subKey, value);
  },
  * hset2(subKey, value) {
    const result = yield this.DB().hset(this.key(), subKey, value);
    mbgGame.logger.info("[hset2]", this.key(), subKey, value, "result", result);
    if (result === 1) {
      this.setValOnly(subKey, value);
    }
  },
  hget(subKey) {
    return this.DB().hget(this.key(), subKey);
  },
  hsetnx(subKey, value) {
    const db = this.DB();
    return db.hsetnx(this.key(), subKey, value);
  },
  hdel(subKey) {
    return this.DB().hdel(this.key(), subKey);
  },
  hdels(lst) {
    lst.unshift(this.key());
    return this.DB().hdel.apply(this.DB(), lst);
  },
  hexists(subKey) {
    return this.DB().hexists(this.key(), subKey);
  },
  hlen() {
    return this.DB().hlen(this.key());
  },
  hstrlen(subKey) {
    return this.DB().hstrlen(this.key(), subKey);
  },
  hkeys() {
    return this.DB().hkeys(this.key());
  },
  hvals() {
    return this.DB().hvals(this.key());
  },
  hgetall() { // 和redis的hgetall不同，返回的是字典
    return this.DB().hgetall(this.key());
  },
  hincrby(subKey, value) {
    return this.DB().hincrby(this.key(), subKey, value);
  },
  hincrbyfloat(subKey, value) {
    return this.DB().hincrbyfloat(this.key(), subKey, value);
  },
  copy(nHash) {
    this.m_Data = mbgGame.common.utils.deepClone(nHash.m_Data);
    this.m_RedisData = mbgGame.common.utils.deepClone(nHash.m_RedisData);
  },
  // 自定义函数
  load(callback) {
    const self = this;
    co(function*() {
      const dRedisData = yield self.hgetall();
      self.onLoaded(dRedisData);
      if (callback) {
        callback(self);
      }
    }).catch((err, result) => {
      mbgGame.logError(`[CHash.load] occur error`, err);
    });
  },

  onLoaded(dRedisData) { // 可能为null
    // mbgGame.logger.info("[CHash.onLoaded] key=" + this.key() + ",data=" + JSON.stringify(dRedisData));
    this.m_RedisData = dRedisData || {};
    this.m_Data = {};
    // de-serialize
    for (const k in this.m_RedisData) {
      if (typeof (this.m_RedisData[k]) === "string") {
        try {
          this.m_Data[k] = JSON.parse(this.m_RedisData[k]);
        } catch (e) {
          this.m_Data[k] = this.m_RedisData[k];
        }
      } else {
        this.m_Data[k] = this.m_RedisData[k];
      }
    }
  },
  // 要在save之前调用
  addUpdatedKey(key) {
    if (!this.m_UpdatedKey) {
      this.m_UpdatedKey = {};
    }
    this.m_UpdatedKey[key] = 1;
  },
  save(callback) {
    const self = this;
    co(function*() {
      // TODO 可以检测出发生变化的key，只存这部分key
      if (!self.serializeToRedisData()) {
        mbgGame.logError("[save] serializeToRedisData failed");
        return;
      }
      let result;
      if (_.isEmpty(self.m_RedisData)) {
        const num = yield self.del();
        result = "OK";
      } else {
        result = yield self.hmset(self.m_RedisData);
      }
      // mbgGame.logger.info("[save] key=" + self.key() + ",data=" + JSON.stringify(self.m_RedisData));
      if (result.indexOf("OK") !== -1) {
        let updatedKey;
        if (self.m_UpdatedKey) {
          updatedKey = self.m_UpdatedKey;
          self.m_UpdatedKey = null;
        }
        if (callback) {
          callback(self, updatedKey);
        } else if (self.onSave) { // 执行回调函数，一般是刷新数据给客户端的操作
          self.onSave(updatedKey);
        }
        return;
      }
      mbgGame.logError(`[CHash.save] name=${self.name()}`);
    }).catch((err, result) => {
      mbgGame.logError(`[save] key:${self.key()} ${JSON.stringify(self.m_RedisData)}`, err);
    });
  },
  * updateHash() {
    this.multi();
    this.del();
    this.hmset(this.m_RedisData);
    const result = yield this.exec();
    return result[1];
  },
  // 把m_Data的内容保存到m_RedisData
  // 返回true表示正常
  serializeToRedisData() {
    if (!this.m_RedisData) { // 还没初始化？
      return false;
    }
    if (!this.m_Data) { // 不可能为空的，出错了
      return false;
    }
    this.m_RedisData = {}; // 清空旧的
    for (const k in this.m_Data) {
      if (this.m_Data[k] == null) {
        continue;
      }
      if (typeof (this.m_Data[k]) === "object") {
        try {
          this.m_RedisData[k] = JSON.stringify(this.m_Data[k]);
        } catch (e) {
          mbgGame.logError(`[serializeToRedisData] can't stringify:${this.m_Data[k]}`, e);
        }
      } else {
        this.m_RedisData[k] = this.m_Data[k];
      }
    }
    return true;
  },
  * saveAsync() {
    if (!this.m_RedisData) { // 未初始化
      return "err";
    }
    if (!this.serializeToRedisData()) {
      mbgGame.logError("[save] serializeToRedisData failed");
      return "err";
    }
    let result;
    if (_.isEmpty(this.m_RedisData)) { // 空的
      const num = yield this.del();
      if (num === 1) {
        result = "OK";
      }
    } else {
      // mbgGame.logger.info("[hmset]", this.m_RedisData);
      // hmset不会删除key-val，所以先清空再写入
      // TODO:优化
      result = yield this.updateHash();
    }
    if (result && result.indexOf("OK") !== -1) {
      if (this.onSave) {
        this.onSave();
      }
      return "ok";
    }
    mbgGame.logError(`[saveAsync] error:${result}`);
    return "err";
  },
  * loadAsync() {
    const dData = yield this.hgetall() || {};
    this.onLoaded(dData);
    return this.m_Data;
  },

  /* 重载使用
  onSave: function(){
  },
  */
  data() {
    return this.m_Data;
  },
  getVal(key) {
    if (!this.m_RedisData) {
      return null;
    }
    return this.m_Data[key];
  },
  setValOnly(key, value) {
    // mbgGame.logger.info("setValOnly", key, value);
    return this.setVal(key, value, false);
  },
  // 第一次初始化时，可以先调用initData，再setVal
  initData() {
    if (!this.m_RedisData) {
      this.m_RedisData = {};
    }
    if (!this.m_Data) {
      this.m_Data = {};
    }
  },
  setVal(key, value, save, callback) {
    if (!this.m_RedisData) { // 防止意外覆盖KV的数据
      return false;
    }
    if (this.OptimizeNet) {
      this.addUpdatedKey(key);
    }
    if (value == null) {
      if (this.m_Data[key]) {
        delete this.m_Data[key];
      }
    } else {
      this.m_Data[key] = value;
    }
    if (save === undefined || save === true) {
      this.save(callback);
    }
    return true;
  },
  removeVal(key, save, callback) {
    if (!this.m_RedisData) { // 防止意外覆盖KV的数据
      return;
    }
    if (!this.m_RedisData[key]) {
      delete this.m_RedisData[key];
    }
    if (this.OptimizeNet) {
      this.addUpdatedKey(key);
    }
    if (this.m_Data[key]) {
      delete this.m_Data[key];
    }
    if (save == null || save === true) {
      this.save(callback);
    }
  },
  removeValOnly(key) {
    this.removeVal(key, false);
  },
  setNetCtrl(netCtrl) {
    this.m_NetCtrl = netCtrl;
  },
  getNetCtrl() {
    if (this.m_NetCtrl) {
      return this.m_NetCtrl;
    }
    if (this.parent()) {
      return this.parent().getNetCtrl();
    }
    return null;
  },
  sendCmd(cmd, dData) {
    // mbgGame.logger.info("sendCmd", cmd,dData);
    const netCtrl = this.getNetCtrl();
    if (!netCtrl) {
      mbgGame.logger.warn("[CHash.sendCmd] no netCtrl", cmd, dData);
      return;
    }
    netCtrl.sendCmd(cmd, dData);
  },
});


module.exports = {
  getDB,
  removeDB,
  initDSConnection,
  CNetObjBase,
  CHash,
  CNormal,
  CSortedSet,
  CList,
  CGeo,
  CSet,
  CExpireNormal,
  setDefaultRedisDB,
  setDefaultMySqlDB,
};