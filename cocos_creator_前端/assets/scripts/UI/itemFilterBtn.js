const mbgGame = require('mbgGame');

cc.Class({
  extends: cc.Component,

  properties: {
    filterDefaultBtn: cc.Node,
    filterPanel: cc.Node,
    typePanel: cc.Node,
    attrPanel: cc.Node,
    starsPanel: cc.Node,
    defaultMode: 'synthesis',
  },

  onLoad() {
    this.setMode(mbgGame._itemsSortCondition || this.defaultMode);
    this.onToggleFilterPanel();
  },

  setUpMode() {
    this.filterPanel.anchorY = 0;
    const widget = this.filterPanel.getComponent(cc.Widget);
    widget.isAlignBottom = true;
    widget.isAlignTop = false;
    widget.bottom = 8;
  },

  initUI() {
    if (this._isInited) return;
    const types = [
      'synthesis',
      'itemName',
      'quality', 'starLvl',
      'attr_level',
    ];
    const attrs = [
      'MaxHp',
      'Atk', 'Def',
      'Cri', 'CriDam',
      'Dodge', 'Hit',
      'BeAtkW', 'Sk',
      // 'Heal',
    ];

    const itemList = mbgGame.player.getOwnedItems();
    let starsList = _.union((_.compact(_.map(itemList, 's'))));
    starsList = _.sortBy(starsList);

    // 去掉默认，已经默认到prefab里面了
    mbgGame._itemsSortCondition = mbgGame._itemsSortCondition || this.defaultMode;

    // types = _.without(types, this.defaultMode);
    // mbgGame.log('itemFIlterBtn', attrs, this.defaultMode);
    for (let i = 0; i < types.length; i++) {
      const btn = cc.instantiate(this.filterDefaultBtn);
      this.typePanel.addChild(btn);
      btn.m_Attr = types[i];
      btn.name = btn.m_Attr;
      const label = btn.getChildByName("btnLabel");
      label.getComponent(cc.RichText).string = mbgGame.getString(types[i]);
    }

    // attrs = _.without(attrs, this.defaultMode);
    // mbgGame.log('itemFIlterBtn', attrs, this.defaultMode);
    for (let i = 0; i < attrs.length; i++) {
      const btn = cc.instantiate(this.filterDefaultBtn);
      this.attrPanel.addChild(btn);
      btn.m_Attr = attrs[i];
      btn.name = btn.m_Attr;
      const label = btn.getChildByName("btnLabel");
      label.getComponent(cc.RichText).string = mbgGame.getString(attrs[i]);
    }

    for (let i = 0; i < starsList.length; i++) {
      const btn = cc.instantiate(this.filterDefaultBtn);
      this.starsPanel.addChild(btn);
      btn.m_Attr = `starList${starsList[i]}`;
      btn.name = btn.m_Attr;
      const label = btn.getChildByName("btnLabel");
      label.getComponent(cc.RichText).string = `<img src='star${starsList[i]}' />`;
    }

    this._isInited = true;
  },

  onTouch(event) {
    // 点击按钮才初始化
    this.initUI();
    if (event.target.name === 'defaultBtn') {
      this.onToggleFilterPanel();
    } else {
      this.setFilterMode(event);
    }
  },

  onToggleFilterPanel() {
    if (!this._filterMode) {
      // 第一次运行时，默认为关
      this._filterMode = 1; // 关闭
      this.filterPanel.active = false;
    } else if (this._filterMode === 1) {
      this._filterMode = 2; // 开启
      this.filterPanel.active = true;
    } else {
      this._filterMode = 1; // 关闭
      this.filterPanel.active = false;
    }
    const self = this;
    // 所有按钮显示
    this.typePanel.children.forEach((x) => {
      if (self._filterMode === 2) {
        x.active = true;
      } else {
        x.active = false;
      }
    });
    this.attrPanel.children.forEach((x) => {
      if (self._filterMode === 2) {
        x.active = true;
      } else {
        x.active = false;
      }
    });
  },
  setMode(mode) {
    mbgGame._itemsSortCondition = mode;
    // 下拉按钮的标题改为这个按钮的标题
    const label = this.filterDefaultBtn.getChildByName('btnLabel').getComponent(cc.RichText);
    if (mbgGame._itemsSortCondition) {
      if (_.includes(mbgGame._itemsSortCondition, 'starList')) {
        label.getComponent(cc.RichText).string = `<img src='star${mbgGame._itemsSortCondition.substring('starList'.length)}' />`;
      } else {
        label.string = mbgGame.getString(mbgGame._itemsSortCondition);
      }
    }
  },
  setFilterMode(event) {
    const btn = event.target;
    this.setMode(btn.m_Attr);
    this.onToggleFilterPanel();

    // this.bagLayer.getComponent('panelBag').refreshItemList();
    if (this.refreshCB) {
      this.refreshCB();
    }
    if (this._itemSV) {
      this._itemSV.scrollToTop();
    }
  },
  initFilterBtn(cb, itemSV) {
    this.refreshCB = cb;
    this._itemSV = itemSV;
  },
});
