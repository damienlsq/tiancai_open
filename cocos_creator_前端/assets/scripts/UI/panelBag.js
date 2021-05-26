cc.Class({
  extends: cc.Component,
  properties: {
    filterBtnNode: cc.Node,
    btnSell: cc.Node,
    btnSelectAll: cc.Node,
    sellModeBg: cc.Node,
    sellLog: cc.Node,

    tableViewNode: cc.Node,
    capacity: cc.Node,

    btnCharacter: cc.Node,
    btnBag: cc.Node,
  },
  onLoad() {
    emitter.on(this, "delItems", this.refreshItemList);
    this.setSellMode();

    mbgGame.managerUi.initItemFilter(this.filterBtnNode, this.refreshItemList.bind(this), true);
  },
  onDestroy() {
    emitter.off(this, "delItems");
  },
  getBagSidList() {
    let sidList = mbgGame.player.getOwnedItemList_Belong();
    if (!sidList) {
      // 还没有收到物品信息数据
      return [];
    }
    if (this._sellItemsMode === 2) {
      sidList = _.filter(sidList, (sid) => {
        if (mbgGame.player.isItemCantDestroy(sid)) return false;
        return true;
      });
      sidList = sidList.reverse();
    }
    return sidList;
  },
  refreshItemList() {
    const sidList = this.getBagSidList();
    if (sidList.length < 1) return;
    const idList = _.chunk(sidList, 5);

    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    let options;
    if (this._sellItemsMode === 2) {
      this.mbgViewCom.cellHeight = 140;
      options = {
        style: 'bagSell',
        selectMode: [this.node, 'panelBag', 'onSelectItem', (sid) => {
          return this._sellList.indexOf(sid) !== -1;
        }],
      };
    } else {
      this.mbgViewCom.cellHeight = 110;
      options = {
        style: 'bag',
      };
    }
    mbgGame.managerUi.initItemBagTableView(this.mbgViewCom, idList, options);
    if (this.capacity) {
      mbgGame.setLabel(this.capacity, mbgGame.getString('capacity', {
        n: sidList.length,
        max: mbgGame.config.constTable.ItemListLen,
      }));
    }

    if (this._sellItemsMode === 2 && _.includes(mbgGame._itemsSortCondition, 'starList')) {
      // 显示全选
      this.btnSelectAll.active = true;
    } else {
      this.btnSelectAll.active = false;
    }

    this.btnSell.active = mbgGame.player.isSmeltItemUnlocked();
  },

  onSelectItem(event) {
    if (!event.target) return;
    const itemPanel = event.target.getComponent('itemPanel');
    if (!itemPanel) return;
    const sid = itemPanel.sid();
    if (this._sellItemsMode === 2) {
      // 出售模式
      if (mbgGame.player.getItemLock(sid)) {
        this.removeSellList(sid);
        return; // 不允许选择上锁道具
      }
      const flag = this.checkSelected(sid);
      if (flag) {
        // 移除
        this.removeSellList(sid);
      } else {
        // 添加
        this.addSellList(sid);
      }
      emitter.emit('itemSelect', this._sellList);
      this.itemOnSell();
    }
  },

  clickSellMode() {
    this.setSellMode();
    this.refreshItemList();
  },
  setSellMode() {
    this.clearSellList();
    if (!this._sellItemsMode) {
      // 第一次运行时，默认为关
      this.closeSellMode();
    } else if (this._sellItemsMode === 1) {
      this._sellItemsMode = 2; // 开启
      // 设置默认对出售排序为按星级
      this.sellModeBg.active = true;
      this.btnSell.getComponent('itemBtn').setBtnLabel(mbgGame.getString("cancel"));
      this.itemOnSell();

      this.btnCharacter.active = false;
      this.btnBag.active = false;
    } else {
      this.closeSellMode();
    }
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
      if (this._sellList.length < newList.length) {
        this._sellList = newList;
        this.btnSelectAll.getComponent('itemBtn').setSelectStatus(true);
      } else {
        this.btnSelectAll.getComponent('itemBtn').setSelectStatus(false);
        // 取消全选
        this.clearSellList();
      }
    }
    this.refreshItemList();
  },

  closeSellMode() {
    this.clearSellList();
    this._sellItemsMode = 1; // 关闭
    this.sellModeBg.active = false;
    this.btnSell.getComponent('itemBtn').setBtnLabel(mbgGame.getString("sell"));
    this.btnSelectAll.active = false;
    this.btnCharacter.active = true;
    this.btnBag.active = true;

    // 清空出售记录
    this.itemOnSell();
    this.refreshItemList();
  },
  itemOnSell() {
    const sellSIDList = this.getSellList();

    let price = 0;
    sellSIDList.forEach((x) => {
      if (!mbgGame.player.getItemData(x)) return;
      price += mbgGame.player.getItemSellPrice(x);
    });
    mbgGame.setLabel(this.sellLog, mbgGame.getString('sellLog', {
      count: sellSIDList.length,
      money: price,
    }));
  },

  doSellItems(sellSIDList) {
    mbgGame.player.doSellItems(sellSIDList);
    this.btnSelectAll.getComponent('itemBtn').setSelectStatus(false);
  },
  sellItems() {
    if (this._sellItemsMode !== 2) return;
    // 找出所有选择了的物品sid
    const sellSIDList = this.getSellList();
    if (!sellSIDList.length) return;
    let hasQ4 = 0;
    let hasLv = 0;
    sellSIDList.forEach((x) => {
      const itemData = mbgGame.player.getItemData(x);
      if (!itemData) return;
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
      info = mbgGame.getString('itemBathSellConfirm2', {
        count: mbgGame.getString('highQ'),
      });
    } else if (hasLv) {
      info = mbgGame.getString('itemBathSellConfirm2', {
        count: mbgGame.getString('highLv'),
      });
    } else {
      info = mbgGame.getString('itemBathSellConfirm', {
        count: sellSIDList.length,
      });
    }

    // mbgGame.log('sellItems:', sellSIDList);
    mbgGame.managerUi.createConfirmDialog(info,
      this.doSellItems.bind(this, sellSIDList));
  },

  clearSellList() {
    this._sellList = [];
  },
  addSellList(sid) {
    this._sellList.push(sid);
  },
  removeSellList(sid) {
    this._sellList = _.without(this._sellList, sid);
  },
  getSellList() {
    return this._sellList;
  },
  checkSelected(sid) {
    return this._sellList.indexOf(sid) !== -1;
  },
});
