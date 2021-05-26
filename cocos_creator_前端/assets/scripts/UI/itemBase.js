cc.Class({
  extends: cc.Component,

  properties: {
  },
  itemData() {
    return this.m_Option.itemData;
  },
  hasItem() {
    return mbgGame.player.hasItem(this.sid());
  },
  sid() {
    return this.m_Option && this.m_Option.sid;
  },
  itemID() {
    if (!this.m_Option) {
      return 0;
    }
    if (this.m_Option.itemID) {
      return this.m_Option.itemID;
    }
    if (this.sid() > 0) {
      return mbgGame.player.getItemID(this.sid());
    }
    if (this.itemData()) {
      return +this.itemData().i;
    }
    return 0;
  },
  itemQ() {
    let q;
    if (this.sid() > 0) {
      q = mbgGame.player.getItemQ(this.sid());
    }
    if (this.itemData()) {
      q = this.itemData().q;
    }
    if (this.m_Option.q) {
      q = this.m_Option.q;
    }
    return q || 1;
  },
  itemLv() {
    if (this.sid() > 0) {
      return mbgGame.player.getItemLv(this.sid());
    }
    if (this.itemData()) {
      return this.itemData().lv;
    }
    return 1;
  },
  itemStarLv() {
    if (this.sid() > 0) {
      return mbgGame.player.getItemStarLv(this.sid());
    }
    if (this.itemData()) {
      return this.itemData().s;
    }
    if (this.m_Option.s) {
      return this.m_Option.s;
    }
    return 0;
  },
  initItemBase(dOption) {
    this.m_Option = dOption;
    if (dOption.sid) {
      delete this.m_Option.itemData;
    }
  },
});
