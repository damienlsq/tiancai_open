const mbgGame = require('mbgGame');

cc.Class({
  extends: cc.Component,

  properties: {
    tabOnSprite: {
      default: null,
      type: cc.SpriteFrame,
      tooltip: '选中时按钮图片',
    },
    tabOnFontColor: {
      default: '#A6CEFF',
      tooltip: '选中时按钮字体颜色',
    },
    tabOffSprite: {
      default: null,
      type: cc.SpriteFrame,
      tooltip: '未选中时按钮图片',
    },
    tabOffFontColor: {
      default: '#7EAADF',
      tooltip: '未选中时按钮字体颜色',
    },
    defaultIndex: {
      default: 0,
      tooltip: '默认选中项的序号',
    },
    clickEvent: {
      default: [],
      type: cc.Component.EventHandler,
      tooltip: '按钮处理函数，按顺序0为第一个按钮',
    },
    tabSound: {
      default: 'UI_Select',
      tooltip: '按钮音效',
    },
  },

  onLoad() {
    this.initTab();
  },
  initTab() {
    for (let i = 0; i < this.node.children.length; i++) {
      const tab = this.node.children[i];
      tab._tabIndex = i;
      if (this.clickEvent[i]) {
        tab.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
      }
    }
    this.setTabOn(this.defaultIndex, null);
  },
  setSound(n) {
    this.tabSound = n;
  },
  setTabDisable(tabIndex) {
    const tab = this.node.children[tabIndex];
    if (tab) {
      tab.active = false;
    }
  },
  setTabEnable(tabIndex) {
    const tab = this.node.children[tabIndex];
    if (tab) {
      tab.active = true;
    }
  },

  setTabOn(selectIndex, event = null) {
    if (selectIndex == null) {
      selectIndex = this.defaultIndex;
    }
    // 设置选中效果
    for (let i = 0; i < this.node.children.length; i++) {
      const tab = this.node.children[i];
      let sp = this.tabOffSprite;
      let color = this.tabOffFontColor;
      if (tab._tabIndex === selectIndex) {
        sp = this.tabOnSprite;
        color = this.tabOnFontColor;

        const fn = this.clickEvent[tab._tabIndex];
        if (fn) {
          cc.Component.EventHandler.emitEvents([fn], event);
        }
      }
      const sprite = tab.getComponent(cc.Sprite);
      if (sprite) {
        sprite.spriteFrame = sp;
      }
      /*
      if (tab.children[0]) {
        tab.children[0].color = mbgGame.hex2color(color);
      }
      */
    }
  },

  onClick(event) {
    const tabIndex = event.target._tabIndex;
    if (tabIndex == null) return;

    this.setTabOn(tabIndex, event);
    if (this.tabSound) {
      mbgGame.playSound(this.tabSound);
    }
  },
});