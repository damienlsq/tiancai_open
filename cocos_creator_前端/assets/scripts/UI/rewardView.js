cc.Class({
  extends: cc.Component,

  properties: {
    frame: cc.Node,
    sp: cc.Node,
  },

  showItem(dOption) {
    return mbgGame.managerUi.getAwardItem(this.frame, dOption);
  },

  parseItemList(data) {
    const itemList = [];
    [
      'diamonds',
      'gem',
      'mat',
      'sta',
      'coins',
      'score',
    ].forEach((x) => {
      if (!data[x]) return;
      itemList.push({
        icon: `award_${x}`,
        count: data[x],
      });
    });
    if (data.dataList) {
      for (let i = 0; i < data.dataList.length; i++) {
        const dItemData = data.dataList[i];
        let bonus = 0;
        if (data.bonusIdxes && data.bonusIdxes.indexOf(i) !== -1) {
          bonus = 1;
        }
        itemList.push({
          bonus,
          itemData: dItemData,
        });
      }
    }
    if (data.items) {
      data.items.split(',').forEach((sItem) => {
        const [itemID, n, q, starLv] = sItem.split('x');
        itemList.push({
          itemData: {
            i: +itemID,
            q: +q,
            s: +starLv,
            lv: 1,
          },
          style: 'unidentify',
        });
      });
    }
    return itemList;
    // mbgGame.log('itemlist', this.itemList);
  },

  onAddBaseWin(data) {
    if (!data) {
      return;
    }
    const itemList = this.parseItemList(data);
    for (let i = 0; i < itemList.length; i++) {
      this.showItem(itemList[i]);
    }
  },

  init(data) {
    // mbgGame.log('winGiftOpen', data);
    if (this.sp) {
      this.spCtrl = this.sp.getComponent('spineCtrl');
      this.spCtrl.setSkin(data.id || 'gift');
      this.spCtrl.doOnceAction('start', 'continue');
    }
    this.m_Idx = 0;
    this.itemList = this.parseItemList(data);
    this.isStart = true;
  },

  update(dt) {
    if (!this.itemList || !this.itemList.length) return;
    this.intervalTime = this.intervalTime || 0;
    this.intervalTime += dt;
    if (this.intervalTime < 0.15) return;
    const data = this.itemList.shift();
    this.intervalTime = 0;
    const nodeItem = this.showItem(data);
    const com = nodeItem.getComponent("itemPanel");
    if (data.bonus) {
      com.showEffect('bless', true);
    }
    nodeItem.angle = 0;
    nodeItem.opacity = 0;
    nodeItem.runAction(cc.rotateTo(0.2, 720).easing(cc.easeExponentialOut()));
    nodeItem.runAction(cc.fadeIn(0.2));
    this.m_Idx += 1;
    if (this.itemList.length < 1) delete this.itemList;
  },

  realClose() {
    if (!this.isStart) return;
    if (this.itemList) return;
    this.node.destroy();
  },
  onCloseMe() {
    this.node._winBase.closeMe();
  },
});
