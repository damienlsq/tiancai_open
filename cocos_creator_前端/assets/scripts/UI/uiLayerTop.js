cc.Class({
  extends: cc.Component,

  properties: {
    notifyWin: cc.Node,
    // tooltip
    toolTipNode: cc.Node,
    tipsNode: cc.Node,
    textLabel: cc.RichText,
    clickLayer: cc.Node,
  },

  onLoad() {
    mbgGame.uiLayerTop = this;
    this.setUIDisable();
    this.toolTipNode.on('size-changed', this.fixedPos.bind(this));
    this._specialClick = true;
    emitter.on(this, 'hideTooltips', this.setUIDisable);
  },
  onDestroy() {
    emitter.off(this, 'hideTooltips');
  },
  showNotify() {
    this.clickLayer.active = true;
    this.notifyWin.active = true;
    this.toolTipNode.active = false;
  },
  showTooltips() {
    this.clickLayer.active = this._specialClick;
    this.notifyWin.active = false;
    this.toolTipNode.active = true;
  },
  setUIDisable() {
    this.clickLayer.active = false;
    this.notifyWin.active = false;
    this.toolTipNode.active = false;
  },
  clickBg() {
    this.setUIDisable();
  },

  setTooltipsContent(content, anchorNode, upMode) {
    if (this.tipsNode._tipContent) {
      this.tipsNode._tipContent.destroy();
    }
    this.tipsNode._tipContent = content;
    this.tipsNode.addChild(content);
    content.setPosition(0, 0);
    this.textLabel.node.active = false;
    this._specialClick = false;
    // 位置摆好了才显示
    this.toolTipNode.active = false;
    this._anchorNode = anchorNode;
    this._upMode = upMode;
    this.fixedPos();
  },

  // tooltip
  setTooltips(str, anchorNode, upMode) {
    if (this.tipsNode._tipContent) {
      this.tipsNode._tipContent.destroy();
      delete this.tipsNode._tipContent;
    }
    if (this.toolTipNode.active && str === this.textLabel.string) return;
    // 位置摆好了才显示
    this._specialClick = true;
    this.toolTipNode.active = false;
    this.textLabel.node.active = true;
    this.textLabel.string = str;
    // this.toolTipNode.stopAllActions();
    this._anchorNode = anchorNode;
    this._upMode = upMode;
    this.fixedPos();
  },
  fixedPos() {
    const parentNode = this._anchorNode;
    if (!parentNode || !parentNode.isValid) return;
    mbgGame.log('fixedPos');
    // 计算位置，获取父节点
    let y;
    if (this._upMode) {
      y = (parentNode.height * parentNode.anchorY) + this.toolTipNode.height + parentNode.y;
    } else {
      y = -(parentNode.height * parentNode.anchorY) + parentNode.y;
    }
    let x = parentNode.x;
    if (parentNode.anchorX === 0) {
      x = parentNode.x + (parentNode.width / 2);
    }
    if (parentNode.anchorX === 1) {
      x = parentNode.x - (parentNode.width / 2);
    }

    let worldPos = parentNode.parent.convertToWorldSpaceAR(cc.v2(x, y));
    worldPos = this.node.convertToNodeSpaceAR(worldPos);
    this.toolTipNode.setPosition(worldPos);

    /*
        this.toolTipNode.opacity = 255;
        this.toolTipNode.setScale(0, 0);
        this.toolTipNode.runAction(cc.scaleTo(0.2, 1, 1));
    */
    this.checkNodeOutWin(this.toolTipNode);

    this.showTooltips();
  },

  checkNodeOutWin(node) {
    let worldPos = node.parent.convertToWorldSpaceAR(node.getPosition());
    worldPos = this.node.convertToNodeSpaceAR(worldPos);
    const leftX = worldPos.x - (node.width * node.anchorX);
    const rightX = worldPos.x + (node.width * node.anchorX);
    if (leftX <= -320) {
      node.x = -320 + (node.width * node.anchorX) + 12;
    } else if (rightX >= 320) {
      node.x = 320 - (node.width * node.anchorX) - 12;
    }
  },

  // 新的通知界面
  // 把通知内容push到队列，玩家点完一个就再出下一个
  pushNotify(msg) {
    this.m_NotifyData = this.m_NotifyData || [];
    this.m_NotifyData.push({
      content: msg,
    });
  },
  setPreventNotify(t) {
    this.m_preventNotify = true;
    this.setUIDisable();
    this.unschedule(this.resumeNotify);
    this.scheduleOnce(this.resumeNotify, t);
  },
  resumeNotify() {
    if (this.m_preventNotify) {
      delete this.m_preventNotify;
    }
    this.checkNotifyList();
  },
  // 检查通知队列
  checkNotifyList() {
    if (_.isEmpty(this.m_NotifyData) || this.m_preventNotify) {
      this.setUIDisable();
      return;
    }

    this.showNotify();
    const dData = this.m_NotifyData.shift();
    const com = this.notifyWin.getComponent('winNotify');
    com.onOpened(dData);
  },
});
