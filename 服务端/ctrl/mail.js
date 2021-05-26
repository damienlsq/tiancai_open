// /////////////////////////////
// /     邮件系统
// /////////////////////////////

const DEFAULT_EXPIRE_TIME = 15 * 86400; // 邮件默认15天有效期

// 玩家邮件
const NMail = mbgGame.common.db_mgr.CHash.extend({
  // key: uuid
  FuncType: "pl",
  SubType: "mail",
});

const listMail = function* (netCtrl) {
  // 返回所有邮件的标题和读取标志附件标志
  const nPlayer = netCtrl.getCtrl();
  const uuid = nPlayer.getUUID();
  const nMails = new NMail(uuid);
  const now = moment().unix();

  const lst = yield nMails.hgetall();
  const mailsData = {};
  for (const key in lst) {
    const value = lst[key];
    const mail = JSON.parse(value);

    if (mail.outDate && mail.outDate < now) {
      // 邮件已经超时
      nPlayer.logInfo("[listMail] outDate remove", mail);
      continue;
    }
    if (mail.modifyData || mail.special) {
      continue;
    }

    mail.title = mail.sTitle;
    if (mail.kTitle) {
      mail.title = nPlayer.getString(mail.kTitle);
    }
    if (mail.kContent) {
      mail.content = nPlayer.getString(mail.kContent);
    }
    mail.content = mail.sContent;
    if (mail.kContent) {
      mail.content = nPlayer.getString(mail.kContent);
    }
    delete mail.kTitle;
    delete mail.sTitle;
    delete mail.kContent;
    delete mail.sContent;
    mailsData[key] = mail;
  }
  return mailsData;
};

const readMail = function* (netCtrl, id) {
  const nPlayer = netCtrl.getCtrl();
  const uuid = nPlayer.getUUID();
  const nMails = new NMail(uuid);
  const readKeys = [];
  readKeys.push(id);
  const value = yield nMails.hget(id);

  nPlayer.logInfo("[readMail]", value);
  if (!value) return readKeys;
  const mail = JSON.parse(value);
  if (mail.gf === 0) {
    // 未领附件的邮件都不能标记已读
    return readKeys;
  }
  mail.rf = 1;
  yield nMails.hset(id, JSON.stringify(mail));
  return readKeys;
};

const getOneMail = function* (pobj, nMails, mailId, value, getKeys) {
  pobj.logInfo("[getOneMail]", mailId, value);
  const mail = JSON.parse(value);
  if (mail.gf === 0) {
    const ok = pobj.validGiveAward(mail.award);
    pobj.logInfo("validGiveAward", ok);
    if (!ok) {
      pobj.getNetCtrl().sendWarning(pobj.getString("mailBagFull"));
      return;
    }
    pobj.giveAward(mail.award, 'mail');

    getKeys.push(mailId);
    // 改为邮件领取后直接删除
    // yield nMails.hset(mailId, JSON.stringify(mail));
    yield nMails.hdel(mailId);
  }
};

const getMail = function* (netCtrl, id) {
  const nPlayer = netCtrl.getCtrl();
  const pobj = nPlayer.getPlayerLogic();
  const uuid = nPlayer.getUUID();
  const nMails = new NMail(uuid);

  const getKeys = [];
  if (!id) {
    // 一键领取
    const allMailData = yield nMails.hgetall();
    const award = {};
    for (const _id in allMailData) {
      const value = allMailData[_id];
      const mail = JSON.parse(value);
      // 需要用整合模式发送
      if (mail.gf === 0) {
        const ok = pobj.validGiveAward(mail.award);
        if (!ok) {
          pobj.getNetCtrl().sendWarning(pobj.getString("mailBagFull"));
          continue;
        }
        pobj.concatAwardData(award, mail.award);

        getKeys.push(_id);
        // 改为邮件领取后直接删除
        // yield nMails.hset(mailId, JSON.stringify(mail));
        yield nMails.hdel(_id);
      }
    }
    pobj.giveAward(award, 'mail');
    return getKeys;
  }

  const value = yield nMails.hget(id);
  if (!value) {
    return getKeys; // 已经删除了
  }
  yield getOneMail(pobj, nMails, id, value, getKeys);
  return getKeys;
};

