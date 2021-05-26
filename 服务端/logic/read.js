const assert = require('assert');
const CBase = require('./base');

class CRead extends CBase {
  customRelease() {
    this.m_Lab = null;
  }
  setLab(oLab) {
    this.m_Lab = oLab;
  }
  onInit() { }
  validReading(facID, charaID, param) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac || !param || !param.bookID) {
      return mbgGame.config.ErrCode.Error;
    }
    if (!this.m_Lab.hasBook(param.bookID)) {
      return mbgGame.config.ErrCode.Error;
    }

    /*
    const dBookConfig = this.m_Lab.getBookConfig(param.bookID);
    const costMat = dBookConfig.costMat;
    const pobj = this.pobj();
    if (pobj.getAttr("mat") < costMat) {
      return mbgGame.config.ErrCode.LackMat;
    }
    */
    return mbgGame.config.ErrCode.OK;
  }
  beginReading(facID, charaID, param) {
    /*
    3 阅读时需要消耗对应的微波
    4 每本书有一个阅读的基础经验，书对角色都有一个加成，会影响最后获得的经验
    5 记录每个角色读每一本书的次数，阅读次数越多，经验越少（对应关系配常熟表)
    6 阅读经验=基础经验(1+角色加成)(1-阅读次数递减)
    7 每本书阅读的时间与角色等级、书本等级、页数有关，角色与书本的等级差会计算出一个系数，每个角色阅读书的基础速度相同（配常熟表，每分钟读N页
    8 阅读时间=页数/速度*rounddown(书本等级-角色等级+100)% * 阅读等级差系数
    9 阅读开始后可以中断阅读
    */
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();
    dFac.trT = nowtime;
    // 结算页数，每次结算刷新
    dFac.sP = 0;
    dFac.b = param.bookID;
    dFac.lv = this.m_Lab.getLv();
    // 阅读时间(秒)=最大可读页数
    dFac.d = this.getReadPagesLimit(charaID, param.bookID);
    assert(dFac.d > 0, `nT:${dFac.d}`);
    this.m_Lab.onDataChanged();
    return mbgGame.config.ErrCode.OK;
  }
  // 获取最大阅读页数
  getReadPagesLimit(charaID, bookID) {
    const dBookConfig = this.m_Lab.getBookConfig(bookID);
    if (!dBookConfig) {
      return 0;
    }
    const logPages = this.m_Lab.getReadPages(charaID, bookID);
    let times = Math.floor(logPages / dBookConfig.pages);
    if (times > 3) {
      return dBookConfig.pages;
    }
    times = 4 - times;
    if (times > 4) times = 4;
    return dBookConfig.pages * times;
  }
  getReward(facID, dRet, forceRemove) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac) return mbgGame.config.ErrCode.Error;
    const charaID = dFac.c && dFac.c[0];
    if (!charaID) return mbgGame.config.ErrCode.Error;
    const dResult = this.afterReading(facID, charaID, dRet);
    if (dFac.sP >= dFac.d || forceRemove) {
      // 已经读完了，自动下岗，或者点休息强制下岗
      delete dFac.trT;
      delete dFac.d;
      delete dFac.sP;
      delete dFac.b;
      delete dFac.lv;
      dRet.remove = true;
      this.m_Lab.removeFacChara(facID, charaID);
    } else {
      this.m_Lab.onDataChanged();
    }
    return dResult;
  }
  calcReadExp(charaID, bookID, pages, labLv) {
    const dBookConfig = this.m_Lab.getBookConfig(bookID);
    if (!dBookConfig) {
      return 0;
    }
    /*
    const logPages = this.m_Lab.getReadPages(charaID, bookID);
    let times = Math.floor(logPages / dBookConfig.pages);
    if (times > 3) times = 3;
    if (times < 0) times = 0;
    */
    // 初始档位
    const defaultLvl = 3;
    // 第一个等级多角色修正值
    const dLvl = dBookConfig[`c${charaID}`];
    let lvl = defaultLvl + dLvl;
    if (lvl < 0) lvl = 0;
    if (lvl > 6) lvl = 6;
    // 此时lvl为当前的级别
    const n = Math.floor(pages / dBookConfig.pages);
    const dPages = Math.floor(pages % dBookConfig.pages);
    let firstRatio = 0;
    let lastLvl = lvl - n;
    if (lastLvl < 0) lastLvl = 0;
    if (lastLvl > 6) lastLvl = 6;
    const lastRatio = mbgGame.config.constTable.BookFaces[6 - lastLvl];
    for (let i = lvl; i > lvl - n; i--) {
      if (i >= 0 && i < 7) {
        firstRatio += mbgGame.config.constTable.BookFaces[6 - i];
      } else if (i >= 6) {
        firstRatio += mbgGame.config.constTable.BookFaces[0];
      } else {
        firstRatio += mbgGame.config.constTable.BookFaces[6];
      }
    }
    let readExp = Math.round((this.m_Lab.getConfig(labLv).labExpK * ((dBookConfig.pages * (n + firstRatio)) + (dPages * (1 + lastRatio)))) / 60);
    readExp = Math.max(0, readExp);
    mbgGame.logger.info("calcReadExp:", charaID, bookID, pages, this.m_Lab.getConfig().labExpK, n, dPages, readExp, firstRatio, lastRatio);
    return readExp;
  }
  afterReading(facID, charaID, dRet) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();

    let readPageFromBegin = nowtime - dFac.trT;
    if (readPageFromBegin > dFac.d) {
      // 不能超过最大可读页数
      readPageFromBegin = dFac.d;
    }
    // 当前结算页数
    const nowReadPages = readPageFromBegin - dFac.sP;
    const bookID = dFac.b;
    const pobj = this.pobj();
    const lastPages = this.m_Lab.getReadPages(charaID, bookID);
    const lastExp = this.calcReadExp(charaID, bookID, lastPages, dFac.lv);
    const nowExp = this.calcReadExp(charaID, bookID, lastPages + nowReadPages, dFac.lv);
    // console.log("afterReading:", charaID, bookID, lastExp, nowExp, nowExp - lastExp);
    // 增加当前结算页
    this.m_Lab.addReadPages(charaID, bookID, nowReadPages);
    dFac.sP += nowReadPages;

    const dCharaExp = {};
    const getExp = Math.max(0, nowExp - lastExp);
    if (getExp <= 0) {
      return mbgGame.config.ErrCode.Lab_TooShort;
    }
    dCharaExp[charaID] = getExp;
    const dAward = {
      noBonus: 1,
      charaexp: dCharaExp,
    };
    const charaIDs = [charaID];
    const dResult = pobj.m_WarCommon.giveAwardForWar(null, charaIDs, dAward, "read");
    // pobj.m_Stat.addStatVal("readbook", 1);

    dRet.result = dResult;
    return mbgGame.config.ErrCode.OK;
  }
  validGetReadingExp(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    if (!dFac) return mbgGame.config.ErrCode.Lab_NoChara;
    const charaID = dFac.c && dFac.c[0];
    if (!charaID) {
      return mbgGame.config.ErrCode.Lab_NoChara;
    }
    if (!dFac.trT) {
      return mbgGame.config.ErrCode.Lab_NotReading;
    }
    /*
    const leftTime = this.getLeftTime(facID);
    if (leftTime < 0) {
      return mbgGame.config.ErrCode.Lab_TooShort;
    }
    */
    return mbgGame.config.ErrCode.OK;
  }
  // seconds，注意，必须先验证再调用此接口
  getLeftTime(facID) {
    const dFac = this.m_Lab.getFacDataByFacID(facID);
    const nowtime = moment().unix();
    const leftTime = Math.max(0, dFac.trT + dFac.d - nowtime);
    return leftTime;
  }
  tryGetReadingExp(facID, dRet, forceRemove) {
    const err = this.validGetReadingExp(facID);
    if (err) {
      return err;
    }
    return this.getReward(facID, dRet, forceRemove);
  }
}

module.exports = CRead;