const itemBase = require('itemBase');

cc.Class({
  extends: itemBase,

  properties: {
    isInfo: true,
    nameLabel: cc.RichText,
    descLabel: cc.RichText,
    worldLabel: cc.RichText,
    btnUp: cc.Node,
    btnSell: cc.Node,
    btnEquip: cc.Node,

    btnFrame: cc.Node,

    iconPos: cc.Node,
    frameBase: cc.Node,
    frameExtra: cc.Node,

    effectDesc: cc.Node,
    enchantDesc: cc.Node,

    lock: cc.Node,
    inUse: cc.Node,
    forward: cc.Node,
  },

  // use this for initialization
  onLoad() {
    mbgGame.winItemInfo = this;
    this.pos = 0;
    if (!this.itemPanelCom) {
      const itemPanel = mbgGame.managerUi.getIconItem();
      this.iconPos.addChild(itemPanel);
      this.itemPanelCom = itemPanel.getComponent('itemPanel');
    }
    if (this.isInfo) {
      // 按钮栏 详细模式
      this.btnFrame.active = false;
      this.btnEquip.active = false;
      this.btnSell.active = false;

      emitter.on(this, "itemChange", this.refreshMe);
      emitter.on(this, "closeWinItemInfo", this.closeWinItemInfo);
    }
  },
  onDestroy() {
    delete mbgGame.winItemInfo;
    if (this.isInfo) {
      mbgGame.log("destroy winiteminfo");
      emitter.off(this, "itemChange");
      emitter.off(this, "closeWinItemInfo");
    }
  },
  onAddBaseWin(dOption) {
    this.node._winBase.setTitle(mbgGame.getString('title_item'));
    this.initItemBase(dOption);
    // mbgGame.log('[winItemInfo]', this.m_Option);
    if (this.lock) this.lock.active = false;

    if (this.isInfo) {
      this.btnFrame.active = false;
      this.inUse.active = false;
      this.forward.active = false;
    }

    const itemPanelOption = _.clone(dOption);
    itemPanelOption.style = 'iconMe';
    this.itemPanelCom.initMe(itemPanelOption);

    switch (this.m_Option.style) {
      case 'preview':
        this.btnEquip.active = true;
        break;
      case 'gamble': {
        mbgGame.log("onAddBaseWin gamble");
        this.btnFrame.active = true;
        this.btnEquip.active = true;
        this.btnUp.active = false;
        this.btnSell.active = false;
        this.btnEquip.getComponent('itemBtn').setBtnLabel(mbgGame.getString("cancelStake"));
        break;
      }
      case 'smelt': {
        this.btnFrame.active = true;
        this.btnEquip.active = true;
        this.btnUp.active = false;
        this.btnSell.active = false;
        this.btnEquip.getComponent('itemBtn').setBtnLabel(mbgGame.getString("ok"));
        break;
      }
      case 'unidentify': {
        this.btnFrame.active = true;
        this.btnEquip.active = true;
        this.btnUp.active = false;
        this.btnSell.active = false;
        this.btnEquip.getComponent('itemBtn').setBtnLabel(dOption.btnOutfitStr || mbgGame.getString("ok"));
        break;
      }
      case 'wield': {
        if (this.lock) this.lock.active = true;
        this.btnFrame.active = true;
        this.btnEquip.active = true;
        this.btnUp.active = true;
        this.btnSell.active = false;
        if (mbgGame.hasClan) {
          this.forward.active = true;
        } else {
          this.forward.active = false;
        }
        this.btnEquip.getComponent('itemBtn').setBtnLabel(mbgGame.getString("unwield"));
        break;
      }
      case 'wieldBag':
        if (this.lock) this.lock.active = true;
        this.btnFrame.active = true;
        this.btnEquip.active = true;
        this.btnUp.active = true;
        this.btnSell.active = false;
        if (mbgGame.hasClan) {
          this.forward.active = true;
        } else {
          this.forward.active = false;
        }
        this.btnEquip.getComponent('itemBtn').setBtnLabel(mbgGame.getString("wield"));
        break;
      case 'bag': {
        if (this.lock) this.lock.active = true;
        this.btnFrame.active = true;
        this.btnEquip.active = false;
        this.btnUp.active = true;
        if (mbgGame.hasClan) {
          this.forward.active = true;
        } else {
          this.forward.active = false;
        }
        this.btnSell.active = true;
        this.inUse.active = mbgGame.player.checkItemInUse(this.sid());
        break;
      }
      default: // reset
        if (this.isInfo) {
          // 按钮栏
          this.btnFrame.active = false;
          // 装备扩展栏
          this.btnEquip.active = false;
        }
        break;
    }
    this.refreshMe();
  },
  closeWinItemInfo() {
    if (this.node._winBase) {
      this.node._winBase.closeMe();
    }
  },
  refreshMe(sid) {
    if (!this.itemData()) {
      if (sid && sid !== this.sid()) return;
      if (!(this.sid() > 0) && !this.itemID()) {
        return;
      }
      if (this.sid() > 0 && !this.hasItem()) {
        return;
      }
    }
    const dItemConfig = mbgGame.config[`item${this.itemID()}`];
    if (!dItemConfig) {
      mbgGame.error("[winItemInfo] no dItemConfig", this.itemID());
      return;
    }
    const q = this.itemQ();
    const lv = mbgGame.player.getItemLv(this.sid());
    let dItemData;
    if (this.itemData()) {
      dItemData = this.itemData();
    } else {
      dItemData = mbgGame.player.getItemData(this.sid());
    }

    mbgGame.managerUi.showItemAttr({
      content: this.frameBase,
      subContent: this.frameExtra,
      effectDesc: this.effectDesc,
      enchantDesc: this.enchantDesc,
      sid: this.sid(),
      itemData: this.itemData(),
      style: this.m_Option.style,
    });

    this.nameLabel.string = mbgGame.player.getItemRichTextName(this.itemID(), q);
    this.descLabel.string = mbgGame.getString(`itemdetail${this.itemID()}`) || "";
    this.worldLabel.string = mbgGame.player.getItemWorldFrom(null, this.itemID());

    if (!this.isInfo || this.m_Option.style === 'unidentify') return;

    if (dItemData) {
      if (this.hasItem()) {
        this.btnSell.getComponent('itemBtn').setBtnLabel(`${mbgGame.getString('sell')}<br />${mbgGame.getString('unitPrice', {
          price: mbgGame.smartNum(mbgGame.player.getItemSellPrice(this.sid())),
          unit: 'logo_coins',
        })}`);
      }
      if (dItemData.l) {
        if (this.lock) mbgGame.resManager.setAutoAtlasFrame(this.lock.getComponent(cc.Sprite), 'itemsIcon', 'locked');
        this.btnSell.getComponent('itemBtn').setStatus(false, '物品已经上锁，解除后才能出售');
      } else if (this.lock) {
        mbgGame.resManager.setAutoAtlasFrame(this.lock.getComponent(cc.Sprite), 'itemsIcon', 'unlock');
      }
    } else {
      this.btnSell.active = false;
      if (this.lock) this.lock.active = false;
    }

    const maxLv = mbgGame.config.constTable.itemMaxLv[q];
    this.btnUp.getComponent('itemBtn').setBtnLabel(`升级`);
    if (mbgGame.player.isSmeltItemUnlocked() &&
      this.hasItem() && dItemData && !dItemData.l3 && lv < maxLv) {
      this.btnUp.getComponent('itemBtn').setStatus(true);
    } else {
      this.btnUp.getComponent('itemBtn').setStatus(false);
      if (!mbgGame.player.isSmeltItemUnlocked()) {
        this.btnUp.getComponent('itemBtn').setBtnLabel(`升级<size=18>(未解锁)</size>`);
      }
    }
  },
  onUpgrade() {
    mbgGame.resManager.loadPrefab('panelSmeltItem', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelSmeltItem', this.sid(), this);
    });
  },
  onEquip() {
    if (mbgGame.schemeTeamEditor) {
      if (this.m_Option.style === 'wield') {
        mbgGame.schemeTeamEditor.unuseItem(this.sid());
      } else if (this.m_Option.style === 'wieldBag') {
        mbgGame.schemeTeamEditor.onUseItemBegin(this.sid());
      }
    }
    if (this.m_Option.equipCB) {
      this.m_Option.equipCB(this);
    }
    this.closeWinItemInfo();
  },
  onSell() {
    mbgGame.player.sellItem(this.sid());
  },
  onLock() {
    let lockCMD = 'bag.lock';
    if (mbgGame.player.getItemLock(this.sid())) {
      lockCMD = 'bag.unlock';
    }
    mbgGame.netCtrl.sendMsg(lockCMD, {
      sid: this.sid(),
    });
  },
  onShare() {
    mbgGame.player.doShareItem(this.sid());
  },
});