const clearMail = function* (uuid) {
  const nMails = new NMail(uuid);

  yield nMails.del();
  mbgGame.logger.info("[clearMail]", uuid);
};

const delMail = function* (netCtrl, id) {
  const nPlayer = netCtrl.getCtrl();
  const uuid = nPlayer.getUUID();
  const nMails = new NMail(uuid);

  const delKeys = [];
  if (!id) {
    // 删除所有已读
    const lst = yield nMails.hgetall();

    for (const key in lst) {
      const value = lst[key];
      const mail = JSON.parse(value);
      if (mail.rf && mail.gf !== 0) {
        yield nMails.hdel(key);
        delKeys.push(key);
      }
    }
    return delKeys;
  }
  yield nMails.hdel(id);
  delKeys.push(id);
  return delKeys;
};

const addMail = function* (uuid, mData) {
  const seed = (new Date()).getTime();
  const now = moment().unix();
  const nMails = new NMail(uuid);

  const mailData = {
    time: mData.time || now, // mail添加日期
    rf: 0, // 阅读标记 0 未读， 1 已读
  };

  if (mData.award) {
    mailData.award = _.clone(mData.award);
    mailData.gf = 0; // 附件获取标记，0 未获取， 1 已获取  2 没有附件
  } else {
    mailData.gf = 2;
  }

  if (mData.sTitle) {
    mailData.sTitle = mData.sTitle;
  } else {
    mailData.kTitle = mData.kTitle || 'mailt_default';
  }

  if (mData.sContent) {
    mailData.sContent = mData.sContent;
  } else {
    mailData.kContent = mData.kContent || 'mailc_default';
  }

  if (mData.modifyData) {
    // 邮件是后台用来设置修正玩家属性
    mailData.modifyData = mData.modifyData;
  }
  if (mData.special) {
    // 特殊邮件
    mailData.special = mData.special;
  }

  // 生成mail id，需要确保唯一
  const id = `${seed}${_.random(0, 9)}`;

  // 所有邮件最长只保留15天
  mailData.outDate = mailData.time + DEFAULT_EXPIRE_TIME;

  yield nMails.hset(id, JSON.stringify(mailData));

  const leftT = yield nMails.ttl();
  let expireTime = mailData.outDate - now + 60;
  if (expireTime < 0) {
    expireTime = 60;
  }
  if (leftT < expireTime) {
    yield nMails.setExpireBySeconds(expireTime);
  }
  mbgGame.logger.info("[addMail]", uuid, id, JSON.stringify(mailData), expireTime);

  if (mailData.modifyData || mailData.special) return;
  // 通知客户端
  mbgGame.serverCtrl.sendCmdByUUID(uuid, 'newMail', {
    count: 1,
  });
};

