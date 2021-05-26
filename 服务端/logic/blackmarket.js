const defines = require('./w_defines');
const CBase = require('./base');

/*
黑市数据
bm = {
    d: {  可买进物品
        idx: itemdata
    }
    n: { 记录这个idx的物品被买了多少次
      idx: num
    }
}
*/
class CBlackMarket extends CBase {
  getMarketData() {
    const nPlayer = this.pobj().dataObj();
    if (!(this.pobj().isClanUnlocked() && nPlayer.getClanUUID())) {
      return null;
    }
    const dDBData = nPlayer.getTimeVar("bm");
    if (!dDBData) {
      // 刷新商品数据
      const dMarketData = this.refreshMarket();
      nPlayer.setTodayVar("bm", {
        d: dMarketData,
        n: {},
      });
      return dMarketData;
    }
    return dDBData.d;
  }
  getBuyCount(idx) {
    const nPlayer = this.pobj().dataObj();
    const dDBData = nPlayer.getTimeVar("bm");
    if (!dDBData) {
      return 999;
    }
    return dDBData.n[idx] || 0;
  }
  addBuyCount(idx) {
    const nPlayer = this.pobj().dataObj();
    const dDBData = nPlayer.getTimeVar("bm");
    if (!dDBData) {
      return false;
    }
    const dItem = dDBData.d[idx];
    if (!dItem) {
      return false;
    }
    dDBData.n[idx] = (dDBData.n[idx] || 0) + 1;
    const dMarketConfig = mbgGame.config.blackmarket[dItem.q];
    if (dDBData.n[idx] >= dMarketConfig.n) {
      if (dDBData.d[idx]) {
        delete dDBData.d[idx];
        return true;
      }
    }
    return false;
  }
  getConfig() {
    return mbgGame.config.blackmarket;
  }
  onInit() {
    this.getMarketData();
  }
  refreshMarket() {
    const pobj = this.pobj();
    const dMarketData = {};
    const dWeightForBase = pobj.m_ItemBag.getRewardItemWeightDict(mbgGame.config.constTable.CWType2);
    const itemIDs = [];
    for (let i = 0; i < 10000; i++) {
      let itemID = defines.chooseOne(dWeightForBase);
      itemID = +itemID;
      if (itemIDs.indexOf(itemID) === -1) {
        itemIDs.push(itemID);
        if (itemIDs.length === 6) {
          break;
        }
      }
    }
    const dWeight = mbgGame.config.BuyWeightDict;
    // this.logInfo("dWeightForBase", dWeightForBase);
    // this.logInfo("dWeight", dWeight);
    // this.logInfo("itemIDs", itemIDs);
    for (let i = 0; i < 6 && i < itemIDs.length; i++) {
      const q = defines.chooseOne(dWeight);
      dMarketData[i] = {
        i: itemIDs[i],
        q: +q,
        lv: 1,
      };
    }
    // this.logInfo("refreshMarket", dMarketData);
    return dMarketData;
  }
  getSellPrice(idx) {
    const dMarketData = this.getMarketData();
    const dItem = dMarketData[idx];
    if (!dItem) {
      return -1;
    }
    const dItemConfig = mbgGame.config[`item${dItem.i}`];
    if (!dItemConfig) {
      return -1;
    }
    const dMarketConfig = mbgGame.config.blackmarket[dItem.q];
    const starLv = this.pobj().m_ItemBag.getMaxStarLvByHero();
    const dItemAttrConfig = mbgGame.config.itemattr[starLv];
    const price = dMarketConfig.SellPrice * (1 + (dItemAttrConfig.clanK * 0.01));
    return Math.round(price);
  }
  validBuy(idx, price) {
    const dMarketData = this.getMarketData();
    if (!dMarketData) {
      return mbgGame.config.ErrCode.BlackMarket_NoBuyData;
    }
    const dItem = dMarketData[idx];
    if (!dItem) {
      return mbgGame.config.ErrCode.BlackMarket_NoItemData;
    }
    if (!price) {
      price = this.getSellPrice(idx);
    }
    if (this.pobj().getAttr("gem") < price) {
      return mbgGame.config.ErrCode.BlackMarket_LackGem;
    }
    return null;
  }
  buyItem(idx) {
    const price = this.getSellPrice(idx);
    const err = this.validBuy(idx, price);
    if (err) {
      return err;
    }
    const dMarketData = this.getMarketData();
    const dItem = dMarketData[idx];
    const pobj = this.pobj();
    pobj.addGem(-price);
    const dOption = {};
    const starLv = this.pobj().m_ItemBag.getMaxStarLvByHero();
    dOption.itemID = dItem.i;
    dOption.starLv = starLv;
    dOption.quality = dItem.q;
    const dItemData = pobj.m_ItemBag.generateItem(dOption);
    const dataList = [dItemData];
    const dAward = {
      itemdatas: dataList,
    };
    pobj.giveAward(dAward);
    if (this.addBuyCount(idx)) {
      const nPlayer = this.pobj().dataObj();
      nPlayer.syncTimeVar('bm');
    }
    return null;
  }
  forceRefreshMarket() {
    const pobj = this.pobj();
    const nPlayer = pobj.dataObj();
    const times = nPlayer.getTimeVar('bmtimes') || 0;
    const needGem = Math.min(100, mbgGame.config.constTable.MarketRefreshCost + (10 * times));
    if (pobj.getAttr("gem") < needGem) {
      return mbgGame.config.ErrCode.BlackMarket_LackGem;
    }
    nPlayer.setTodayVar('bmtimes', times + 1);
    pobj.addGem(-needGem, 'market');
    nPlayer.delTimeVar("bm");
    this.getMarketData();
    return null;
  }
}

module.exports = CBlackMarket;