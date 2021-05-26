cc.Class({
  extends: cc.Component,
  properties: {
    msgLabel: cc.RichText,
  },
  onLoad() {
  },
  onDestroy() {
    delete this.m_itemGamble;
  },
  onAddBaseWin(itemGamble) {
    this.m_itemGamble = itemGamble;
    const sid = itemGamble.m_MatchData.d.in.sid;
    const redeemPrice = mbgGame.player.getItemRedeemPrice(sid);
    const price = mbgGame.getString('unitPrice', {
      unit: 'logo_diamonds',
      price: redeemPrice,
    });
    let coins = mbgGame.player.getItemSellPrice(sid, mbgGame.config.constTable.ItemGamblePriceRatio);
    coins = mbgGame.getString('unitPrice', {
      unit: 'logo_coins',
      price: coins,
    });
    const itemname = mbgGame.player.getItemRichNameBySid(sid);
    this.msgLabel.string = `是否消耗${price}赎回${itemname}？\n若放弃赎回，将返还${coins}`;
  },
  onConfirm() {
    this.m_itemGamble.onConfirmMatch(false);
    this.node._winBase.closeMe();
  },
  onRedeem() {
    this.m_itemGamble.onConfirmMatch(true, (data) => {
      if (data.code === "ok") {
        this.node._winBase.closeMe();
      } else {
        mbgGame.errMsg(data.err);
      }
    });
  },
  onShare() {
    const replayUUID = this.m_itemGamble.m_MatchData.u;
    mbgGame.player.doShareWar(replayUUID, 'matchShareLose');
  },
});