cc.Class({
  extends: cc.Component,
  properties: {
    tableViewNode: cc.Node,
    lvLabel: cc.RichText,
    nameLabel: cc.RichText,
    worldLabel: cc.RichText,
    itemPanelPos: cc.Node,
    maskNode: cc.Node,
    maskNode2: cc.Node,
    filterBtnNode: cc.Node,
    mainBtn: cc.Node,
    attrContent: cc.Node,
    tipsTemplate: cc.Node,
    btnSelectAll: cc.Node,
  },
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_smeltItem');
    this.node._winTooltips = mbgGame.getString('tooltips_smeltDesc');

    mbgGame._itemsSortCondition = 'starLvl';
    if (!this.m_ItemPanelCom) {
      const itemPanel = mbgGame.managerUi.getIconItem();
      this.itemPanelPos.addChild(itemPanel);
      this.m_ItemPanelCom = itemPanel.getComponent("itemPanel");
    }
    mbgGame.managerUi.initItemFilter(this.filterBtnNode, this.filterItemList.bind(this), true);
  },
  onDestroy() {
    this.m_winItemInfoCom = null;
    this.m_sidList = null;
  },
  onAddBaseWin(sid, winItemInfoCom) {
    this.m_sid = sid;
    this.m_sidList = [];
    this.m_winItemInfoCom = winItemInfoCom;
    this.m_ItemPanelCom.initMe({
      sid,
      style: 'preview',
    });
    this.refreshAll();
  },
  refreshAll() {
    this.filterItemList();
    this.refreshInfo();
  },
  filterItemList() {
    let sidList = mbgGame.player.getOwnedItemList_Belong();
    sidList = _.filter(sidList, (sid) => {
      if (sid === this.m_sid) return false;
      if (mbgGame.player.isItemCantDestroy(sid)) return false;
      return true;
    });
    sidList = sidList.reverse();
    const idList = _.chunk(sidList, 5);

    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    mbgGame.managerUi.initItemBagTableView(this.mbgViewCom, idList, {
      style: 'smelt',
      selectMode: [this.node, 'panelSmeltItem', 'onSelectItem', (sid) => {
        return this.m_sidList.indexOf(sid) !== -1;
      }],
    });
    this.refreshInfo();
    emitter.emit('hideTooltips');

    if (_.includes(mbgGame._itemsSortCondition, 'starList')) {
      // 显示全选
      this.btnSelectAll.active = true;
    } else {
      this.btnSelectAll.active = false;
    }
  },
  onSelectItem(event) {
    const itemNode = event.target;
    if (!itemNode || !itemNode.isValid) return;
    emitter.emit('hideTooltips');
    const itemPanel = itemNode.getComponent('itemPanel');
    const sid = itemPanel.sid();
    const selected = this.m_sidList.indexOf(sid) !== -1;
    if (!selected) {
      if (mbgGame.player.isItemLocked(sid)) {
        mbgGame.managerUi.floatMessage("锁定中，请先解锁");
        return;
      }
      if (!this.canSelect()) {
        mbgGame.managerUi.floatMessage(mbgGame.getString('maxlv'));
        return;
      }
      this.m_sidList.push(sid);
      const content = cc.instantiate(this.tipsTemplate);
      mbgGame.managerUi.showItemAttr({
        content: cc.find('base', content),
        subContent: cc.find('extra', content),
        effectDesc: cc.find('effect', content),
        sid,
      });
      let worldPos = itemNode.parent.convertToWorldSpaceAR(itemNode.getPosition());
      worldPos = this.node.convertToNodeSpaceAR(worldPos);
      mbgGame.uiLayerTop.setTooltipsContent(content, itemNode, worldPos.y < 0, this.mbgViewCom.content);
    } else {
      this.m_sidList = _.without(this.m_sidList, sid);
    }
    emitter.emit('itemSelect', this.m_sidList);
    this.refreshInfo();
  },
  onSelectAll() {
    if (_.includes(mbgGame._itemsSortCondition, 'starList')) {
      // 只选择该品质道具
      const sidList = mbgGame.player.getOwnedItemList_Belong();
      const starLv = +mbgGame._itemsSortCondition.substring('starList'.length);
      const newList = _.filter(sidList, (sid) => {
        const dData = mbgGame.player.getItemData(sid);
        if (!dData) {
          return false;
        }
        if (mbgGame.player.isItemCantDestroy(sid)) return false;
        return dData.s === starLv;
      });
      if (this.m_sidList.length < newList.length) {
        this.m_sidList = newList;
        this.btnSelectAll.getComponent('itemBtn').setSelectStatus(true);
      } else {
        // 取消全选
        this.m_sidList = [];
        this.btnSelectAll.getComponent('itemBtn').setSelectStatus(false);
      }
    }
    this.filterItemList();
  },
  closeTips() {
    emitter.emit('hideTooltips');
  },
  canSelect() {
    return !this.m_isMaxLv;
  },
  refreshInfo() {
    const sid = this.m_sid;
    const curLv = mbgGame.player.getItemLv(sid);
    this.lvLabel.string = mbgGame.getOutlineStr(mbgGame.getString("levelShow", {
      level: curLv,
    }));
    this.nameLabel.string = mbgGame.player.getItemRichTextName(mbgGame.player.getItemID(sid), mbgGame.player.getItemQ(sid));
    this.worldLabel.string = mbgGame.player.getItemWorldFrom(sid);
    this.m_isMaxLv = curLv >= mbgGame.player.getItemMaxLv(sid);
    this.maskNode._width = this.maskNode._width || this.maskNode.width;
    this.maskNode2._width = this.maskNode2._width || this.maskNode2.width;
    this.maskNode.width = this.maskNode._width *
      (mbgGame.player.getItemExp(sid) / mbgGame.player.getItemUpgradeCostExp(sid));
    if (_.isEmpty(this.m_sidList)) {
      this.mainBtn.getComponent('itemBtn').setStatus(false, mbgGame.getString('noneSmeltMaterial'));
      this.maskNode2.width = 1;
      this.mainBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('ok'));
      this.refreshAttr(sid, curLv);
      return;
    }
    if (this.m_isMaxLv) {
      this.mainBtn.getComponent('itemBtn').setStatus(false, '已达最大等级');
      return;
    }
    const itemID = mbgGame.player.getItemID(sid);
    let expTotal = 0;
    let costCoinsTtal = 0;
    for (let i = 0; i < this.m_sidList.length; i++) {
      const _sid = this.m_sidList[i];

      expTotal += mbgGame.player.getItemSmeltGainExp(_sid, itemID);
      costCoinsTtal += mbgGame.player.getItemSmeltCostCoins(_sid);
    }
    this.m_GainExp = expTotal;
    this.m_CostCoins = costCoinsTtal;
    this.mainBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('unitPrice', {
      price: mbgGame.smartNum(costCoinsTtal),
      unit: 'logo_coins',
    }));
    this.mainBtn.getComponent('itemBtn').setStatus(mbgGame.player.getCoins() >= costCoinsTtal,
      mbgGame.getString("moneyNotEnough", {
        unit: mbgGame.getString("coins"),
      }));
    let expNew = mbgGame.player.getItemExp(sid) + this.m_GainExp;
    const costExp = mbgGame.player.getItemUpgradeCostExp(sid);
    const p = expNew / costExp;
    this.maskNode2.width = this.maskNode2._width * Math.min(1, p);
    let lvAdd = 0;
    let lv = curLv;
    // mbgGame.log("1. expNew", expNew, "costExp", costExp);
    while (lv !== mbgGame.player.getItemMaxLv(sid) && expNew >= mbgGame.player.getItemUpgradeCostExp(sid, lv)) {
      const _costExp = mbgGame.player.getItemUpgradeCostExp(sid, lv);
      lvAdd += 1;
      lv += 1;
      expNew -= _costExp;
      // mbgGame.log("lv", lv, "lvAdd", lvAdd, "maxLv", mbgGame.player.getItemMaxLv(sid));
      // mbgGame.log("expNew", expNew, "_costExp", _costExp, "costExp", costExp);
      if (lv === mbgGame.player.getItemMaxLv(sid)) {
        this.maskNode2.width = this.maskNode2._width * 1;
      } else {
        const _costExpNext = mbgGame.player.getItemUpgradeCostExp(sid, lv);
        // mbgGame.log("expNew", expNew);
        // mbgGame.log("_costExpNext", _costExpNext);
        const _p = expNew / _costExpNext;
        mbgGame.log("_p", _p);
        this.maskNode2.width = this.maskNode2._width * Math.min(1, _p);
      }
      // mbgGame.log("2. expNew", expNew, "costExp", _costExp);
    }
    // mbgGame.log("3. expNew", expNew);
    this.m_isMaxLv = lv >= mbgGame.player.getItemMaxLv(sid);
    if (lvAdd > 0) {
      this.lvLabel.string = mbgGame.getOutlineStr(mbgGame.getString("levelShow", {
        level: `${curLv} <color=#00ff00>+${lvAdd} </color>`,
      }));
      this.maskNode.width = 1;
    }
    this.refreshAttr(sid, lv);
  },
  refreshAttr(sid, lv) {
    // mbgGame.log("showItemAttr", sid, lv);
    mbgGame.managerUi.showItemAttr({
      content: cc.find('base', this.attrContent),
      subContent: cc.find('extra', this.attrContent),
      effectDesc: cc.find('effect', this.attrContent),
      sid,
      nextLv: lv,
    });
  },
  doSendUpgrade() {
    const sid = this.m_sid;
    delete this.effectLock;
    mbgGame.netCtrl.sendMsg("bag.smelt", {
      data: {
        sid,
        sids: this.m_sidList,
      },
    }, (data) => {
      if (data.code !== "ok") {
        mbgGame.managerUi.floatMessage(data.err);
      } else {
        this.m_sidList = [];
        if (this.node && this.node.isValid) {
          this.refreshAll();
          emitter.emit('closeWinItemInfo');
        }
      }
    });
  },
  doUpgrade() {
    if (this.effectLock) return;
    // 先播放消失动画
    emitter.emit('itemEffect', this.m_sidList, 'disappear', false);
    this.m_ItemPanelCom.showEffect('upgrade', false);
    // 0.2秒后发消息到服务器
    this.scheduleOnce(this.doSendUpgrade, 0.4);
    this.effectLock = true;
  },

  onConfirm() {
    emitter.emit('hideTooltips');

    // 先查找一下，是否有贵重物品
    let hasQ4 = 0;
    let hasLv = 0;
    this.m_sidList.forEach((x) => {
      const itemData = mbgGame.player.getItemData(x);
      if (itemData.q >= 4) {
        // 有橙装
        hasQ4 += 1;
      }
      if (itemData.lv >= 2) {
        // 有橙装
        hasLv += 1;
      }
    });
    let info;
    if (hasQ4) {
      info = mbgGame.getString('itemSmeltConfirm2', {
        count: mbgGame.getString('highQ'),
      });
    } else if (hasLv) {
      info = mbgGame.getString('itemSmeltConfirm2', {
        count: mbgGame.getString('highLv'),
      });
    } else {
      info = mbgGame.getString('itemSmeltConfirm', {
        count: this.m_sidList.length,
      });
    }
    mbgGame.managerUi.createConfirmDialog(info,
      this.doUpgrade.bind(this));
  },
});