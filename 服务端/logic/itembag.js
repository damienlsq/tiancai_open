const defines = require('./w_defines');
const CBase = require('./base');
const co = require('co');

/*
2017-7-17 Note：这个文件不包含战斗属性的计算了，移到了WarData

道具背包
item = {
    own: {
        // 2017-07-06 改:
        // 去掉数量n
        sid: { // sid是唯一ID
            i: 道具类型ID
            lv: 道具级别(用金币强化)
            ep: 经验
            s: 星级
            q: 品质
            l: 加锁
            k: 获得时间序号，只用于客户端排序，k越大越新
            m: [
              0: [主属性ID, add数值, mul数值], 特殊道具如VIP道具才有0
              1: [副1ID，add数值, mul数值],
              2: [副2ID，add数值, mul数值],
            ]
            e: 附魔类型ID Enchant 【附魔表】的ID
            // 特定物品才有的字段
            t:     获得该物品的时间戳 单位：秒
            d:     持续时长 单位：秒
        }
    }
}
*/
// 保存玩家删除的道具
const NRemoveItemsList = mbgGame.common.db_mgr.CList.extend({
  // 有效期7天，有效长度100
  FuncType: "items",
  SubType: "remove",

  * addRemoveItem(data) {
    yield this.lpush(JSON.stringify(data));
    yield this.ltrim(0, mbgGame.config.removeItemsListMax || 100);
    yield this.setExpireBySeconds(7 * 86400);
  },
});


