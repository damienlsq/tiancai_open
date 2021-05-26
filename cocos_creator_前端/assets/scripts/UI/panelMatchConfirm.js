cc.Class({
  extends: cc.Component,
  properties: {
    itemPanelPos1: cc.Node,
    itemPanelPos2: cc.Node,
    msgLabel: cc.RichText,
  },
  onLoad() {
    this.node._winTitle = '厉害了老铁!!';
  },
  onDestroy() {
    delete this.m_itemGamble;
  },
  getOrCreateItemPanel(idx) {
    if (!this.m_ItemPanelComs) {
      this.m_ItemPanelComs = {};
    }
    if (!this.m_ItemPanelComs[idx]) {
      const itemPanel = mbgGame.managerUi.getIconItem();
      const posNode = idx === 0 ? this.itemPanelPos1 : this.itemPanelPos2;
      posNode.addChild(itemPanel);
      this.m_ItemPanelComs[idx] = itemPanel.getComponent("itemPanel");
    }
    return this.m_ItemPanelComs[idx];
  },
  onAddBaseWin(itemGamble) {
    this.m_itemGamble = itemGamble;
    const gem = mbgGame.getString('unitPrice', {
      unit: 'logo_gem',
      price: mbgGame.config.constTable.GambleGem,
    });
    this.msgLabel.string = `额外奖励:${gem}`;
    const sid = itemGamble.m_MatchData.d.in.sid;
    let itemData = itemGamble.m_MatchData.d.out.item;
    const itemPanelIn = this.getOrCreateItemPanel(0);
    const itemPanelOut = this.getOrCreateItemPanel(1);
    if (itemGamble.m_MatchData.t === 3) {
      itemData = mbgGame.deepClone(mbgGame.player.getItemData(sid));
      itemPanelIn.initMe({
        sid,
        style: 'preview',
      });
      itemData.lv += 1;
      itemPanelOut.initMe({
        itemData,
        style: 'preview',
      });
    } else {
      itemPanelIn.initMe({
        sid,
        style: 'preview',
      });
      itemPanelOut.initMe({
        itemData,
        style: 'preview',
      });
    }
  },
  onConfirm() {
    this.m_itemGamble.onConfirmMatch();
    this.node._winBase.closeMe();
  },
  onShare() {
    const replayUUID = this.m_itemGamble.m_MatchData.u;
    mbgGame.player.doShareWar(replayUUID, 'matchShareWin');
  },
});