const checkMail = function* (netCtrl) {
  // 邮件检查，如果有新邮件，就加入，清理过期邮件，返回新邮件数量
  const nPlayer = netCtrl.getCtrl();
  const logic = nPlayer.getPlayerLogic();
  const now = moment().unix();
  const redis = mbgGame.common.db_mgr.getDB("redis-stat");
  const uuid = nPlayer.getUUID();
  let checkID = uuid;

  const nMails = new NMail(uuid);

  // 判断是否有新邮件需要加入
  for (let i = 0; i < mbgGame.gift.length; i++) {
    const gift = mbgGame.gift[i];
    if (gift.type !== 5 && gift.type !== 'wechat_auto' && gift.type !== 'wechat_codeInput') {
      // type = 5 为系统邮件
      continue;
    }
    if (gift.invalid) {
      continue;
    }
    if (gift.channel_id && gift.channel_id.indexOf(netCtrl.channel_id) === -1) continue;

    if (gift.version) {
      if (gift.version !== netCtrl.version) continue;
    }
    if (gift.coreVersion) {
      if (gift.coreVersion !== netCtrl.coreVersion) continue;
    }
    // 礼包邮件的有效期
    if (gift.startTime) {
      if (gift.startTime > now) continue;
    }
    if (gift.endTime) {
      if (gift.endTime < now) continue;
    }
    // 一定要有logkey才允许生效
    if (!gift.logkey) {
      continue;
    }
    if (gift.type === 'wechat_auto' || gift.type === 'wechat_codeInput') {
      // 用unionid标记
      const wechatInfo = nPlayer.getWechatUserInfo();
      if (wechatInfo) {
        checkID = netCtrl.wechatUserInfo.unionid;
      } else {
        continue;
      }
      // 检查是否有礼包
      const ret = yield redis.sismember(gift.unionidkey, checkID);
      if (!ret) {
        continue;
      }
      // 领后移除省空间
      yield redis.srem(gift.unionidkey, checkID);
    }

    // 检查是否已经发送
    const ret = yield redis.sismember(gift.logkey, checkID);
    if (ret) {
      continue;
    }
    yield redis.sadd(gift.logkey, checkID);
    const mailGiftData = _.clone(gift);
    if (mailGiftData.award && mailGiftData.award.awardKey) {
      const reward = mbgGame.config.award[mailGiftData.award.awardKey];
      if (reward) {
        mailGiftData.award = _.clone(reward);
      }
    }
    // 满足条件，增加邮件
    yield addMail(uuid, mailGiftData);
  }

  const lst = yield nMails.hgetall();
  let newMailCount = 0;

  // nPlayer.mailCache = [];
  nPlayer.logInfo("[checkMail]", lst);
  let expireTime = now;

  const ids = _.keys(lst);
  for (let i = 0; i < ids.length; i++) {
    const key = ids[i];
    const value = lst[key];
    let mail;
    try {
      mail = JSON.parse(value);
      // 分析邮件并处理
      if (!mail) {
        nPlayer.logError("[checkMail] no data:", value);
        yield nMails.hdel(key);
        continue;
      }
    } catch (e) {
      nPlayer.logError("[checkMail] error:", value, e);
      yield nMails.hdel(key);
      continue;
    }
    // console.log('[checkMail1] mail', mail);
    if (mail.modifyData) {
      // 系统邮件，直接处理掉， 特殊字段内容，只需要设置info
      // 'gc_id', 'email', 'nickname', 'wechat_id'
      if (mail.modifyData.nickname) {
        yield nPlayer.setInfo('nickname', mail.modifyData.nickname);
      }
      if (mail.modifyData.gc_id) {
        if (mail.modifyData.gc_id === ' ') {
          yield nPlayer.removeInfo('gc_id');
        } else {
          yield nPlayer.setInfo('gc_id', mail.modifyData.gc_id);
        }
      }
      if (mail.modifyData.wechat_id) {
        if (mail.modifyData.wechat_id === ' ') {
          nPlayer.removeVal('wechat');
        }
      }

      nPlayer.logInfo("[checkMail] modifyData", mail);
      logic.giveAward(mail.award, 'modifyData', true);
      yield nMails.hdel(key);
      continue;
    }

    if (mail.special) {
      // 特殊邮件
      switch (mail.special.op) {
        case 'cmt': // 开箱减少时间
          {
            logic.m_BattleCtrl.reduceChestTime(mail.special.id);
            break;
          }
        case 'cms': // 箱子祝福加星
          {
            logic.m_BattleCtrl.blessChest(mail.special.id);
            break;
          }
        default: break;
      }
      yield nMails.hdel(key);
      continue;
    }

    if (mail.outDate && mail.outDate < now) {
      // 邮件已经超时
      nPlayer.logInfo("[checkMail] outDate remove", mail);
      yield nMails.hdel(key);
      continue;
    }
    if (mail.outDate && mail.outDate > expireTime) {
      expireTime = mail.outDate;
    }
    // 只要有东西未领，就一直有红点
    if (mail.gf === 0) {
      newMailCount += 1;
    } else if (mail.rf === 0) {
      newMailCount += 1;
    }
  }

  // 更新邮件检查时间
  yield nPlayer.setInfo("mail", now);
  // 更新为最长的邮件保存日期
  expireTime = expireTime - now + 60;
  if (expireTime < 0) {
    expireTime = 60;
  }
  yield nMails.setExpireBySeconds(expireTime);

  return newMailCount;
};

module.exports = {
  checkMail,
  listMail,
  readMail,
  addMail,
  getMail,
  delMail,
  clearMail,
};
