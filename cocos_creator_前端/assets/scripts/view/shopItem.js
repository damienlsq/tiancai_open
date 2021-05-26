cc.Class({
  extends: cc.Component,

  properties: {
    bg: cc.Node,
    itemName: cc.Node,
    icon: cc.Sprite,
    double: cc.Node,
    desc: cc.Node,
    subTitle: cc.Node,

    itemPrice: cc.Node,
    timeLimit: cc.Node,
    itemBtn: cc.Node,
  },

  onLoad() {
    emitter.on(this, 'shopItemRefresh', this.refreshMe);
  },
  onDestroy() {
    emitter.off(this, 'shopItemRefresh');
  },

  showAward(item) {
    if (this.itemData.act === 'period') {
      this.showMoonCardAward(item);
      return;
    }
    if (item.award) {
      const award = item.award;
      if (award.items) {
        const itemNode = cc.find('itemNode', this.node);
        itemNode.removeAllChildren();
        award.items.split(',').forEach((sItem) => {
          const [itemID, , q, starLv] = sItem.split('x');
          mbgGame.managerUi.getAwardItem(itemNode, {
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
      const currencyNode = cc.find('currencyNode', this.node);
      currencyNode.removeAllChildren();
      ['diamonds', 'gem', 'mat', 'sta', 'coins', 'score'].forEach((x) => {
        if (!award[x]) return;
        mbgGame.managerUi.getAwardItem(currencyNode, {
          icon: `award_${x}`,
          count: award[x],
          bg: 'itemBg',
        });
      });
    }
  },

  showMoonCardAward(item) {
    let node;
    if (!item.inPreiod) {
      node = cc.find('awardMain', this.node);
      node.removeAllChildren();
      mbgGame.managerUi.getAwardItem(node, {
        icon: `award_diamonds`,
        count: item.awardMain.diamonds,
        bg: 'itemBg',
      });
    }

    node = cc.find('awardDay', this.node);
    node.removeAllChildren();
    ['diamonds', 'gem', 'mat', 'sta', 'coins', 'score'].forEach((x) => {
      if (!item.awardDay[x]) return;
      mbgGame.managerUi.getAwardItem(node, {
        icon: `award_${x}`,
        count: item.awardDay[x],
        bg: 'itemBg',
      });
    });

    const award = item.awardDay;
    if (award.items) {
      award.items.split(',').forEach((sItem) => {
        const [itemID, , q, starLv] = sItem.split('x');
        mbgGame.managerUi.getAwardItem(node, {
          itemData: {
            i: +itemID,
            q: +q,
            s: item.starLv,
            lv: 1,
          },
          style: 'unidentify',
        });
      });
    }
  },

  refreshMe(item) {
    if (!item || !this.itemData) return;
    if (this.itemData.id !== item.id) {
      return;
    }
    this.init(item);

    const shopItems = mbgGame.getCache('shop.list');
    if (!shopItems) return;
    // 更新cache
    const idx = _.findIndex(shopItems, {
      id: item.id,
    });
    if (idx !== -1) {
      shopItems[idx] = item;
    }
  },

  init(item) {
    this.itemData = item;
    // mbgGame.log("itemData:", this.itemData);

    mbgGame.setLabel(this.itemName, mbgGame.getBoldStr(this.itemData.name_local || this.itemData.name || ' '));

    if (this.itemData.desc) {
      mbgGame.setLabel(this.desc, this.itemData.desc);
    } else {
      mbgGame.setLabel(this.desc, '');
    }

    if (this.itemData.info) {
      mbgGame.setLabel(this.subTitle, this.itemData.info);
    } else {
      mbgGame.setLabel(this.subTitle, '');
    }

    if (this.double) {
      this.double.active = this.itemData.flag && _.includes(this.itemData.flag, 'double');
    }

    if (this.icon) {
      mbgGame.resManager.setImageFrame(this.icon, 'images', this.itemData.image);
    }

    if (this.itemData.iapItemData) {
      const dItemConfig = mbgGame.config[`item${this.itemData.iapItemData.itemID}`];
      mbgGame.setLabel(cc.find('diamonds', this.node), this.itemData.iapItemData.diamonds || 0);
      mbgGame.resManager.setAutoAtlasFrame(cc.find('itemNode', this.node), 'itemsIcon', dItemConfig.icon);
      mbgGame.setLabel(
        cc.find('itemName', this.node),
        mbgGame.getString(`itemname${this.itemData.iapItemData.itemID}`),
      );
      /*
      const node = mbgGame.managerUi.getIconItem();
      this.itemNode.addChild(node);
      node.getComponent("itemPanel").initMe({
        itemData: {
          i: this.itemData.iapItemData.itemID,
          s: this.itemData.iapItemData.starLv,
          q: 4,
        },
        style: 'unidentify',
      });
      */
      mbgGame.resManager.setAutoAtlasFrame(
        cc.find('star', this.node),
        'itemsIcon',
        `star${this.itemData.iapItemData.starLv}`,
      );
    }
    // mbgGame.log("this.itemData",this.itemData);
    if (this.itemData.act === 'video') {
      this.unitIcon = 'logo_adv';

      // 目前没有广告可以看，就隐藏显示
      this.node.active = mbgGame.advertisement.getVideoStatus();
    } else if (this.itemData.unit) {
      this.unitIcon = `logo_${this.itemData.unit}`;
    }

    this.showAward(item);

    if (
      mbgGame.IAPProductsConfig &&
      mbgGame.IAPProductsConfig[item.id] &&
      mbgGame.IAPProductsConfig[item.id].modifyPrice
    ) {
      // 根据平台设置修正商品,只修正价格
      this.priceStr = mbgGame.IAPProductsConfig[item.id].modifyPrice;
    } else if (this.itemData.unit === 'rmb') {
      // 根据平台设置修正商品,只修正价格
      this.priceStr = mbgGame.getString(this.itemData.unit) + this.itemData.price;
    } else if (+this.itemData.price > 0) {
      // 设置了价钱的商品
      this.priceStr = this.itemData.price;
    } else {
      this.priceStr = mbgGame.getString(this.itemData.price);
    }

    if (this.unitIcon) {
      mbgGame.setLabel(
        this.itemPrice,
        mbgGame.getString('unitPrice', {
          price: this.priceStr,
          unit: this.unitIcon,
        }),
      );
    } else {
      mbgGame.setLabel(this.itemPrice, mbgGame.getBoldStr(this.priceStr));
    }

    if (this.itemBtn && this.itemData.act === 'period') {
      if (this.itemData.inPreiod === 1) {
        this.itemBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('shop_get'));
      } else if (this.itemData.inPreiod === 2) {
        // 显示倒计时
        this.itemBtn.getComponent('itemBtn').setStatus(false, mbgGame.getString('shop_wait'));
      } else {
        this.itemBtn.active = false;
      }
    }

    if (this.timeLimit) {
      let iapOutDate = 0;
      if (this.itemData.iapItemData) {
        iapOutDate = this.itemData.iapItemData.outDate;
      }
      if (iapOutDate) {
        let timeCom = this.timeLimit.getComponent('effectTimerString');
        if (!timeCom) {
          timeCom = this.timeLimit.addComponent('effectTimerString');
        }
        timeCom.initMe({
          endTime: iapOutDate,
          interval: 1,
          endFunc: () => {
            if (this.node && this.node.isValid) {
              if (this.node.parent.children.length <= 1) {
                this.node.parent.parent.destroy();
              } else {
                this.node.destroy();
              }
            }
          },
        });
      }
      return;
    }

    if (this.itemData.inPreiod !== 1 && (this.itemData.outDate || this.itemData.pOutDate)) {
      const outDate = this.itemData.pOutDate || this.itemData.outDate;
      let timeCom = this.itemPrice.getComponent('effectTimerString');
      if (!timeCom) {
        timeCom = this.itemPrice.addComponent('effectTimerString');
      }
      timeCom.initMe({
        endTime: outDate,
        endStr: this.itemData.pOutDate
          ? mbgGame.getString('shop_get')
          : mbgGame.getString('unitPrice', {
              price: this.priceStr,
              unit: this.unitIcon,
            }),
        interval: 1,
      });
    }
  },

  openBuy() {
    if (this.itemData.unit === 'rmb' && this.itemData.inPreiod !== 1) {
      if (this.itemData.cantBuy) {
        mbgGame.managerUi.floatMessage(mbgGame.getString('shop_buylimit'));
        return;
      }
      if (cc.sys.isNative) {
        if (mbgGame.isIOS()) {
          if (mbgGame._openAddiction) {
            mbgGame.antiAddictionPayCheck(+this.itemData.price * 100);
            mbgGame._iosBuyItemData = this.itemData;
          } else {
            mbgGame.IAP.buyProduct(this.itemData);
          }
          return;
        }
      }
      if (mbgGame.channel_id === 'aligames') {
        mbgGame.IAP.platformPay(this.itemData);
        return;
      }
      if (mbgGame.isWechatGame()) {
        mbgGame.IAP.midasPay(this.itemData);
        return;
      }
      if (mbgGame.isWechatH5()) {
        return mbgGame.wxh5Pay({
          gameId: 'tc',
          product_id: this.itemData.id,
          subject: this.itemData.name_local || this.itemData.name || '游戏道具',
          game_uuid: mbgGame.state.uuid,
        });
      }
      mbgGame.panelShop.showPayChannel(this.itemData);
      return;
    }
    if (this.itemData.act === 'awardShow' || this.itemData.act === 'period') {
      const id = this.itemData.id;
      mbgGame.netCtrl.sendMsg(
        'shop.buy',
        {
          id,
        },
        (data) => {
          // mbgGame.log("buy:",data);
          if (data.code === 'ok') {
            if (this.itemData.act === 'period') {
              // 购买月卡，刷新所有商品
              mbgGame.removeCache('shop.list');
              mbgGame.sceneMenu.refreshShopItemList();
            } else {
              emitter.emit('shopItemRefresh', data.itemInfo);
            }
            if (this.itemData) {
              mbgGame.analytisc.buy(id, +this.itemData.price);
            }
          }
          mbgGame.log('[mbgGame.buy]', data);
          if (this.itemData.act === 'period') {
            if (!this.itemData.inPreiod) {
              // 第一次购买
              this.node.destroy();
            }
          }
        },
      );
      return;
    }
    mbgGame.resManager.loadPrefab('winGiftBox', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addSmallWin(node, 'winGiftBox', this.itemData);
    });
  },

  openItemInfo() {
    mbgGame.managerUi.openItemInfo({
      itemData: {
        i: this.itemData.iapItemData.itemID,
        s: this.itemData.iapItemData.starLv,
        q: 4,
      },
      style: 'unidentify',
    });
  },
});
