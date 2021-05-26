const mbgGame = require('mbgGame');
const itemBase = require('itemBase');

cc.Class({
  extends: itemBase,

  // use this for initialization
  onLoad() {
    emitter.on(this, "itemChange", this.onItemChanged);
    emitter.on(this, "itemEffect", this.onItemEffect);
  },

  onDestroy() {
    // mbgGame.log('item onDestroy', this.sid());
    emitter.off(this);
  },

  // 道具的刷新事件
  onItemChanged(sid) {
    if (!this.sid()) {
      return;
    }
    if (sid === -1 || sid === this.sid()) {
      this.refreshMe();
    }
  },

  // 道具的刷新事件
  onItemEffect(sid, effect, repeat) {
    if (!this.sid()) {
      return;
    }
    let isMe = false;
    if (_.isArray(sid)) {
      if (_.includes(sid, this.sid())) {
        isMe = true;
      }
    } else if (sid === -1 || sid === this.sid()) {
      isMe = true;
    }
    if (isMe) {
      if (effect) {
        this.showEffect(effect, repeat);
      } else {
        this.removeEffect();
      }
    }
  },

  addItemSprite(flag,
    {
      hide = false,
      png = null,
      altas = 'itemsIcon',
    } = {}) {
    const nodeName = `_${flag}Node`;
    if (hide) {
      if (this[nodeName]) {
        this[nodeName].active = false;
      }
      return;
    }
    if (this[nodeName]) {
      this[nodeName].active = true;
      const sprite = this[nodeName].getComponent(cc.Sprite);
      mbgGame.resManager.setAutoAtlasFrame(sprite, altas, png || flag);
      return;
    }
    const node = new cc.Node();
    const sprite = node.addComponent(cc.Sprite);
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    mbgGame.resManager.setAutoAtlasFrame(sprite, altas, png || flag);
    this.node.addChild(node);

    this[nodeName] = node;

    // shadow
    if (flag === 'shelfShadow') {
      node.y = -54;
    }
    // redtip
    if (flag === 'redTip') {
      node.x = 39;
      node.y = 39;
    }
    // starRank
    if (flag === 'star') {
      node.anchorX = 0;
      node.x = -50;
      node.y = 39;
    }
    // inUse
    if (flag === 'equip') {
      node.x = -30;
      node.y = -30;
    }

    // locket
    if (flag === 'locked') {
      node.x = 0;
      node.y = 61;
    }
  },
  initMe(dOption) {
    this.initItemBase(dOption);

    if (dOption.icon) {
      // 如果是非物品，只要设置了名字，如diamonds，则会自动添加点击tips
      // 因为判断写在了onLoad,所以需要addChild之前执行，还要过滤前面的award_
      if (dOption.icon.startsWith("award_")) {
        this.node.addComponent('autoTooltips');
        this.node.name = dOption.icon.substring('award_'.length);
      }
    }
    // 默认是default，全不显示，所以只需要把显示的设置就行了
    switch (dOption.style) {
      case 'bag':
        // this.node.height = 140;
        this.addSellPrice(false);
        this.addInfoButton();
        break;
      case 'bagSell':
        this.node.height = 140;
        this.addSellPrice(true);
        break;
      case 'award':
      case 'gamble':
      case 'preview':
      case 'unidentify':
        this.addInfoButton();
        break;
      case 'wield':
      case 'wieldBag':
      case 'iconMe':
      case 'smelt':
        break;
      default:
        break;
    }
    this.refreshMe();
    if (dOption.buttonConfig) {
      this.addButton(dOption.buttonConfig[0], dOption.buttonConfig[1], dOption.buttonConfig[2]);
    }
    if (dOption.selectMode) {
      emitter.on(this, 'itemSelect', this.checkSelect);
      this.addButton(dOption.selectMode[0], dOption.selectMode[1], dOption.selectMode[2]);
      const checkFun = dOption.selectMode[3];
      if (checkFun) {
        const select = checkFun(this.sid());
        this.addItemSprite('selected', {
          png: 'itemSelected',
          hide: !select,
        });
      }
    }
  },
  checkSelect(sid) {
    if (!sid) return;
    let select = false;
    if (_.isArray(sid)) {
      select = sid.indexOf(this.sid()) !== -1;
    } else {
      select = this.sid() === sid;
    }
    this.addItemSprite('selected', {
      png: 'itemSelected',
      hide: !select,
    });
  },

  // b = true selected  b = false normal
  addSelected(b) {
    this.addItemSprite('selected', {
      png: 'itemSelected',
      hide: !b,
    });
  },
  refreshMe() {
    if (this.sid() || this.itemID() || this.itemData()) {
      this.refreshMe_AsItem();
    } else if (!this.m_Option.isItem) {
      this.refreshMe_AsOther();
    }
  },
  refreshMe_AsItem() {
    // 邮件的还是背包的 会有一些不一样
    if (!this.m_Option.itemData) {
      if (this.sid() > 0 && !mbgGame.player.hasItem(this.sid())) {
        this.node.active = false;
        return;
      }
      this.node.active = true;
      if (this.sid() === -1) {
        return;
      }
    }
    const dConfig = mbgGame.config[`item${this.itemID()}`];
    if (!dConfig) {
      // 已经无效的物品
      return;
    }

    this.addItemSprite('itemBg', {
      png: 'itemBg',
    });

    const q = this.itemQ();
    const lv = this.itemLv();

    this.addItemSprite('quality', {
      png: q ? `itemBg${q}` : 'itemBg',
    });

    this.addItemSprite('icon', {
      png: dConfig.icon,
    });

    this.addItemLevel(lv);
    const starLv = this.itemStarLv();
    if (starLv > 0) {
      this.addItemSprite('star', { png: `star${starLv}` });

      if (this.sid()) {
        this.addInUse();
      }
    }
  },
  refreshMe_AsOther() {
    const icon = this.m_Option.icon;
    if (!this.m_Option.noBg) {
      this.addItemSprite('quality', {
        png: 'itemBg',
      });
    }
    if (this.m_Option.bg) {
      this.addItemSprite('itemBg', {
        png: this.m_Option.bg,
      });
    }
    if (icon) {
      // 钻石金钱之类
      this.addItemSprite('icon', {
        png: icon,
        altas: 'uiBase',
      });
    }

    if (this.m_Option.count != null) {
      this.addCount(this.m_Option.count);
    }
  },
  addSellPrice(b) {
    if (!b) {
      // this.addItemSprite('shelfShadow');
      if (this._sellPrice) {
        this._sellPrice.node.destroy();
        delete this._sellPrice;
      }
      this.addItemSprite('locked', { hide: true });
      return;
    }
    // 关闭阴影
    // this.addItemSprite('shelfShadow', { hide: true });
    const price = mbgGame.smartNum(mbgGame.player.getItemSellPrice(this.sid()));
    if (!this._sellPrice) {
      const node = new cc.Node();
      this._sellPrice = node.addComponent(cc.RichText);
      this._sellPrice.handleTouchEvent = false;
      this._sellPrice.imageAtlas = mbgGame.preloadRes.uiBase;
      this.node.addChild(node);
      node.setContentSize(100, 30);
      node.y = -60;
      this._sellPrice.fontSize = 24;
    }
    this._sellPrice.string = mbgGame.getString('unitPrice', {
      price,
      unit: 'logo_coins',
    });
    if (mbgGame.player.getItemLock(this.sid())) {
      this.addItemSprite('locked');
    }
  },
  showEffect(effect, repeat) {
    if (!this._animCom) {
      const animNode = new cc.Node();
      animNode.addComponent(sp.Skeleton);
      this._animCom = animNode.addComponent("spineObject");
      this.node.addChild(animNode);
      this._animCom.loadSpine('itemEffect');
    }
    this._animCom.doAction(effect, repeat);
  },
  removeEffect() {
    if (this._animCom) {
      this._animCom.node.destroy();
      delete this._animCom;
    }
  },
  addInUse() {
    const style = this.m_Option.style;
    this.addItemSprite('equip', { hide: true });
    if (!(_.includes(['bag', 'bagSell', 'smelt', 'gamble'], style))) {
      return;
    }
    const isUse = mbgGame.player.checkItemInUse(this.sid());
    if (isUse) {
      this.addItemSprite('equip');
    }
  },
  addItemLevel(lv) {
    if (!this._itemLvCom) {
      const node = cc.instantiate(mbgGame.preloadRes.number);
      this._itemLvCom = node.getComponent('number');
      node.x = 40;
      node.y = -30;
      node.anchorX = 1;
      this.node.addChild(node);
    }
    this._itemLvCom.initMe({
      type: 'item',
      atlas: 'itemsIcon',
      str: `${Math.abs(lv)}`,
    });
  },
  addCount(count) {
    if (!this._countLabel) {
      const node = new cc.Node();
      this._countLabel = node.addComponent(cc.Label);
      this._countLabel.fontSize = 20;
      node.color = mbgGame.hex2color('#FFFFFF');
      this._countLabel.HorizontalAlign = cc.Label.HorizontalAlign.CENTER;
      const com = node.addComponent(cc.LabelOutline);
      com.width = 2;
      com.color = mbgGame.hex2color('#1F3455');
      this.node.addChild(node);
      node.x = 40;
      node.y = -40;
      node.anchorX = 1;
    }
    this._countLabel.string = `${mbgGame.smartNum(count)}`;
  },

  addButton(node, com, fn) {
    let btnCom = this.node.getComponent(cc.Button);
    if (!btnCom) {
      btnCom = this.node.addComponent(cc.Button);
      const clickEventHandler = new cc.Component.EventHandler();
      btnCom.clickEvents.push(clickEventHandler);
      btnCom.transition = cc.Button.Transition.SCALE;
      btnCom.zoomScale = 0.95;
    }
    const handler = btnCom.clickEvents[0];
    handler.target = node; // 这个 node 节点是你的事件处理代码组件所属的节点
    handler.component = com;// 这个是代码文件名
    handler.handler = fn;
  },

  addInfoButton() {
    this.addButton(this, 'itemPanel', 'showInfo');
  },

  showInfo() {
    if (this.sid() || this.m_Option.itemData) {
      const dData = {
        sid: this.sid(),
        itemID: this.itemID(),
        style: this.m_Option.style,
        itemData: this.m_Option.itemData,
        btnOutfitStr: this.m_Option.btnOutfitStr,
        equipCB: this.m_Option.equipCB,
      };
      mbgGame.log('showInfo', dData);
      mbgGame.managerUi.openItemInfo(dData, this.m_Option.style === 'award');
    }
  },
});
