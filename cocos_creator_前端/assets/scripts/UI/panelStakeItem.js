cc.Class({
  extends: cc.Component,
  properties: {
    lvLabel: cc.RichText,
    nameLabel: cc.RichText,
    worldLabel: cc.RichText,
    tableViewNode: cc.Node,
    tipsLabel: cc.RichText,
    itemPanelPos: cc.Node,
    attrContent: cc.Node,

    filterBtnNode: cc.Node,
  },
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_tcgamble');
    mbgGame.managerUi.initItemFilter(this.filterBtnNode, this.filterItemList.bind(this), true);
  },
  onAddBaseWin(type, result) {
    this.m_MatchType = type;
    this.m_Result = result;
    this.tipsLabel.string = '';
    this.filterItemList();
    this.refreshTargetInfo();
  },
  filterItemList() {
    const sidList = mbgGame.player.getItemsCanGamble(this.m_MatchType);

    // sidList = _.without(sidList, this.m_sid);
    // mbgGame.log("filterItemList", sidList);
    const idList = _.chunk(sidList, 5);
    if (!this.m_sid) {
      // 默认选择第一个道具
      this.m_sid = sidList[0];
    }
    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    mbgGame.managerUi.initItemBagTableView(this.mbgViewCom, idList, {
      style: 'gamble',
      selectMode: [this.node, 'panelStakeItem', 'onSelectItem', (sid) => {
        return this.m_sid === sid;
      }],
    });
  },
  refreshTargetInfo() {
    if (this.m_sid) {
      if (!this.m_ItemPanelCom) {
        const itemPanel = mbgGame.managerUi.getIconItem();
        this.itemPanelPos.addChild(itemPanel);
        this.m_ItemPanelCom = itemPanel.getComponent("itemPanel");
      }
      this.m_ItemPanelCom.initMe({
        sid: this.m_sid || 0,
        style: 'preview',
      });
    } else if (this.m_ItemPanelCom) {
      this.m_ItemPanelCom.node.destroy();
      delete this.m_ItemPanelCom;
    }

    const curLv = mbgGame.player.getItemLv(this.m_sid);
    this.lvLabel.string = mbgGame.getOutlineStr(mbgGame.getString("levelShow", {
      level: curLv,
    }));
    this.nameLabel.string = mbgGame.player.getItemRichTextName(mbgGame.player.getItemID(this.m_sid), mbgGame.player.getItemQ(this.m_sid));
    this.worldLabel.string = mbgGame.player.getItemWorldFrom(this.m_sid);
    const redeemPrice = this.m_sid ? mbgGame.player.getItemRedeemPrice(this.m_sid) : 0;
    this.tipsLabel.string = mbgGame.getString('staketips',
      {
        s: mbgGame.getString('unitPrice', {
          unit: 'logo_diamonds',
          price: redeemPrice,
        }),
      });
    mbgGame.managerUi.showItemAttr({
      content: cc.find('base', this.attrContent),
      subContent: cc.find('extra', this.attrContent),
      effectDesc: cc.find('effect', this.attrContent),
      sid: this.m_sid,
    });
  },
  checkSelected(sid) {
    return this.m_sid === sid;
  },
  onSelectItem(event) {
    if (!event.target || !event.target.isValid) return;
    const itemPanel = event.target.getComponent('itemPanel');
    const sid = itemPanel.sid();

    itemPanel.addItemSprite('selected', {
      png: 'itemSelected',
    });
    this.m_sid = sid;
    this.refreshTargetInfo();
    emitter.emit('itemSelect', sid);
  },
  onConfirm() {
    mbgGame.netCtrl.sendMsg("gamble.makeStake", {
      type: this.m_MatchType,
      result: this.m_Result,
      sid: this.m_sid,
    }, this.onStakeResult.bind(this));
  },
  onStakeResult(data) {
    mbgGame.log("onMakeStake", data);
    if (data.code === "ok") {
      this.node && this.node._winBase.closeMe();
      emitter.emit('refreshGamble', true);
    } else {
      mbgGame.errMsg(data.err);
    }
  },
});