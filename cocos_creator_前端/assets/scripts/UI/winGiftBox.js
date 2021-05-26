cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.RichText,
    icon: cc.Sprite,
    itemPrice: cc.RichText,
    desc: cc.RichText,

    weiPay: cc.Node,
    aliPay: cc.Node,
    normalPay: cc.Node,

    info: cc.RichText,
  },

  onLoad() {
    this.weiPay.active = false;
    this.aliPay.active = false;
  },

  onAddBaseWin(item) {
    const self = this;
    this.itemData = item;
    // mbgGame.log("itemData:", this.itemData);
    this.title.string = this.itemData.name_local || this.itemData.name;

    mbgGame.resManager.setImageFrame(this.icon, 'images', this.itemData.image);

    if (this.itemData.desc) {
      this.desc.string = this.itemData.desc;
    } else {
      this.desc.string = "";
    }

    if (this.itemData.act === 'video') {
      this.unitIcon = 'logo_adv';
    } else if (this.itemData.unit) {
      this.unitIcon = `logo_${this.itemData.unit}`;
    }

    if (mbgGame.IAPProductsConfig && mbgGame.IAPProductsConfig[item.id] && mbgGame.IAPProductsConfig[item.id].modifyPrice) {
      // 根据平台设置修正商品,只修正价格
      this.priceStr = mbgGame.IAPProductsConfig[item.id].modifyPrice;
    } else if (this.itemData.unit === 'rmb') {
      // 根据平台设置修正商品,只修正价格
      this.priceStr = mbgGame.getString(this.itemData.unit) + this.itemData.price;
      if (mbgGame.isAndroid()) {
        this.weiPay.active = true;
        this.aliPay.active = true;
        this.normalPay.active = false;
      } else {
        this.weiPay.active = false;
        this.aliPay.active = false;
        this.normalPay.active = true;
      }
    } else if (+this.itemData.price > 0) {
      // 设置了价钱的商品
      this.priceStr = this.itemData.price;
    } else {
      this.priceStr = mbgGame.getString(this.itemData.price);
    }

    if (this.unitIcon) {
      this.itemPrice.string = mbgGame.getString('unitPrice', {
        price: this.priceStr,
        unit: this.unitIcon,
      });
    } else {
      this.itemPrice.string = mbgGame.getBoldStr(this.priceStr);
    }

    if (this.itemData.inPreiod === 1) {
      this.itemPrice.string = mbgGame.getString('shop_get');
      this.normalPay.getComponent('itemBtn').setStatus(true);
    } else if (this.itemData.inPreiod === 2) {
      // 显示倒计时
      this.itemPrice.string = mbgGame.getString('shop_get');
      this.normalPay.getComponent('itemBtn').setStatus(false, mbgGame.getString('shop_getwait'));
    } else if (this.itemData.cantBuy) {
      this.normalPay.getComponent('itemBtn').setStatus(false, mbgGame.getString('shop_buylimit'));
    } else {
      this.normalPay.getComponent('itemBtn').setStatus(true);
    }

    if (this.itemData.inPreiod !== 1 && (this.itemData.outDate || this.itemData.pOutDate)) {
      const outDate = this.itemData.pOutDate || this.itemData.outDate;
      let timeCom = this.itemPrice.node.getComponent('effectTimerString');
      if (!timeCom) {
        timeCom = this.itemPrice.node.addComponent('effectTimerString');
      }
      timeCom.initMe({
        endTime: outDate,
        endStr: this.itemData.pOutDate ? mbgGame.getString('shop_get') : mbgGame.getString('unitPrice', {
          price: this.priceStr,
          unit: this.unitIcon,
        }),
        interval: 1,
      });
    }

    if (this.itemData.info) {
      this.info.string = this.itemData.info;
    } else {
      this.info.string = '';
    }
  },

  doBuy() {
    if (this.itemData.inPreiod === 1) {
      // 不用钱的商品就不用弹对话框了
      this.sendBuy(this.itemData.id);
      return;
    }
    if (this.itemData.act === 'video') {
      mbgGame.netCtrl.sendMsg("shop.showVideo", {
        id: this.itemData.id,
        status: mbgGame.advertisement.getVideoStatus(),
      }, (data) => {
        // mbgGame.log("[mbgGame.showVideo]", data);
        if (data.code === "ok") {
          mbgGame.advertisement.showRewardVideo(data);
        } else if (data.err) {
          mbgGame.managerUi.floatMessage(data.err);
        }
        emitter.emit('closeMe');
      });
      return;
    }

    if (!(+this.itemData.price)) {
      // 不用钱的商品就不用弹对话框了
      this.sendBuy(this.itemData.id);
      return;
    }

    // 弹出确认购买的窗口
    let price = '';
    let unit = '';
    if (+this.itemData.price > 0) {
      price = this.itemData.price;
      unit = mbgGame.getString(this.itemData.unit || "diamond");
    } else {
      price = mbgGame.getString(this.itemData.price);
      unit = '';
    }
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("buyAsk", {
        price,
        unit,
        name: this.itemData.name_local || (this.itemData.name || " "),
      }), this.sendBuy.bind(this), this.itemData.id);
  },

  buyItem() {
    this.doBuy();
  },

  sendBuy(id) {
    // mbgGame.log("buy " + id);
    mbgGame.netCtrl.sendMsg("shop.buy", {
      id,
    }, (data) => {
      // mbgGame.log("buy:",data);
      if (data.code === "ok") {
        emitter.emit('shopItemRefresh', data.itemInfo);
        this.node._winBase.closeMe();
        if (this.itemData) {
          mbgGame.analytisc.buy(id, +this.itemData.price);
        }
      }
      mbgGame.log("[mbgGame.buy]", data);
    });
  },
});