class CItemBag extends CBase {
  getItemSystemDBData() {
    let dSystemData = this.pobj().getVal("item");
    if (!dSystemData) {
      dSystemData = {
        own: {},
      };
      this.pobj().setValOnly("item", dSystemData);
    }
    return dSystemData;
  }
  // 给一个新的排序序号
  getNewItemK() {
    let itemK = this.pobj().getVal("itemk") || 0;
    itemK += 1;
    this.pobj().setValOnly("itemk", itemK);
    return itemK;
  }
  getItemDBData() {
    const dSystemData = this.getItemSystemDBData();
    if (!dSystemData.own) {
      dSystemData.own = {};
    }
    return dSystemData.own;
  }
  onAllItemChanged() {
    this.pobj().sendCmd("items", this.getItemSystemDBData());
  }
  onSomeItemsChanged(sidList) {
    this.pobj().beginBatchSend('item');
    for (let i = 0; i < sidList.length; i++) {
      const sid = sidList[i];
      this.pobj().sendCmd("item", {
        sid,
        data: this.getItemData(sid),
      });
    }
    this.pobj().endBatchSend();
  }
  onItemsDel(sidList) {
    this.pobj().sendCmd("delItems", {
      sidList,
    });
  }
  getItemData(sid) {
    const dDBData = this.getItemDBData();
    return dDBData[sid];
  }
  setItemData(sid, dItemData, reason) {
    const dDBData = this.getItemDBData();
    const dOldItemData = dDBData[sid];
    this.logInfo(`setItemData, ${reason}, from:`, dDBData[sid] && JSON.stringify(dDBData[sid]),
      "to:", JSON.stringify(dItemData));
    dItemData.ep = dOldItemData.ep;
    dDBData[sid] = dItemData;
  }
  getItemID(sid) {
    const dDBData = this.getItemDBData();
    return dDBData[sid] && dDBData[sid].i;
  }
  // 根据世界idx和品质，返回已解锁的道具ID列表
  // 注意，没有填【对应关卡】的道具，不会被返回（稀有道具）
  // worldIdx = 1/2/3/null
  getOwnedItemIDs(worldIdx) {
    const dDBData = this.getItemDBData();
    const sidList = defines.getDictIntKeys(dDBData);
    const itemIDs = _.map(sidList, (sid) => {
      return this.getItemID(sid);
    });
    return _.filter(itemIDs, (itemID) => {
      const dConfig = mbgGame.config[`item${itemID}`];
      if (!dConfig) {
        // 严重错误，这个道具ID从表里删除了
        return false;
      }
      if (!dConfig.stageID) {
        // 没有配关卡ID的道具，都是很特别的道具，这个接口不返回这种道具
        return false;
      }
      if (worldIdx && dConfig.worldIdx > 0 && dConfig.worldIdx !== worldIdx) {
        return false;
      }
      return true;
    });
  }
  getItemDataDictByBag(bag, dItemDBData, dFixedLv) {
    if (!dItemDBData) {
      dItemDBData = this.getItemDBData();
    }
    return mbgGame.WarData.getItemDataDictByBag(bag, dItemDBData, dFixedLv);
  }
  isItemExpired(sid) {
    const dDBData = this.getItemDBData();
    const dItemData = dDBData[sid];
    if (!dItemData || !dItemData.t) {
      return false;
    }
    const now = moment().unix();
    if (dItemData.t + dItemData.s > now) {
      return false;
    }
    return true;
  }
  // itemID决定特效（技能）
  // roll星级
  // roll品质1-4
  // 通过品质roll属性种类: 1 主+副1 2：1+特效 3：2+副2  4：3+附魔
  //      主属性的数值（读表）
  //      roll副属性的数值（副1 副2）
  //      特效照旧
  //      roll附魔ID（技能表按照类型抽）
  /*
  关卡表试炼副本加入解锁星级字段，通关指定副本解锁该副本的掉落星级
  如：通关试炼20关解锁4星道具，通关21关后才有几率掉落4星道具，道具掉率的种类照旧，掉率星级权重配在常数表
  宝箱掉落按通关最高试炼对应的星级计算，例如通关任意20关试炼，宝箱最高能开出4星装备
  品质掉落权重 按原先QualityWeight
  星级权重 当前掉落最高星级标记为4 1 2 3分别代表低3星 低2星 低1星 （要区分是试炼还是宝箱，试炼时按当前关卡星级产出、宝箱是按最高试炼星级产出）
  */
  generateItem(dOption) {
    const itemID = +dOption.itemID;
    let maxStarLv = dOption.maxStarLv;
    const minStarLv = dOption.minStarLv;

    if (maxStarLv > 20) {
      maxStarLv = 20;
    }
    const dData = {
      i: itemID,
      lv: dOption.lv || 1,
      m: [
        [],
      ],
    };
    const dItemConfig = mbgGame.config[`item${itemID}`];
    if (!dItemConfig) {
      this.logError("[generateItem] wrong itemID", itemID);
      return null;
    }
    if (dItemConfig.itemDays) {
      dData.t = moment().unix();
      dData.d = dItemConfig.itemDays * defines.DaySeconds;
    }
    if (dOption.quality) {
      dData.q = dOption.quality;
    } else { // 抽品质
      const dQualityWeight = mbgGame.config.constTable.QualityWeight;
      dData.q = parseInt(defines.chooseOne(dQualityWeight));
    }
    if (!dOption.starLv) {
      const starLvWeight = mbgGame.config.constTable.starLvWeight;
      const weightLv = parseInt(defines.chooseOne(starLvWeight));
      dOption.starLv = Math.max(1, maxStarLv - (4 - weightLv));
    }
    // this.logInfo("[generateItem] dOption.starLv", dOption.starLv, maxStarLv, weightLv);
    dData.s = dOption.starLv;
    if (minStarLv && dData.s < minStarLv) {
      dData.s = minStarLv;
    }
    const dItemAttrConfig = mbgGame.config.itemattr[dData.s];
    if (!dItemAttrConfig) {
      this.logError("[generateItem] wrong starLv", dData.s, dOption);
      return null;
    }
    if (dItemConfig.fixedAttrs) {
      // 固定读道具表，不需要存这个字段到数据库了
      dData.m[0] = [];
    } else {
      let subAttrID1 = null; // 副1
      let subAttrID2 = null;// 副2
      if (dData.q >= 2) {
        subAttrID1 = defines.SubAttrIDs[_.random(0, defines.SubAttrIDs.length - 1)];
        dData.m[1] = [
          subAttrID1,
          this.randSubAttrVal(dItemAttrConfig, subAttrID1),
        ];
      }
      if (dData.q >= 3) {
        const attrIDs = _.clone(defines.SubAttrIDs);
        attrIDs.splice(attrIDs.indexOf(subAttrID1), 1);
        subAttrID2 = attrIDs[_.random(0, attrIDs.length - 1)];
        dData.m[2] = [
          subAttrID2,
          this.randSubAttrVal(dItemAttrConfig, subAttrID2),
        ];
      }
    }
    if (dData.q >= 4) {
      // this.logInfo("mbgGame.config.enchantIDs", mbgGame.config.enchantIDs);
      dData.e = mbgGame.config.enchantIDs[
        _.random(0, mbgGame.config.enchantIDs.length - 1)];
    }
    return dData;
  }
  // 重新设置道具的品质（如果已有副属性会导致副属性重新随机）
  refreshItemQuality(dData, q) {
    dData.q = q;
    dData.m = [];
    const dItemAttrConfig = mbgGame.config.itemattr[dData.s];
    let subAttrID1 = null; // 副1
    let subAttrID2 = null;// 副2
    if (dData.q >= 2) {
      subAttrID1 = defines.SubAttrIDs[_.random(0, defines.SubAttrIDs.length - 1)];
      dData.m[1] = [
        subAttrID1,
        this.randSubAttrVal(dItemAttrConfig, subAttrID1),
      ];
    }
    if (dData.q >= 3) {
      const attrIDs = _.clone(defines.SubAttrIDs);
      attrIDs.splice(attrIDs.indexOf(subAttrID1), 1);
      subAttrID2 = attrIDs[_.random(0, attrIDs.length - 1)];
      dData.m[2] = [
        subAttrID2,
        this.randSubAttrVal(dItemAttrConfig, subAttrID2),
      ];
    }
    if (dData.q >= 4) {
      // this.logInfo("mbgGame.config.enchantIDs", mbgGame.config.enchantIDs);
      dData.e = mbgGame.config.enchantIDs[
        _.random(0, mbgGame.config.enchantIDs.length - 1)];
    }
  }
  randSubAttrVal(dItemAttrConfig, attrID) {
    const sAttr = defines.ID2Attr[attrID];
    const arr = dItemAttrConfig[sAttr];
    const [minVal, maxVal] = arr[0];
    const val = _.random(minVal, maxVal);
    return val;
  }
  getItemNum() {
    const dDBData = this.getItemDBData();
    let count = 0;
    for (const sid in dDBData) {
      count += 1;
    }
    return count;
  }
  // 分配num个新sid
  getNewItemSIDs(num) {
    const dDBData = this.getItemDBData();
    const sidList = [];
    let sid = 0;
    for (let i = 0; i < num; i++) {
      do {
        sid += 1;
      } while (dDBData[sid]);
      sidList.push(sid);
    }
    return sidList;
  }
  lockItem(sid) {
    const dData = this.getItemData(sid);
    if (dData.l) {
      return;
    }
    dData.l = 1;
    this.onSomeItemsChanged([sid]);
  }
  unlockItem(sid) {
    const dData = this.getItemData(sid);
    if (!dData.l) {
      return;
    }
    delete dData.l;
    this.onSomeItemsChanged([sid]);
  }
  lockGambledItem(sid, bForbidUpgrade) {
    const dData = this.getItemData(sid);
    if (dData.l) {
      return;
    }
    dData.l2 = 1;
    if (bForbidUpgrade) {
      dData.l3 = 1;
    }
    this.logInfo("[gamble] lockGambledItem sid:", sid, "data:", JSON.stringify(dData));
    this.onSomeItemsChanged([sid]);
  }
  unlockGambledItem(sid) {
    const dData = this.getItemData(sid);
    if (!dData.l2) {
      return;
    }
    delete dData.l2;
    delete dData.l3;
    this.logInfo("[gamble] unlockGambledItem sid:", sid, "data:", JSON.stringify(dData));
    this.onSomeItemsChanged([sid]);
  }
  isItemLocked(sid) {
    const dData = this.getItemData(sid);
    return dData.l || dData.l2; // 有l3必然有l2 所以不需要判断l2
  }
  // 这个函数不验证背包容量
  // 返回 sidList
  saveItemDatas(itemdatas) {
    const dDBData = this.getItemDBData();
    const num = itemdatas.length;
    const sidList = this.getNewItemSIDs(num);
    for (let i = 0; i < itemdatas.length; i++) {
      const sid = sidList[i];
      dDBData[sid] = itemdatas[i];
      this.updateStatItemCollect(sid);
    }
    return sidList;
  }
  getMaxStarLvByHero() {
    const avglv = this.pobj().getAvgLv();
    const dHeroup = mbgGame.config[`heroup${avglv}`];
    return dHeroup.maxStarLv;
  }
  hasItemByQ(q, excludeSid) {
    const dDBData = this.getItemDBData();
    for (const sid in dDBData) {
      const dItemData = dDBData[sid];
      if (excludeSid && +sid === excludeSid) {
        continue;
      }
      if (dItemData.q === q) {
        return true;
      }
    }
    return false;
  }
  /*
  增加1个或多个同种类型物品
  dOption = {
      itemID: 道具类型
      num: 数量，循环抽几次
      starLv: 固定星级
      maxStarLv: 最大星级
      lv: 初始等级 默认1
      quality: 固定品质
      type: 0 拿试炼的最大星级 1 拿人物等级的最大星级
      starAdd: 最大星级附加值
  }
  return {
    sidList: [], 能放进背包的道具 sid放进这个列表并返回
    dataList: [], 不能放进背包的道具 道具放进这个列表并返回
  }
  */
  addItem(dOption) {
    const itemID = dOption.itemID;
    let num = dOption.num || 1;
    num = Math.round(num);
    if (!(num > 0)) {
      return [];
    }
    if (!mbgGame.config[`item${itemID}`]) {
      return [];
    }
    if (!dOption.maxStarLv && !dOption.starLv) {

      /*
      0 试炼计算出的最大星级
      1 计算15个角色中最高等级的5个人的平均值，之后从 英雄升级表中取值
      但星级+N 后大于最高星级 取最高星级
      */
      if (dOption.type === 1 || dOption.type === 0) {
        dOption.maxStarLv = this.getMaxStarLvByHero();
        // this.logInfo("addItem avgLv", avglv, 'maxStarLv', dOption.maxStarLv);
      }
      if (!dOption.maxStarLv) {
        dOption.maxStarLv = this.getMaxStarLvByHero();
      }
      if (dOption.starAdd > 0) {
        dOption.maxStarLv += dOption.starAdd;
      }
    }
    const dDBData = this.getItemDBData();
    let dataList = null;
    let sidList = null;
    const sidListNew = this.getNewItemSIDs(num);
    let count = this.getItemNum();
    for (let i = 0; i < num; i++) {
      const dData = this.generateItem(dOption);
      dData.k = this.getNewItemK();
      // this.logInfo("generate item", itemID, dOption, JSON.stringify(dData));
      if (count >= mbgGame.config.constTable.ItemListLen) {
        dataList = dataList || [];
        dataList.push(dData);
      } else {
        sidList = sidList || [];
        const sid = sidListNew.shift();
        dDBData[sid] = dData;
        sidList.push(sid);
        this.updateStatItemCollect(sid);
        count += 1;
      }
    }
    return {
      sidList,
      dataList,
    };
  }
  // 检查调整所有物品的排序号
  // 只是用来控制排序号的大小，调整前后，顺序不变，所以不需要刷新的k给客户端
  checkAllItemK() {
    let itemK = 0;
    const dDBData = this.getItemDBData();
    let sidList = defines.getDictIntKeys(dDBData);
    sidList = _.sortBy(sidList, (sid) => { // 升序
      return dDBData[sid].k || 0;
    });
    let curK = null;
    for (let i = 0; i < sidList.length; i++) {
      const dItemData = dDBData[sidList[i]];
      if (dItemData.m && !dItemData.m[0]) {
        dItemData.m[0] = [];
      }
      if (!curK == null) {
        curK = dItemData.k || 0;
      } else if (curK !== dItemData.k) {
        curK = dItemData.k || 0;
        itemK += 1;
      }
      dItemData.k = itemK;
    }
    this.pobj().setValOnly("itemk", itemK);
  }
  // 彻底删掉物品
  realRemoveItem(sid, reason) {
    sid = +sid;
    const dDBData = this.getItemDBData();
    if (!dDBData[sid]) {
      return;
    }
    let needSave = true;
    if (reason === 'smelt' || reason === 'sell' || reason === 'sell2') {
      // 融合或出售， 只记录橙装
      if (dDBData[sid].q < 4) {
        needSave = false;
      }
    }
    delete dDBData[sid].k; // 因为物品的k值是动态的，所以不要保存到删除列表去
    const dataStr = JSON.stringify(dDBData[sid]);
    this.logInfo(`realRemoveItem sid=${sid},reason=${reason},data=${dataStr}`);
    delete dDBData[sid];
    // 检查各个方案
    for (let i = 0; i < defines.AllWorlds.length; i++) {
      const worldIdx = defines.AllWorlds[i];
      if (worldIdx === defines.newbieWorldIdx) {
        continue;
      }
      for (let schemeIdx = 0; schemeIdx <= this.pobj().getSchemeNum(); schemeIdx++) {
        const dScheme = this.pobj().m_WarCommon.getSchemeData(worldIdx, schemeIdx);
        if (!dScheme || !dScheme.bag) {
          continue;
        }
        for (let posIdx = 0; posIdx < 5; posIdx++) {
          const sidList = dScheme.bag[posIdx];
          if (_.isEmpty(sidList)) {
            continue;
          }
          const idx = sidList.indexOf(sid);
          if (idx !== -1) {
            sidList.splice(idx, 1);
            this.pobj().m_WarCommon.sendScheme(worldIdx, schemeIdx);
            break;
          }
        }
      }
    }
    this.pobj().m_WheelWar.onRemoveItem(sid);

    if (needSave) {
      const cSaveData = new NRemoveItemsList(this.pobj().getUUID());
      co(function* () {
        yield cSaveData.addRemoveItem({
          sid,
          reason,
          t: moment().unix(),
          data: dataStr,
        });
      }).catch((err) => {
        mbgGame.logError(`[realRemoveItem]`, err);
      });
    }
  }
  updateStatItemCollect(sid) {
    const itemID = this.getItemID(sid);
    this.pobj().m_Stat.tryAddToDiscoverList("item", itemID);
    // this.logInfo("tryAddToDiscoverList", ok, sid, itemID);
    const dData = this.getItemData(sid);
    this.pobj().m_Stat.addStatVal(`itemCounts${dData.q}`, 1);
  }
  hasItem(sid) {
    const dDBData = this.getItemDBData();
    return dDBData[sid] != null;
  }
  // validUseItem   的通用部分
  validToggleItem(sid) {
    if (!this.hasItem(sid)) {
      return mbgGame.config.ErrCode.Item_NotHasItem;
    }
    const dItemConfig = mbgGame.config[`item${this.getItemID(sid)}`];
    if (!dItemConfig) {
      return mbgGame.config.ErrCode.Item_NoThisItem;
    }
    return null;
  }
  // PVE、PVP都可以用
  validUseItem(sid, worldIdx, charaIdx, charaIDs, posIdx2sidList) {
    const err = this.validToggleItem(sid);
    if (err) return err;
    const dItemConfig = this.getItemConfig(sid);

    if (!(charaIdx >= 0 && charaIdx <= 4)) {
      return mbgGame.config.ErrCode.WrongParam;
    }
    for (let i = 0; i < 5; i++) {
      const sidList = posIdx2sidList && posIdx2sidList[i];
      if (sidList && sidList.indexOf(sid) !== -1) {
        return mbgGame.config.ErrCode.Item_AlreadyUsed;
      }
    }
    if (worldIdx === 99) {
      // 这个道具是否PVP可以用
      if (!dItemConfig.CanPVP) {
        return mbgGame.config.ErrCode.Item_CannotUseInPVP;
      }
    }
    if (worldIdx >= 1 && worldIdx <= 3) {
      if (dItemConfig.worldIdx > 0 && dItemConfig.worldIdx !== worldIdx) {
        return mbgGame.config.ErrCode.Item_CannotUse;
      }
    }
    return null;
  }
  getItemConfig(sid) {
    return mbgGame.config[`item${this.getItemID(sid)}`];
  }
  getRedeemPrice(matchType, sid) {
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    if (matchType === 3) {
      const lv = Math.min(this.getItemLv(sid), 19);
      return dItemAttrConfig.redeemPrice2[lv - 1];
    }
    return dItemAttrConfig.redeemPrice[this.getItemQ(sid) - 1];
  }
  getItemSmeltCostCoins(sid) {
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    const q = this.getItemQ(sid);
    return dItemAttrConfig.smeltCost[q - 1];
  }
  // 升级，消耗经验和道具lv有关
  getItemUpgradeCostExp(sid) {
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    const curLv = this.getItemLv(sid);
    return dItemAttrConfig.costExp[curLv - 1];
  }
  // 这个道具被熔炼，能得到多少经验
  getItemSmeltGainExp(sid, upgradingItemID) {
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    const q = this.getItemQ(sid);
    let exp = dItemAttrConfig.smeltExp[q - 1];// 基本经验
    const dConfig = this.getItemConfig(sid);
    if (dConfig.effect === "exp") {
      exp = Math.round(exp * this.getItemEffectVal(sid) * 0.01);
    }
    if (this.getItemID(sid) === upgradingItemID) {
      exp = Math.round(exp * 2);
    }
    exp += this.getItemExp(sid); // 当前经验
    exp += this.getItemAccumExp(sid);
    return exp;
  }
  getItemAccumExp(sid) {
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    const curLv = this.getItemLv(sid);
    let exp = 0;
    for (let lv = 1; lv < curLv; lv++) { // 等级换算成经验
      exp += dItemAttrConfig.costExp[lv - 1];
    }
    return Math.round(exp * mbgGame.config.constTable.ItemSmeltRatio * 0.01);
  }
  validUpgrade(sid) {
    if (!this.hasItem(sid)) {
      return mbgGame.config.ErrCode.Item_NotHasItem;
    }
    const dConfig = this.getItemConfig(sid);
    if (!dConfig) {
      return mbgGame.config.ErrCode.Item_NoThisItem;
    }
    if (dConfig.isVIPItem) {
      return mbgGame.config.ErrCode.Item_CannotUpgrade;
    }
    const dData = this.getItemData(sid);
    if (dData.l3) {
      return mbgGame.config.ErrCode.Item_CannotUpgrade;
    }
    const maxLv = defines.getItemMaxLv(dData.q);
    if (dData.lv >= maxLv) {
      return mbgGame.config.ErrCode.MaxLv;
    }
    return null;
  }
  // 吃掉sidList道具，升不升级要看经验进度条
  smeltItem(sid, sidList) {
    const err = this.validUpgrade(sid);
    if (err) {
      return err;
    }
    if (_.isEmpty(sidList)) {
      return mbgGame.config.ErrCode.Item_SmeltEmptyList;
    }
    for (let i = 0; i < sidList.length; i++) {
      const _sid = sidList[i];
      if (_sid === sid) {
        return mbgGame.config.ErrCode.Error;
      }
      if (!this.hasItem(_sid)) {
        return mbgGame.config.ErrCode.Item_SmeltNoItem;
      }
      if (this.isItemLocked(_sid)) {
        return mbgGame.config.ErrCode.Item_SmeltItemLocked;
      }
    }
    const itemID = this.getItemID(sid);
    // 1.吃道具
    // 服务端不考虑吃过多道具的浪费问题，客户端处理即可
    // 算总共可获得多少道具
    let expTotal = 0;
    let costCoinsTtal = 0;
    for (let i = 0; i < sidList.length; i++) {
      const _sid = sidList[i];
      expTotal += this.getItemSmeltGainExp(_sid, itemID);
      costCoinsTtal += this.getItemSmeltCostCoins(_sid);
    }
    const pobj = this.pobj();
    if (!costCoinsTtal || costCoinsTtal < 0 || !pobj.hasCoins(costCoinsTtal)) {
      return mbgGame.config.ErrCode.LackCoin;
    }
    // 扣钱
    this.pobj().addCoins(-costCoinsTtal, "smelt");
    // 删道具
    for (let i = 0; i < sidList.length; i++) {
      const _sid = sidList[i];
      this.realRemoveItem(_sid, 'smelt');
    }
    // 加经验
    this.addItemExp(sid, expTotal);
    this.onItemsDel(sidList);
    // 2.检查是否可以升级
    this.checkItemUpgrade(sid);
    this.onSomeItemsChanged([sid]);
    return null;
  }
  checkItemUpgrade(sid) {
    while (this.getItemExp(sid) >= this.getItemUpgradeCostExp(sid)) {
      const err = this.upgradeItem(sid);
      if (err) {
        break;
      }
    }
  }
  // 加道具等级
  upgradeItem(sid, free) {
    const err = this.validUpgrade(sid);
    if (err) {
      return err;
    }
    const curExp = this.getItemExp(sid);
    const costExp = this.getItemUpgradeCostExp(sid);
    if (!free && curExp < costExp) {
      return mbgGame.config.ErrCode.LackExp;
    }
    // 扣除经验
    if (!free) this.addItemExp(sid, -costExp);
    const dData = this.getItemData(sid);
    let curLv = dData.lv;
    curLv += 1;
    dData.lv = curLv;
    const maxLv = defines.getItemMaxLv(dData.q);
    this.pobj().m_Stat.addStatVal("itemAddLv", 1);
    if (curLv === maxLv) {
      this.pobj().m_Stat.addStatVal("maxlvitems", 1);
    }
    return null;
  }
  getItemAttrConfig(sid) {
    const dData = this.getItemData(sid);
    const dItemAttrConfig = mbgGame.config.itemattr[dData.s];
    return dItemAttrConfig;
  }
  getItemLv(sid) {
    const dData = this.getItemData(sid);
    if (!dData) return 0;
    return dData.lv;
  }
  getItemStarLv(sid) {
    const dData = this.getItemData(sid);
    if (!dData) return 0;
    return dData.s || 0;
  }
  getItemQ(sid) {
    const dData = this.getItemData(sid);
    if (!dData) return 0;
    return dData.q || 0;
  }
  getItemExp(sid) {
    const dData = this.getItemData(sid);
    if (!dData) return 0;
    return dData.ep || 0;
  }
  addItemExp(sid, exp) {
    const dData = this.getItemData(sid);
    if (!dData) return;
    let curExp = dData.ep || 0;
    curExp += exp;
    dData.ep = curExp;
  }
  getSellPrice(sid, ratio) {
    const dData = this.getItemData(sid);
    const dItemAttrConfig = this.getItemAttrConfig(sid);
    let coins = dItemAttrConfig.sellprice[dData.q - 1];// 品质决定基础价
    coins += this.getItemAccumExp(sid) *
      (ratio || mbgGame.config.constTable.ItemSellPriceRatio) * 0.01;
    coins = Math.round(coins);
    return coins;
  }
  validSell(sid) {
    if (!this.hasItem(sid)) {
      return false;
    }
    if (this.isItemLocked(sid)) {
      return false;
    }
    // vip道具不能卖
    if (this.getItemConfig(sid).isVIPItem) {
      return false;
    }
    return true;
  }
  sellItem(sid, dOption) {
    if (!this.validSell(sid)) {
      return false;
    }
    /*
    道具出售  在背包界面加入出售按钮
    出售价钱根据星级跟品质以及等级决定
    在道具属性表中的出售价格为基础价  加上升级时消耗的总金币的n%
    */
    const coins = this.getSellPrice(sid);
    this.realRemoveItem(sid, 'sell');
    this.onItemsDel([sid]);
    const dAward = {};
    dAward.coins = coins;
    this.pobj().giveAward(dAward, 'sellitem');
    if (dOption) dOption.coins = dAward.coins;
    return true;
  }
  sellItems(sidList, dOption) {
    if (_.isEmpty(sidList)) {
      return false;
    }
    const dAward = { coins: 0 };
    const itemSellGem = mbgGame.config.constTable.itemSellGem;
    dAward.gem = 0;
    const removedSidList = [];
    for (let i = 0; i < sidList.length; i++) {
      const sid = sidList[i];
      if (!this.validSell(sid)) {
        continue;
      }
      const coins = this.getSellPrice(sid);
      const q = this.getItemQ(sid);
      this.realRemoveItem(sid, 'sell2');
      removedSidList.push(sid);
      dAward.coins += coins;
      dAward.gem += itemSellGem[q];
    }
    this.pobj().giveAward(dAward, 'sellitems');
    this.onItemsDel(removedSidList);
    if (dOption) dOption.coins = dAward.coins;
    return true;
  }
  // key = eIdx / sEffect
  // eIdx 是这个效果在该道具所有效果中的序号
  // sEffect 是效果名
  getItemEffectVal(sid) {
    const dData = this.getItemData(sid);
    if (!dData) return 0;
    return defines.getItemEffectVal(dData.i, dData.lv);
  }
  getCanDropItemIDs() {
    // 1. 直接是宝箱可掉的道具
    const itemIDs_1 = mbgGame.config.ChestCanDropItemIDs;
    // 2. 宝箱不能直接掉，但是试炼等级足够时可以掉的道具
    const itemIDs_2 = this.pobj().m_RaidCtrl.getAllRaidCanDropItemIDs();
    // 3. 专属道具，对应角色解锁了就可以掉
    let itemIDs_3 = [];
    if (this.pobj().isHeroWarUnlocked()) {
      itemIDs_3 = _.filter(mbgGame.config.charaItemIDs, (itemID) => {
        const charaID = mbgGame.config[`item${itemID}`].c;
        return this.pobj().hasChara(charaID);
      });
    }
    return Array.from(new Set([...itemIDs_1, ...itemIDs_2, ...itemIDs_3]));
  }

