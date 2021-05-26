cc.Class({
  extends: cc.Component,

  properties: {
    itemMoonCardMain: cc.Node,
    itemMoonCardDay: cc.Node,
    itemTehui: cc.Node,
    itemFirstPay: cc.Node,
    itemContents: cc.Node,
    itemSingle: cc.Node,
    scrollView: cc.ScrollView,
    content: cc.Node,
    payChannel: cc.Node,
    btnGooglePlayPay: cc.Node,
  },

  onLoad() {
    // 保存模版 先保存子模版
    this.shopItemTemplateCardMain = cc.instantiate(this.itemMoonCardMain);
    this.shopItemTemplateCardDay = cc.instantiate(this.itemMoonCardDay);
    this.shopItemTemplateTehui = cc.instantiate(this.itemTehui);
    this.shopItemTemplateFirstPay = cc.instantiate(this.itemFirstPay);
    this.shopItemTemplate1 = cc.instantiate(this.itemSingle);
    cc.find('content', this.itemContents).removeAllChildren();
    this.shopItemListTemplate = cc.instantiate(this.itemContents);
    this.content.removeAllChildren();

    this.payChannel.active = false;
    this.btnGooglePlayPay.active = false;
    this.refreshMe();
  },
  onOpened() {},

  update() {
    if (!this.renderList || !this.renderList.length) return;
    const obj = this.renderList.shift();
    this.addItem(obj[0], obj[1], obj[2]);

    if (this.renderList.length < 1) delete this.renderList;
  },

  addItem(content, item, i) {
    let node;
    // mbgGame.log('addItem ',item.id, i);
    if (content) {
      node = _.find(content.children, {
        _itemID: item.id,
      });
    } else {
      node = _.find(this.content.children, {
        _itemID: item.id,
      });
    }
    if (!node) {
      if (item.act === 'awardShow') {
        node = cc.instantiate(this.shopItemTemplateFirstPay);
        this.content.addChild(node);
        node.zIndex = i;
      } else if (item.act === 'period') {
        if (item.inPreiod) {
          node = cc.instantiate(this.shopItemTemplateCardDay);
        } else {
          node = cc.instantiate(this.shopItemTemplateCardMain);
        }
        this.content.addChild(node);
        node.zIndex = i;
      } else if (item.act === 'iapitem') {
        node = cc.instantiate(this.shopItemTemplateTehui);
        this.content.addChild(node);
        node.zIndex = i;
      } else {
        node = cc.instantiate(this.shopItemTemplate1);
        content.addChild(node);
      }
    }
    node._itemID = item.id;
    node.getComponent('shopItem').init(item);

    if (item.outDate && item.push) {
      // 增加本地推送
      mbgGame.localPush(+item.outDate - moment().unix(), item.push);
    }

    if (this.refreshNode && this.refreshNode.itemData && this.refreshNode.itemData.id === item.id) {
      this.refreshNode.initMe(item);
      delete this.refreshNode;
    }
  },

  list(shopItems) {
    shopItems = shopItems || mbgGame.getCache('shop.list');
    if (!shopItems) return;

    if (mbgGame.isWechatGame() && cc.sys.os === cc.sys.OS_IOS) {
      // ios版本小游戏不能展示充值道具
      shopItems = _.filter(shopItems, (x) => {
        return x.unit !== 'rmb' && x.act !== 'iapitem' && x.act !== 'awardShow';
      });
    }

    mbgGame.log('shopItems', shopItems, mbgGame.isWechatGame());

    this.renderList = [];

    // 过滤出类别
    const typeList = _.union(_.compact(_.map(shopItems, 'type')));
    // mbgGame.log('typeList', typeList);
    if (!typeList || !typeList.length) return;

    for (let i = 0; i < typeList.length; i++) {
      const typeName = typeList[i];
      let contentNode = this.content;
      if (typeName === 'none') {
      } else {
        let content = cc.find(typeName, this.content);
        if (!content) {
          content = cc.instantiate(this.shopItemListTemplate);
          this.content.addChild(content);
          content.name = typeName;
        }
        contentNode = content.getChildByName('content');
        content.zIndex = i;
        cc.find('titleBar/title', content).getComponent(cc.Label).string = typeName;
      }
      const items = _.filter(shopItems, {
        type: typeName,
      });

      items.forEach((item) => {
        this.renderList.push([contentNode, item, i]);
      });
    }
  },

  refreshMe(refreshNode) {
    if (refreshNode) {
      this.refreshNode = refreshNode;
    }
    const data = mbgGame.getCache('shop.list');
    // mbgGame.log('[refreshShopItemList]',data);
    if (!data) {
      return;
    }
    this.list();
  },

  limitPay(payItem) {
    if (payItem.id === 'tcva6' || payItem.id === 'tcvb6' || payItem.id === 'tcvc6') {
      const now = moment().unix();
      const check = +cc.sys.localStorage.getItem('tempshop_vip');
      if (check) {
        if (+check > now - 10 * 60) {
          mbgGame.managerUi.floatMessage(mbgGame.getString('shop_wait'));
          return true; // 限制不能连续多次购买
        }
        cc.sys.localStorage.removeItem('tempshop_vip');
      } else {
        cc.sys.localStorage.setItem('tempshop_vip', `${now} `);
      }
    }
    return false;
  },

  showPayChannel(payItem) {
    this.payItem = payItem;
    if (mbgGame._openAddiction) {
      mbgGame.antiAddictionPayCheck(+payItem.price * 100);
      mbgGame._uiNode = this.payChannel;
    } else {
      this.payChannel.active = true;
    }
  },

  hidePayChannel() {
    delete this.payItem;
    this.payChannel.active = false;
  },

  onAlipay() {
    if (this.limitPay(this.payItem)) return;
    mbgGame.IAP.alipay(this.payItem);
    this.payChannel.active = false;
  },

  onWeixin() {
    if (this.limitPay(this.payItem)) return;
    mbgGame.IAP.weixinpay(this.payItem);
    this.payChannel.active = false;
  },

  onGooglePlay() {
    if (this.limitPay(this.payItem)) return;
    mbgGame.IAP.googlePlayPay(this.payItem);
    this.payChannel.active = false;
  },

  goH5Pay(url) {
    mbgGame.goUrl(url, this.node);
    /*
    if (url.includes('wx.tenpay.com')) {
      mbgGame.goUrl(url, this.node);
    } else {
      mbgGame.goUrl(url, this.node, 560, 700);
    }
    */
  },

  closeH5Pay() {
    this.goH5Pay('');
    const node = cc.find('webView', this.node);
    if (node) {
      node.destroy();
    }
  },
});
