
const mailCtrl = require('./mail');
const w_defines = require('../logic/w_defines');

// /////////////////////////////
// /     信息系统
// /////////////////////////////

const boardInfo = mbgGame.common.db_mgr.CHash.extend({ // name = id
  FuncType: "board",
  SubType: "data",
});

const boardInfoSet = mbgGame.common.db_mgr.CSet.extend({ // name = id
  FuncType: "board",
  SubType: "data",
});

const boardHotZSet = mbgGame.common.db_mgr.CSortedSet.extend({ // name = id
  FuncType: "board",
  SubType: "hot",
});

const boardServer = mbgGame.common.db_mgr.CSortedSet.extend({

  FuncType: "board",
  // SubType: "",
  * doPost(data, config, channel) {
    if (!data.id) return;
    console.log("doPost data", data);

    let expireTime = (+config.expireDays) * 86400;

    data.t = moment().unix();

    // 写到redis
    this.SubType = channel;
    yield this.zadd(data.t, data.id);

    if (+config.saveCount) {
      // 删除排名在前面的，时间最老
      yield this.zremrangebyrank(0, -(+config.saveCount + 1));
    }

    const msgData = new boardInfo(data.id);
    yield msgData.hmset(data);

    if (channel === 'help') {
      expireTime = 7 * 86400;
    }
    if (expireTime) {
      yield msgData.setExpireBySeconds(expireTime);

      // 用来占坑
      if (config.allowLike) {
        const dataSet = new boardInfoSet(data.id);
        dataSet.SubType = "like";
        yield dataSet.sadd(data.uuid || "0");
        yield dataSet.setExpireBySeconds(expireTime);
      }

      if (config.allowUnlike) {
        const dataSet = new boardInfoSet(data.id);
        dataSet.SubType = "unlike";
        yield dataSet.sadd(data.uuid || "0");
        yield dataSet.setExpireBySeconds(expireTime);
      }

      if (config.allowTips) {
        const dataSet = new boardInfoSet(data.id);
        dataSet.SubType = "tips";
        yield dataSet.sadd(data.uuid || "0");
        yield dataSet.setExpireBySeconds(expireTime);
      }
    }
  },

  * rant(config, channel, isList) {
    // 如果没有配置概率，就不需要进入碎碎念了
    if (!config.wPercent) return;
    let seed = 0;
    if (_.isArray(config.wPercent)) {
      seed = config.wPercent[0];
      if (isList && config.wPercent.length > 1) {
        seed = config.wPercent[1];
      }
    } else {
      seed = config.wPercent;
    }
    if (_.random(0, 10000) > seed) return;

    if (!mbgGame.config.rant) return;
    const sayIds = [];
    _.mapObject(mbgGame.config.rant, (value, id) => {
      if (value.scene !== channel) return;
      // if (value.action && value.action !== action) return;
      // if (value.chara && value.chara !== self.cData.charaID) return;
      sayIds.push(id);
    });
    if (sayIds.length) return;

    const rantId = _.sample(sayIds);

    // 检查如果已有重复id，就不要发这个
    this.SubType = channel;
    const ret = yield this.zscore(rantId);
    // console.log("rantID",rantId,ret);
    if (ret != null) return;

    // 判断时间

    const postData = {
      id: rantId,
      c: channel,
      m: mbgGame.serverCtrl.getString('zh', `rant${rantId}`),
    };
    if (config.nameKey) {
      postData.w = mbgGame.serverCtrl.getString('zh', config.nameKey);
    }
    if (config.icon) {
      postData.i = config.icon;
    }

    yield this.doPost(postData, config, channel);
  },

  * aiReply(config, channel, msg) {
    if (!config.aiReply) return;

    let seed = 0;
    if (_.isArray(config.wPercent)) {
      seed = config.wPercent[0];
      if ((_.isArray(msg) && msg.length >= 1) && config.wPercent.length > 1) {
        seed = config.wPercent[1];
      }
    } else {
      seed = config.wPercent;
    }
    if (_.random(0, 10000) > seed) return;

    let replyMsg;
    if (_.isArray(msg) && msg.length >= 1) {
      // list模式， 如果长时间没有新信息，就尝试产生一条信息
      const now = moment().unix();
      const lastData = msg[0];
      if (now - lastData.t >= _.random(300, 600)) {
        replyMsg = lastData.m;
      }
    } else if (_.isString(msg)) {
      replyMsg = msg;
    }

    if (config.AITest && config.AITest.length > 0) {
      replyMsg = _.sample(config.AITest);
    }

    if (!replyMsg) return;

    const aiMsg = yield mbgGame.serverCtrl.aiMessageAPI(replyMsg);

    if (!aiMsg) return;

    // 检查如果已有重复id，就不要发这个
    this.SubType = channel;

    const postData = {
      c: channel,
      m: aiMsg,
    };
    postData.id = yield mbgGame.serverCount.getID("post");
    postData.id += 100000; // 10W一下ID留给碎碎念

    if (config.nameKey) {
      let name;
      if (_.isArray(config.nameKey)) {
        name = _.sample(config.nameKey);
        if (name[0] === 'c') {
          name = name.substring(1);
          postData.ci = name;
          postData.w = mbgGame.serverCtrl.getString('zh', `charaname${name}`);
        }
        if (name[0] === 'm') {
          const mID = name.substring(1);
          postData.mi = mID;
          postData.w = mbgGame.serverCtrl.getString('zh', `mname${w_defines.getMTplID(mID)}`);
        }
      } else {
        postData.w = mbgGame.serverCtrl.getString('zh', config.nameKey);
      }
    }
    if (config.icon) {
      postData.i = config.icon;
    }

    yield this.doPost(postData, config, channel);
  },

  * post(netCtrl, data) {
    const channel = data.c;
    const msg = data.msg;
    if (!channel) return;
    const config = mbgGame.config.boardList[channel];
    if (!config) return;
    if (msg.length > (+config.msgMaxLength || 1024)) {
      return;
    }

    const nPlayer = netCtrl.getCtrl();
    const logic = nPlayer.getPlayerLogic();
    const nickName = nPlayer.getInfo('nickname');
    if (!nickName) return;

    if (config.payUser) {
      // 需要玩家有充值才能发表
      if (logic.m_Stat.getStatVal('chargeGet') <= 0) {
        netCtrl.sendMessage(nPlayer.getString("board_payUser"));
        return;
      }
    }

    const postData = {
      uuid: nPlayer.getUUID(), // 记录发帖人uuid
      w: nickName, // 发帖人名字
      ti: nPlayer.getTotem(), // logo头像
      c: channel, // 信息墙
      m: msg, // 信息内容
    };
    // l: 赞  u: 踩 f: 转发 a: 收藏 d: 打赏

    postData.id = yield mbgGame.serverCount.getID("post");
    postData.id += 100000; // 10W一下ID留给碎碎念

    yield this.doPost(postData, config, channel);

    logic.m_Stat.addStatVal("PostTimes", 1);
    /*
            const self = this;
            mbgGame.common.timer.setOnceTimer(10 * 1000, () => {
                co(function* () {
                    yield self.rant(config, channel);
                    yield self.aiReply(config, channel, msg);
                }).catch((err, result) => {
                    mbgGame.logger.info("[board.post] randTalk ", err, result);
                });
            });
    */
  },

  * list(channel, page, lastTime, nPlayer) {
    const config = mbgGame.config.boardList[channel];
    if (!config) return null;

    this.SubType = channel;
    const pageCount = (+config.showCount - 1) || 49;
    const totalCount = yield this.zcard();

    let ids = yield this.zrevrange(pageCount * page, pageCount * (page + 1));
    const lstData = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const msgData = new boardInfo(id);
      const dData = yield msgData.hgetall();
      if (!dData) {
        // 数据已经删除了
        yield this.zrem(id);
        continue;
      }
      if (channel === 'help') {
        if (dData.uuid && dData.uuid !== nPlayer.getUUID()) {
          continue; // 只显示自己的发帖
        }
        if (dData.reply && dData.reply !== nPlayer.getUUID()) {
          continue; // 只显示给自己的回复
        }
      }
      delete dData.uuid;
      if (config.rumor) {
        // 匿名
        delete dData.w;
        delete dData.ti;
      }

      lstData.push(dData);
    }

    const hotData = [];
    if (page === 0) {
      // 第一页才返回热蒙
      const hotzSet = new boardHotZSet(channel);
      ids = yield hotzSet.zrevrange(0, 2);

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const msgData = new boardInfo(id);
        const dData = yield msgData.hgetall();
        if (!dData) {
          // 数据已经删除了
          yield hotzSet.zrem(id);
          continue;
        }
        delete dData.uuid;
        if (config.rumor) {
          // 匿名
          delete dData.w;
          delete dData.ti;
        }
        hotData.push(dData);
      }
      yield this.rant(config, channel, true);
      yield this.aiReply(config, channel, lstData);
    }
    // console.log("list data",lstData);
    return {
      msgs: lstData,
      hots: hotData,
      total: totalCount,
    };
  },
  // 统计热门信息
  * hotCount(channel, id, count) {
    // 统计热门信息，赞+1,只保留前5个
    const hotzSet = new boardHotZSet(channel);
    yield hotzSet.zincrby(count, id);
    yield hotzSet.zremrangebyrank(0, -5);
  },

  * like(id, nPlayer) {
    const msgData = new boardInfo(id);
    const dData = yield msgData.hgetall();
    if (!dData) return null;
    const config = mbgGame.config.boardList[dData.c];
    if (!config) return null;
    if (!config.allowLike) return null;
    if (!nPlayer) return null;

    const dataSet = new boardInfoSet(id);
    dataSet.SubType = "like";
    const count = yield dataSet.sadd(nPlayer.getUUID());
    if (count < 1) {
      const netCtrl = nPlayer.getNetCtrl();
      netCtrl.sendMessage(nPlayer.getString("board_liked"));
      return null;
    }

    dData.l = yield msgData.hincrby('l', count);

    // 热门信息+1
    yield this.hotCount(dData.c, id, 1);

    if (dData.uuid) {
      yield mbgGame.rankList.incrScore('like', dData.uuid, 1);
    }
    const logic = nPlayer.getPlayerLogic();
    logic.m_Stat.addStatVal("doLikeTimes", 1);
    return dData;
  },

  * unlike(id, nPlayer) {
    const msgData = new boardInfo(id);
    const dData = yield msgData.hgetall();
    if (!dData) return null;
    const config = mbgGame.config.boardList[dData.c];
    if (!config) return null;
    if (!config.allowUnlike) return null;
    if (!nPlayer) return null;
    const netCtrl = nPlayer.getNetCtrl();

    const dataSet = new boardInfoSet(id);
    dataSet.SubType = "unlike";
    const count = yield dataSet.sadd(nPlayer.getUUID());
    if (count < 1) {
      netCtrl.sendMessage(nPlayer.getString("board_unliked"));
      return null;
    }

    dData.u = yield msgData.hincrby('u', 1);

    // 热门信息-1
    yield this.hotCount(dData.c, id, 1);

    if (dData.uuid) {
      yield mbgGame.rankList.incrScore('unlike', dData.uuid, 1);
    }

    const logic = nPlayer.getPlayerLogic();
    logic.m_Stat.addStatVal("doUnLikeTimes", 1);
    return dData;
  },

  * tips(id, nPlayer) {
    const msgData = new boardInfo(id);
    const dData = yield msgData.hgetall();
    if (!dData) return null;
    const config = mbgGame.config.boardList[dData.c];
    if (!config) return null;
    if (!config.allowTips) return null;
    if (!nPlayer) return null;
    const logic = nPlayer.getPlayerLogic();
    const netCtrl = nPlayer.getNetCtrl();

    const dataSet = new boardInfoSet(id);
    dataSet.SubType = "tips";
    const count = yield dataSet.sadd(nPlayer.getUUID());
    // console.log("do tips", count);
    if (count < 1) {
      netCtrl.sendMessage(nPlayer.getString("board_tipsed"));
      return null;
    }

    if (config.allowTips > 1) {
      // 需要钱去打赏
      let money = 0;
      if (config.unit === "coins") {
        money = logic.getCoins();
      } else if (config.unit === "diamonds") { // 默认是钻石
        money = logic.getDiamonds();
      } else {
        return null;
      }
      if (money < config.allowTips) {
        netCtrl.sendWarning(netCtrl.getString("moneyNotEnough", {
          unit: netCtrl.getString((config.unit || "diamonds")),
        })); // 不够钱购买
        return null;
      }

      let award = {};
      if (config.unit === "coins") {
        logic.addCoins(-config.allowTips, "tips");
        award = {
          coins: config.allowTips,
        };
      } else if (config.unit === "diamonds") { // 默认是钻石
        // 扣钻石
        logic.addDiamonds(-config.allowTips, null, 'tips');
        award = {
          diamonds: config.allowTips,
        };
      }
      // todo 把钱给予被打赏的玩家，该玩家可能处于非在线状态
      if (dData.uuid) {
        yield mailCtrl.addMail(dData.uuid, {
          kTitle: 'mailt_tips',
          kContent: 'mailc_tips',
          award,
        });
      }
    }



    dData.d = yield msgData.hincrby('d', count);
    // 热门信息+2
    yield this.hotCount(dData.c, id, 2);

    if (dData.uuid) {
      yield mbgGame.rankList.incrScore('tips', dData.uuid, 1);
    }

    logic.m_Stat.addStatVal("doTipsTimes", 1);
    return dData;
  },
  /*
      * forward(id, nPlayer) {
          const msgData = new boardInfo(id);
          const dData = yield msgData.hgetall();
          if (!dData) return null;
          const config = mbgGame.config.boardList[dData.c];
          if (!config) return null;
          if (!config.allowForward) return null;
          dData.f = yield msgData.hincrby('f', 1);
          return dData;
      },

      * mark(id, nPlayer) {
          const msgData = new boardInfo(id);
          const dData = yield msgData.hgetall();
          if (!dData) return null;
          const config = mbgGame.config.boardList[dData.c];
          if (!config) return null;
          if (!config.allowMark) return null;
          dData.a = yield msgData.hincrby('a', 1);
          return dData;
      },
  */
});

module.exports = {
  boardServer,
};