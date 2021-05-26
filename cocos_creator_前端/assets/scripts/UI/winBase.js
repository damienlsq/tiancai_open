const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    titleNode: cc.Node,
    content: cc.Node,
    winFrame: cc.Node,
    btnClose: cc.Node,
    toolTips: cc.Node,
    maskBg: cc.Node,
  },
  onLoad() {
    mbgGame.setLabel(this.titleNode, '');
    if (this.winFrame) {
      this.winFrame.x = 700;
      this.winFrame.on('size-changed', this.changeSize, this);
      if (this.btnClose) {
        this.btnClose.active = false;
      }
    }
    const childCount = this.node.parent.children.length;
    if (childCount <= 1) {
      const maskBg = this.node.getChildByName('maskBg');
      if (maskBg) {
        maskBg.opacity = 0;
        maskBg.runAction(cc.fadeIn(0.1));
      }
    }
    if (this.toolTips) {
      this.toolTips.active = false;
    }
    emitter.on(this, "closeMe", this.closeMe);
  },
  changeSize() {
    this.winFrame.x = 0;
    if (this.btnClose) {
      this.btnClose.y = (this.winFrame.height / 2) + (this.btnClose.height / 2) - 6;
      this.btnClose.active = true;
    }
  },
  initContent() {
    if (!this.contentNode) return;
    this.doAddChild(this.contentNode);
    delete this.contentNode;
  },
  update() {
    if (!this.isInited) {
      this.initContent();
      this.isInited = true;
    }
  },
  onDestroy() {
    emitter.off(this, "closeMe");
  },
  setDoAfterAddChild(cb) {
    this.m_doAfterAddChild = cb;
  },
  doAddChild(node) {
    mbgGame.performanceCheck(`[baseWin ${this._UINode._UIScriptName || 'none'}]`, 'content');
    this.content.addChild(node);
    if (node._winTitle) {
      mbgGame.setLabel(this.titleNode, node._winTitle);
    }
    if (this._UINode && this._UINode._UIScriptName) {
      // 先执行子窗口的closeMe
      const comp = this._UINode.getComponent(this._UINode._UIScriptName);
      if (comp && comp.onAddBaseWin) {
        // mbgGame.log('doAddChild:', this._onAddBaseWinArgs);
        const cb = comp.onAddBaseWin;
        try {
          const winArgs = this._onAddBaseWinArgs;
          if (winArgs != null) {
            delete this._onAddBaseWinArgs;
          }
          cb.apply(comp, winArgs);
        } catch (e) {
          mbgGame.error("[doAddChild] err:", e.stack);
        }
      }
    }
    if (this.toolTips && node._winTooltips) {
      this.toolTips.getComponent('autoTooltips').setTipsStr(node._winTooltips);
      this.toolTips.active = true;
    }
    mbgGame.performanceCheck(`[baseWin ${this._UINode._UIScriptName || 'none'}]`, 'upload');
  },
  initWin(node, ...args) {
    this._UINode = node;
    if (args) {
      // mbgGame.log('doAddChild:', this._onAddBaseWinArgs);
      this._onAddBaseWinArgs = args;
    }
    node._winBase = this;
    this.contentNode = node;
  },
  setTitle(str) {
    mbgGame.setLabel(this.titleNode, str);
    // this.node._winTitle = xxx 只适用于onLoad，如果其他地方改title，就需要用setTitle
  },
  setBg(bgName) {
    const sprite = this.content.getComponent(cc.Sprite);
    if (!bgName) {
      sprite.enabled = false;
      return;
    }
    sprite.enabled = true;
    mbgGame.resManager.setImageFrame(sprite, 'images', bgName);
  },
  avoidBgClose() {
    // 禁止点背景关闭窗口
    this._avoidBgClose = true;
    // if (this.btnClose) this.btnClose.active = false;
  },
  closeMe() {
    if (this._UINode && this._UINode._UIScriptName) {
      if (this._UINode.isValid) {
        // 先执行子窗口的closeMe
        const comp = this._UINode.getComponent(this._UINode._UIScriptName);
        if (comp && comp.closeMe) {
          comp.closeMe();
        }
        this._UINode._winBase = null;
      }
      delete this._UINode._UIScriptName;
      delete this._UINode;
    }
    if (!mbgGame.managerUi || !mbgGame.managerUi.uiLayerWin || !mbgGame.managerUi.uiLayerWin.isValid) {
      this.node.destroy();
      return;
    }
    const uiLayers = _.sortBy(_.filter(mbgGame.managerUi.uiLayerWin.children, (x) => {
      if (x === this.node) return false; // 排除自己
      return x._needMaskBg;
    }), ['zIndex']);
    for (let i = 0; i < uiLayers.length; i++) {
      const x = uiLayers[i];
      // 最后一个才显示遮罩
      const maskBg = x.getChildByName('maskBg');
      if (!maskBg) continue;
      const maskSprite = maskBg.getComponent(cc.Sprite);
      if (!maskSprite) continue;
      if (i !== uiLayers.length - 1) {
        maskSprite.enabled = false;
      } else {
        maskSprite.enabled = true;
      }
    }
    emitter.emit('hideTooltips');
    this.node.destroy();
  },
  bgCloseMe() {
    if (this._avoidBgClose) return;
    this.closeMe();
  },

  setToolTip() {

  },
});