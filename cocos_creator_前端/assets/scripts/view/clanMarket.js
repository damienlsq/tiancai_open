cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.Node,
    labelNum: cc.Label,
    labelTime: cc.RichText,
    bgTime: cc.Node,
  },
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_market');
    emitter.on(this, "updateAttr", this.refreshGem);
    emitter.on(this, "timeVarUpdate", this.refreshMarketInfo);

    // 保存模版
    this.marketItemTemplate = cc.instantiate(this.content.children[0]);
    this.content.removeAllChildren();

    this.refreshMarketInfo();
  },
  onDestroy() {
    emitter.off(this, "updateAttr");
    emitter.off(this, "timeVarUpdate");
  },
  getMarketData() {
    const dDayVar = mbgGame.timeVar.bm && mbgGame.timeVar.bm.d;
    return dDayVar && dDayVar.d;
  },
  getRefreshTimes() {
    return mbgGame.timeVar.bmtimes && mbgGame.timeVar.bmtimes.d;
  },
  refreshGem() {
    this.labelNum.string = `${mbgGame.player.getGem()}`;
  },
  forceRefresh() {
    mbgGame.managerUi.createConfirmDialog(mbgGame.getString("refreshmarket", {
      s: mbgGame.getString('unitPrice', {
        price: Math.min(100, mbgGame.config.constTable.MarketRefreshCost + (10 * (this.getRefreshTimes() || 0))),
        unit: 'logo_gem',
      }),
    }),
      () => {
        mbgGame.log("market.refresh");
        mbgGame.netCtrl.sendMsg("market.refresh", {}, (data) => {
          mbgGame.log("market.refresh", data.code, data.err);
          if (data.code === 'err') {
            mbgGame.errMsg(data.err);
          } else {
            // 刷新黑市商品
            emitter.emit("timeVarUpdate");
          }
        });
      });
  },
  getSellPrice(idx) {
    const dMarket = this.getMarketData();
    const dData = dMarket[idx];
    if (!dData) {
      mbgGame.error("no dData", idx, dMarket);
    }
    const dItemConfig = mbgGame.config[`item${dData.i}`];
    if (!dItemConfig) {
      return -1;
    }
    const dMarketConfig = mbgGame.config.blackmarket[dData.q];
    const starLv = mbgGame.player.getMaxStarLvByHero();
    const dItemAttrConfig = mbgGame.config.itemattr[starLv];
    const price = dMarketConfig.SellPrice * (1 + (dItemAttrConfig.clanK * 0.01));
    return Math.round(price);
  },
  refreshMarketInfo(data) {
    if (data && !data.bm) {
      return;
    }
    this.refreshGem();
    const marketData = this.getMarketData();
    mbgGame.log("refreshMarketInfo", marketData);
    this.bgTime.active = false;
    if (!marketData) {
      mbgGame.netCtrl.sendMsg("market.open");
      return;
    }
    this.bgTime.active = true;
    this.onRefreshTime();
    this.content.removeAllChildren();
    const idxlist = _.keys(marketData);
    for (let i = 0; i < idxlist.length; i++) {
      const idx = +idxlist[i];
      const dItemData = marketData[idx];
      this.addItem(idx, dItemData);
    }
  },
  onButtonClose() {
    emitter.emit('closeMe');
  },

  initMarketItem(marketNode, idx, dData) {
    if (!marketNode.itemPanel) {
      // 未初始化过的node
      const node = mbgGame.managerUi.getIconItem();
      marketNode.getChildByName('pos').addChild(node);
      node.setPosition(0, 0);
      marketNode.itemPanel = node.getComponent("itemPanel");
    }

    marketNode._idx = idx;
    marketNode.price = this.getSellPrice(idx);
    marketNode.itemData = dData;
    const starLv = mbgGame.player.getMaxStarLvByHero();
    dData.s = starLv;
    // mbgGame.log("itemData:", this.itemData);
    const itemID = dData.i;
    let rt = cc.find('price', marketNode).getComponent(cc.RichText);
    rt.string = mbgGame.getString('unitPrice', {
      unit: 'logo_gem',
      price: marketNode.price,
    });
    marketNode.itemPanel.initMe({
      itemData: dData,
    });
    rt = cc.find('itemName', marketNode).getComponent(cc.RichText);
    // rt.string = mbgGame.player.getItemRichTextName(itemID, dData.q);
    rt.string = mbgGame.getBoldStr(mbgGame.getColorStr(mbgGame.getString(`itemname${itemID}`), "#6a2807"));
  },
  onClick(event) {

    const marketNode = event.target;
    if (!marketNode.itemData) return;
    mbgGame.managerUi.openItemInfo({
      itemData: marketNode.itemData,
      style: 'unidentify',
      btnOutfitStr: `<img src="logo_gem" />${marketNode.price}`,
      equipCB: () => {
        this.buyItem(marketNode._idx);
      },
    });
  },

  addItem(idx, dItemData) {
    const marketItem = cc.instantiate(this.marketItemTemplate);
    this.content.addChild(marketItem);
    this.initMarketItem(marketItem, idx, dItemData);
  },
  onRefreshTime() {
    let nextDayTimeStamp = moment({
      hour: 4,
    }).unix();
    const now = moment().unix();
    if (nextDayTimeStamp < now) {
      nextDayTimeStamp += 86400;
    }
    const duration = nextDayTimeStamp - moment().unix();
    let timeCom = this.labelTime.node.getComponent('effectTimerString');
    if (!timeCom) {
      timeCom = this.labelTime.node.addComponent('effectTimerString');
    }
    timeCom.initMe({
      duration,
      interval: 1,
      endFunc: () => {
        this.refreshMarketInfo();
      },
    });
  },
  buyItem(idx) {
    const dMarket = this.getMarketData();
    const dData = dMarket[idx];
    if (!dData) {
      return;
    }
    emitter.emit('closeWinItemInfo');
    mbgGame.netCtrl.sendMsg("market.buy", {
      idx,
    }, (data) => {
      mbgGame.log("[market.buy]", data);
      if (data.code === "ok") {
        // 刷新黑市商品
        emitter.emit("timeVarUpdate");
        const itemname = mbgGame.getString(`itemname${dData.i}`);
        const msg = mbgGame.getString("marketBuyOK", {
          item: itemname,
          count: 1,
        });
        mbgGame.managerUi.floatMessage(msg);
      } else {
        mbgGame.managerUi.floatMessage(data.err);
      }
    });
  },
});