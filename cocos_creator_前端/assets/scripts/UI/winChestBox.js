cc.Class({
  extends: cc.Component,

  properties: {
    itemName: cc.Label,
    icon: cc.Sprite,
    desc: cc.RichText,
    btnLeft: cc.Node,
    btnRight: cc.Node,
  },
  onLoad() {
    mbgGame.winChestBox = this;
  },
  onDestroy() {
    delete mbgGame.winChestBox;
  },
  onAddBaseWin(data, cb, cancelCb) {
    this.refreshChestBox(data, cb, cancelCb);
  },
  refreshChestBox(data, cb, cancelCb) {
    if (cb) this.m_ConfirmCB = cb;
    if (cancelCb) this.m_CancelCB = cancelCb;
    this.itemName.string = data.name;
    mbgGame.resManager.setImageFrame(this.icon, 'images', data.image);
    this.desc.string = data.desc || '';
    if (data.leftBtn) {
      this.btnLeft.getComponent('itemBtn').setBtnLabel(data.leftBtn);
    }
    if (data.rightBtn) {
      if (data.needDiamonds) {
        this.btnRight.getComponent('itemBtn').setBtnLabel(`${data.rightBtn}<br />${mbgGame.getString('unitPrice', {
          unit: 'logo_diamonds',
          price: data.needDiamonds,
        })}`);
      } else {
        this.btnRight.getComponent('itemBtn').setBtnLabel(data.rightBtn);
      }
    }
    if (data.rightBtnDisabled) {
      this.btnRight.getComponent('itemBtn').setStatus(false);
    }
    if (data.leftBtnDisabled) {
      this.btnLeft.getComponent('itemBtn').setStatus(false, data.leftBtnDisabled);
    }
  },
  onCancel() {
    emitter.emit('closeMe');
    const cb = this.m_CancelCB;
    if (cb) {
      delete this.m_CancelCB;
      cb();
    }
  },
  onConfirm(dontClose) {
    if (!dontClose) emitter.emit('closeMe');
    const cb = this.m_ConfirmCB;
    if (cb) {
      delete this.m_ConfirmCB;
      cb();
    }
  },
});