  /*
  // 给定道具种类数，返回一个权重表
  2018-1-16
  道具宝箱掉落权重修改 chestweight  {0:0,1:1}
  0为商场、天才争霸的宝箱掉落权重
  1为其他的宝箱掉落权重(包括时空乱斗、天才争霸每一场的概率掉落)
  (可以这样理解，会掉经验道具的是1，否则是0)
  */
  getRewardItemWeightDict(type, itemTypeNum) {
    let itemIDs = this.getCanDropItemIDs();
    if (itemTypeNum > 0) {
      itemIDs = _.shuffle(itemIDs);
      itemIDs = itemIDs.slice(0, itemTypeNum);
    }
    const dWeight = {};
    for (let k = 0, len2 = itemIDs.length; k < len2; k++) {
      const itemID = itemIDs[k];
      const dConfig = mbgGame.config[`item${itemID}`];
      if (!dConfig) {
        this.logError("no item config", itemID);
      }
      dWeight[itemID] = dConfig.chestweight[type || 0];
    }
    return dWeight;
  }
  shopBuy(shopItemID, isRMB) {
    // 获取商品配置
    if (!mbgGame.config.shopConfig) return false;
    const itemConfig = mbgGame.config.shopConfig[shopItemID];
    if (!itemConfig) return false; // 非法数据

    const pobj = this.pobj();
    const nPlayer = pobj.dataObj();
    const netCtrl = nPlayer.getNetCtrl();
    if (itemConfig.channel_id && itemConfig.channel_id.indexOf(netCtrl.channel_id) === -1) {
      // 如果有channel_id需要过滤
      return false;
    }
    if (itemConfig.invalid) return false;

    // 验证购买条件
    let canBuy = true;
    let errStr = "";
    let canGetPeriod = false;

    if (+itemConfig.limit > 0) { // 周期限购商品
      const buyCount = nPlayer.getTimeVar(`shoplimit_${shopItemID}`) || 0;
      if (buyCount >= +itemConfig.limit) {
        canBuy = false;
        errStr = netCtrl.getString("shop_buylimit");
      }

      if (itemConfig.act === 'period') {
        // 月卡类道具，检查是否属于已经购买状态
        if (buyCount) {
          // 表示已经购买， 转为领取模式
          if (nPlayer.getTimeVar(`shopperiod_${shopItemID}`)) {
            // 非法请求，当天已经领取奖励了
            return false;
          }
          canGetPeriod = true;
        }
      }
    }

    // 非法访问
    if (itemConfig.unit === 'rmb' && !isRMB && !canGetPeriod) return false;

    const nowDate = moment({
      hour: 0,
      minute: 0,
      seconds: 0,
    }).unix();
    if (itemConfig.startDay) {
      const startDay = moment(itemConfig.startDay).unix();
      if (startDay > nowDate) {
        canBuy = false;
        errStr = netCtrl.getString("shop_cantbuy");
      }
    }

    if (itemConfig.endDay) {
      const endDay = moment(itemConfig.endDay).unix();
      if (nowDate > endDay) {
        canBuy = false;
        errStr = netCtrl.getString("shop_cantbuy");
      }
    }

    // 首充
    if (itemConfig.special === 'firstPay') {
      // 已领
      if (pobj.checkFirstPay()) {
        canBuy = false;
        errStr = netCtrl.getString("shop_cantbuy");
      }
      // 未有充值
      if (pobj.m_Stat.getStatVal('chargeGet') <= 0) {
        canBuy = false;
        errStr = netCtrl.getString("shop_firstPay");
      }
    }

    if (!canBuy && !canGetPeriod) {
      netCtrl.sendWarning(errStr);
      return false;
    }

    mbgGame.logger.info("[shop.buy]", shopItemID);
    let price = 0;
    let money = 0;
    let buyCount = nPlayer.getTimeVar(`shoplimit_${shopItemID}`);
    if (!buyCount || buyCount < 1) {
      buyCount = 0;
    }
    if (_.isArray(itemConfig.price)) {
      price = itemConfig.price[0] + (buyCount * itemConfig.price[1]);
    } else if (+itemConfig.price > 0) {
      price = +itemConfig.price;
    }
    if (itemConfig.special === 'chest1') {
      const avglv = pobj.getAvgLv();
      const dHeroup = mbgGame.config[`heroup${avglv}`];
      price = Math.round(dHeroup.coinsRate * price);
    }
    if (price > 0) {
      let noNeedCheckMoney;
      if (itemConfig.unit === "coins") {
        money = pobj.getCoins();
      } else if (itemConfig.unit === "diamonds") {
        money = pobj.getDiamonds();
      } else {
        // 不需要判断价钱
        noNeedCheckMoney = true;
      }
      if (!noNeedCheckMoney) {
        if (money < price) {
          netCtrl.sendWarning(netCtrl.getString("moneyNotEnough", {
            unit: netCtrl.getString((itemConfig.unit || "diamonds")),
          })); // 不够钱购买
          return false;
        }
        if (itemConfig.unit === "coins") {
          pobj.addCoins(-price, "shop");
        } else if (itemConfig.unit === "diamonds") { // 默认是钻石
          // 扣钻石
          pobj.addDiamonds(-price, null, `shop_${shopItemID}`);
        }
      }
    }

    if (+itemConfig.limit > 0) { // 限购商品
      buyCount += 1;
      if (itemConfig.refreshTime) {
        let endTime;
        const now = moment().unix();
        for (let i = 0; i < itemConfig.refreshTime.length; i++) {
          let t;
          const x = itemConfig.refreshTime[i];
          if (_.isNumber(x)) {
            t = moment({
              hour: x,
              minute: 0,
              seconds: 0,
            }).unix();
          } else if (_.isString(x)) {
            t = moment(x, ["HH:mm", "HH:mm:ss", "HH"]).unix();
          }
          if (!t) continue;
          // 如果当前时间都不符合，就选第二天的第一个时间点
          if (!endTime) {
            endTime = t + 86400;
          }
          if (now <= t) {
            endTime = t;
            break;
          }
          // console.log("refreshTime", endTime, t, x, moment(t * 1000).format());
        }
        if (!endTime) {
          endTime = now + 86400;
        }
        nPlayer.setTimeVar(`shoplimit_${shopItemID}`, buyCount, endTime - now);
      }
      if (itemConfig.days) {
        // 月卡类物品
        if (canGetPeriod) {
          nPlayer.setTodayVar(`shopperiod_${shopItemID}`, 1);
        } else {
          nPlayer.setTimeVar(`shoplimit_${shopItemID}`, buyCount, (moment({
            hour: 0,
            minute: 0,
            seconds: 0,
          }).unix() + (86400 * (+itemConfig.days || 1)) - moment().unix()));
        }
      }
    }

    let dAward = {};
    switch (itemConfig.act) {
      case "money":
        {
          // 根据队伍中最高等级的5个角色的平均值,从英雄升级表中获取金币基础产出 再乘以该系数
          const rate = itemConfig.price[2];
          const avglv = pobj.getAvgLv();
          const dHeroup = mbgGame.config[`heroup${avglv}`];
          dAward.coins = Math.round(dHeroup.coinsRate * rate);

          // 统计数据
          pobj.m_Stat.addStatVal(`shop_${shopItemID}`, 1);
          pobj.m_Stat.addStatVal('shop_coins', 1);
          break;
        }
      case "chest":
        {
          // this.logInfo("buy chest special", itemConfig.special, "shopItemID", shopItemID);
          dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[itemConfig.special]);
          // this.logInfo("buy chest dAward", dAward);
          dAward.id = shopItemID;
          dAward.chestType = mbgGame.config.constTable[`CWType_${itemConfig.special}`];
          if (itemConfig.special === 'chest2' || itemConfig.special === 'chest4') {
            dAward.minStarLv = 4;
          }
          // 统计数据
          pobj.m_Stat.addStatVal(`shop_${shopItemID}`, 1);
          pobj.m_Stat.addStatVal('shop_chest', 1);
          break;
        }
      case 'video':
      case 'award':
      case 'awardShow':
        {
          // 给奖励
          dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[itemConfig.special]);
          break;
        }
      case 'iap':
        {
          dAward.diamonds = itemConfig.value;
          // 首次购买显示双倍
          const c = pobj.m_Stat.getStatVal(`shop_${shopItemID}`);
          if (!c) {
            dAward.diamonds *= 2;
          }
          pobj.m_Stat.addStatVal("chargeGet", itemConfig.value);
          pobj.m_Stat.addStatVal("rmblog", parseInt(itemConfig.price * 100));
          // 统计购买次数，用于判断第一次购买给双倍
          pobj.m_Stat.addStatVal(`shop_${shopItemID}`, 1);
          break;
        }
      case 'iapitem':
        {
          const data = nPlayer.getTimeVar(`shop_${shopItemID}`);
          if (data) {
            // 如果没有，那么就按规则随机一个
            dAward = {
              diamonds: data.diamonds,
            };
            const dOption = {};
            dOption.itemID = data.itemID;
            dOption.starLv = data.starLv;
            dOption.quality = 4;
            const dItemData = pobj.m_ItemBag.generateItem(dOption);
            dAward.itemdatas = [dItemData];
          }
          // 购买完就清除了
          nPlayer.delTimeVar(`shop_${shopItemID}`);
          break;
        }
      case 'period':
        {
          // 月卡类物品分为2种奖励，一种是第一次购买时的奖励，一种是每天领的奖励
          const awardKey = itemConfig.special.split(',');
          if (canGetPeriod) {
            // 每天领的
            if (awardKey[1]) {
              dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[awardKey[1]]);
              // 修正starLv
              let starLv = nPlayer.getTimeVar('shop_periodStarLv');
              if (!starLv) {
                starLv = pobj.m_ItemBag.getMaxStarLvByHero() + 1;
                if (starLv >= 20) starLv = 20;
                nPlayer.setTodayVar('shop_periodStarLv', starLv);
              }
              if (dAward.items) {
                let newItems = '';
                dAward.items.split(',').forEach((sItem) => {
                  const [itemID, count, q, noUse] = sItem.split('x');
                  if (newItems) newItems += ',';
                  newItems += `${itemID}x${count}x${q}x${starLv}`;
                });
                dAward.items = newItems;
              }
            }
          } else if (awardKey[0]) {
            pobj.m_Stat.addStatVal("buyperiod", 1);
            dAward = mbgGame.common.utils.deepClone(mbgGame.config.award[awardKey[0]]);
          }
          break;
        }
      default:
        break;
    }
    // 首充
    if (itemConfig.special === 'firstPay') {
      // 设置首充已领取
      pobj.setFirstPayGet();
    }
    pobj.giveAward(dAward, shopItemID);
    this.logInfo("[shopBuy] ok", shopItemID, dAward);
    if (isRMB) {
      pobj.sendCmd("shopRefresh", {
        itemInfo: this.getShopItemSendInfo(netCtrl, { id: shopItemID }),
      });
    }
    return true;
  }
  getShopItemSendInfo(netCtrl, dData) {
    const itemID = dData.id;
    const nPlayer = netCtrl.getCtrl();
    const pobj = nPlayer.getPlayerLogic();
    const itemInfo = {
      id: itemID,
    };

    const itemConfig = mbgGame.config.shopConfig[itemID];
    if (!itemConfig) return null;

    if (itemConfig.channel_id && itemConfig.channel_id.indexOf(netCtrl.channel_id) === -1) {
      // 如果有channel_id需要过滤
      return null;
    }
    if (itemConfig.invalid) return null;

    if (itemID) {
      itemInfo.name = netCtrl.getString(`shopname_${itemID}`);
    }

    if (itemConfig.category) {
      itemInfo.type = netCtrl.getString(itemConfig.category);
    } else {
      itemInfo.type = 'none';
    }
    if (itemConfig.act) {
      itemInfo.act = itemConfig.act;
    }
    if (itemConfig.price) {
      itemInfo.price = itemConfig.price;
    }
    if (itemConfig.value) {
      itemInfo.value = itemConfig.value;
    }
    if (itemConfig.image) {
      itemInfo.image = itemConfig.image;
    }
    if (itemConfig.flag) {
      itemInfo.flag = itemConfig.flag;
    }
    if (itemConfig.unit) {
      itemInfo.unit = itemConfig.unit;
    }

    if (itemConfig.limit) {
      itemInfo.limit = itemConfig.limit;
      itemInfo.count = 0;
      const countData = nPlayer.getTimeVarObj(`shoplimit_${itemID}`);
      if (countData) {
        itemInfo.count = countData.d;
        if (itemInfo.count >= itemConfig.limit) {
          // 需要显示倒计时
          itemInfo.outDate = countData.ot;
          itemInfo.cantBuy = 1;
        }
      }
      itemInfo.left = itemInfo.limit - itemInfo.count;

      if (_.isArray(itemConfig.price)) {
        itemInfo.price = itemConfig.price[0] + (itemInfo.count * itemConfig.price[1]);
      }

      if (itemConfig.act === 'period') {
        // 月卡类道具，检查是否属于已经购买状态
        if (countData) {
          // 表示已经购买
          // 判断当天是否可以领取
          const periodData = nPlayer.getTimeVarObj(`shopperiod_${itemID}`);
          if (periodData) {
            itemInfo.inPreiod = 2;
            itemInfo.pOutDate = periodData.ot;
          } else {
            itemInfo.inPreiod = 1;
          }
        }
      }
    }
    const nowDate = moment({
      hour: 0,
      minute: 0,
      seconds: 0,
    }).unix();
    if (itemConfig.startDay) {
      const startDay = moment(itemConfig.startDay, 'YYYY_MM_DD').unix();
      // console.log("startDay", startDay, nowDate, value.startDay);
      if (startDay > nowDate) {
        itemInfo.outDate = startDay;
        itemInfo.cantBuy = 1;
      }
    }

    if (itemConfig.endDay) {
      const endDay = moment(itemConfig.endDay, 'YYYY_MM_DD').unix();
      if (nowDate > endDay) {
        return null;
      }
    }

    if (itemConfig.special === 'chest1') {
      const avglv = pobj.getAvgLv();
      const dHeroup = mbgGame.config[`heroup${avglv}`];
      itemInfo.price = Math.round(dHeroup.coinsRate * itemInfo.price);
    }

    // 首充
    if (itemConfig.special === 'firstPay') {
      // 已领
      if (pobj.checkFirstPay()) return null;
    }

    switch (itemConfig.act) {
      case 'iap':
        {
          // 首次购买显示双倍
          const c = pobj.m_Stat.getStatVal(`shop_${itemID}`);
          if (!c) {
            if (!itemInfo.flag) {
              itemInfo.flag = 'double';
            } else {
              itemInfo.flag += ',double';
            }
          }
          break;
        }
      case 'money':
        {
          const rate = itemConfig.price[2];
          const avglv = pobj.getAvgLv();
          const dHeroup = mbgGame.config[`heroup${avglv}`];
          itemInfo.value = Math.round(dHeroup.coinsRate * rate);
          itemInfo.name = netCtrl.getString(`shopname_${itemID}`, {
            value: itemInfo.value,
            smartNum: pobj.smartNum(itemInfo.value),
          });
          break;
        }
      case 'awardShow':
        {
          itemInfo.award = mbgGame.common.utils.deepClone(mbgGame.config.award[itemConfig.special]);
          break;
        }
      case 'period':
        {
          // 月卡类物品分为2种奖励，一种是第一次购买时的奖励，一种是每天领的奖励
          const awardKey = itemConfig.special.split(',');
          itemInfo.awardDay = mbgGame.common.utils.deepClone(mbgGame.config.award[awardKey[1]]);
          itemInfo.awardMain = mbgGame.common.utils.deepClone(mbgGame.config.award[awardKey[0]]);
          let starLv = nPlayer.getTimeVar('shop_periodStarLv');
          if (!starLv) {
            starLv = pobj.m_ItemBag.getMaxStarLvByHero() + 1;
            if (starLv >= 20) starLv = 20;
            nPlayer.setTodayVar('shop_periodStarLv', starLv);
          }
          itemInfo.starLv = starLv;
          break;
        }
      case 'iapitem':
        {
          // 分3个档位
          let data = nPlayer.getTimeVar(`shop_${itemID}`);
          if (!data) {
            // 刷出来的规则
            if (pobj.m_Lab.getLv() < 4) return null;
            const p1 = dData.p1 || 80;
            if (_.random(100) < p1) return null; // 每次刷都判断20%几率

            // 如果没有，那么就按规则随机一个
            const stall = _.random(itemConfig.special.award.length - 1);
            const t = itemConfig.special.time[stall];
            data = {
              outDate: moment().unix() + t,
            };
            const award = mbgGame.common.utils.deepClone(mbgGame.config.award[itemConfig.special.award[stall]]);
            data.starLv = pobj.m_ItemBag.getMaxStarLvByHero() + 1;
            if (data.starLv >= 20) data.starLv = 20;
            data.diamonds = award.diamonds;
            data.stall = stall;
            data.itemID = _.sample(award.items);
            nPlayer.setTimeVar(`shop_${itemID}`, data, t);
          }
          itemInfo.desc = netCtrl.getString(`shoptitle_${itemID}`, {
            discount: itemConfig.special.discount[data.stall],
          });
          itemInfo.iapItemData = data;
          break;
        }
      default:
        break;
    }
    if (!itemInfo.desc && mbgGame.i18n[`shoptitle_${itemID}`]) {
      itemInfo.desc = netCtrl.getString(`shoptitle_${itemID}`, itemInfo);
    }

    if (!itemInfo.info && mbgGame.i18n[`shopinfo_${itemID}`]) {
      itemInfo.info = netCtrl.getString(`shopinfo_${itemID}`, itemInfo);
    }

    if (itemInfo.outDate) {
      if (mbgGame.i18n[`push_${itemID}`]) {
        itemInfo.push = netCtrl.getString(`push_${itemID}`, itemInfo);
      }
    }

    return itemInfo;
  }
}

module.exports = CItemBag;