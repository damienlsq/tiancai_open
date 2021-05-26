cc.Class({
  extends: cc.Component,

  properties: {
    bg: cc.Node,
    bgX: cc.Node,

    iconSelect0: cc.Node,
    iconSelect1: cc.Node,
    iconSelect2: cc.Node,
    iconSelect3: cc.Node,
    iconSelect4: cc.Node,
    iconSelect5: cc.Node,
    btnShop: cc.Node,
    btnShopTimeLimit: cc.Node,
    btnPack: cc.Node,

    panelLayer: cc.Node,
    panelBg: cc.Sprite,

    redTipNode: {
      default: [],
      type: cc.Node,
    },
    btnNodes: {
      default: [],
      type: cc.Node,
    },
  },
  // use this for initialization
  onLoad() {
    mbgGame.sceneMenu = this;
    this.redTipNode.map((x) => {
      x.active = false;
      return true;
    });

    this.setShowPack(true);
    this.isBossNow = {};

    emitter.on(this, "setflag", this.checkButton);

    if (mbgGame.sceneName === 'iphoneX') {
      this.bgX.active = true;
      this.bg.active = false;
    } else {
      this.bgX.active = false;
      this.bg.active = true;
    }
    this.setRedtips(mbgGame.PageSquare, false);
    this.scheduleOnce(this.checkZhengBa, 1);
    this.scheduleOnce(this.checkStory, 1);
    emitter.on(this, "nocachedmsg", this.onNoCachedMsg);

    this.btnShopTimeLimit.active = false;
  },
  initMe() {
    mbgGame.log("sceneMenu initMe");
    this.checkButton();
    // 检查是否需要播放开机剧情
    const type = mbgGame.player.checkNewbiePlot();
    if (type) {
      // 初始化的时候就有开机剧情，先出黑幕
      if (type === 'war') mbgGame.warMgr.setBlack();
      if (type === 'lab') this.showPanel('panelLab');
      return;
    }
    mbgGame.player.checkTeach();
    this.showPanel('panelSquare');
    this.refreshShopItemList();
  },
  onNoCachedMsg() {
    mbgGame.player.checkTeach();
  },
  checkZhengBa() {
    if (mbgGame.panelSquare) {
      mbgGame.panelSquare.checkRedTip();
    }
    const data = mbgGame.getCache('arena.rank');
    if (data) {
      this.setRedtips(mbgGame.PageSquare, data.diamonds > 0);
    } else {
      mbgGame.checkNetCache('arena.rank', this.checkZhengBa.bind(this));
    }
  },
  checkStory() {
    // 剧情，有宝箱已开，但未领取
    let redOn = false;
    const worldIdx = 6;
    for (let chapterID in mbgGame.config.chapter) {
      chapterID = +chapterID;
      const dChapterData = mbgGame.config.chapter[chapterID];
      const starCount = mbgGame.player.getStoryStageStarCount(chapterID, worldIdx);
      this.m_chestIdx = null;
      for (let i = 0; i < 3; i++) {
        const s = dChapterData.stars[i];
        if (starCount > 0 && starCount >= s) {
          const dWorld = mbgGame.player.getWorldDataByIdx(worldIdx);
          const chapterIdx = chapterID % 1000;
          if (!(dWorld.c && dWorld.c[chapterIdx] && dWorld.c[chapterIdx][i])) {
            redOn = true;
            break;
          }
        }
      }
      if (redOn) {
        break;
      }
    }

    this.setRedtips(mbgGame.PageStory, redOn);
  },

  checkButton() {
    // 刷新按钮状态
    // this.btnNodes[0].getChildByName("icon").getComponent('itemBtn').setStatus(mbgGame.player.isClanUnlocked(), '未解锁');
    this.btnNodes[4].getChildByName("icon").getComponent('itemBtn').setStatus(mbgGame.player.isClanUnlocked(), mbgGame.getString('locked_clan'));
    // this.btnNodes[4].getChildByName("icon").getComponent(cc.Button).interactable = mbgGame.player.isClanUnlocked();
  },
  setRedtips(idx, b) {
    this.redTipNode[idx].active = b;
  },

  setShowPack(show) {
    if (show) {
      this.btnPack.opacity = 255;
    } else {
      this.btnPack.opacity = 64;
    }
  },

  refreshShopItemList(iapItemNonePercent) {
    // 判断是否有免费商品领取
    this.setRedtips(mbgGame.PageShop, false);

    const data = mbgGame.getCache('shop.list', 60);
    // mbgGame.log('[refreshShopItemList]',data);
    if (!data) {
      const sendData = {};
      if (iapItemNonePercent) {
        // 不出现特惠的概率
        sendData.p1 = iapItemNonePercent;
      }
      mbgGame.checkNetCache('shop.list', this.refreshShopItemList.bind(this), sendData);
      return;
    }

    let isNeedRedTip = false;
    let checkTime = 0;
    const now = moment().unix();
    let iapItem;
    _.forEach(data, (v) => {
      if (v.inPreiod === 1) {
        isNeedRedTip = true;
      }
      if (v.act === 'iapitem') {
        iapItem = v;
      }
      if (v.unit || v.act === 'video' || !v.limit) return;
      if (!v.outDate) {
        isNeedRedTip = true;
      } else if (v.outDate < now) {
        isNeedRedTip = true;
      } else if (checkTime === 0) {
        checkTime = v.outDate - now;
      } else if (checkTime > v.outDate - now) {
        checkTime = v.outDate - now;
      }
    });
    mbgGame.IAP.iapQuery(data);

    this.setRedtips(mbgGame.PageShop, isNeedRedTip);
    if (checkTime) {
      this.scheduleOnce(() => {
        this.setRedtips(mbgGame.PageShop, true);
      }, checkTime);
    }
    if (iapItem) {
      mbgGame.resManager.setAutoAtlasFrame(this.btnShop, 'uiIcon', 'navShop');
      this.btnShopTimeLimit.active = true;
      if (iapItem.iapItemData) {
        const iapOutDate = iapItem.iapItemData.outDate;
        let timeCom = this.btnShopTimeLimit.getComponent('effectTimerString');
        if (!timeCom) {
          timeCom = this.btnShopTimeLimit.addComponent('effectTimerString');
        }
        timeCom.initMe({
          endTime: iapOutDate,
          interval: 1,
        });
      }
    } else {
      this.btnShopTimeLimit.active = false;
    }
    if (mbgGame.panelShop) {
      mbgGame.panelShop.refreshMe();
    }
  },

  onClickBtn0() {
    this.showPanel('panelSquare');
  },
  onClickBtn1() {
    this.showPanel('panelLab');
  },
  onClickBtn2() {
    this.showPanel('panelStory');
  },
  onClickBtn3() {
    this.showPanel('panelCharacters');
    // 打开页面就取消红点
    this.setRedtips(mbgGame.PageChara, false);
  },
  onClickBtn4() {
    this.showPanel('panelClan');
    mbgGame.sceneMenu.setRedtips(mbgGame.PageClan, false);
  },
  onClickBtn5() {
    this.showPanel('panelShop');
    mbgGame.sceneMenu.refreshShopItemList();
  },

  setBtnBg() {
    this.iconSelect0.active = false;
    this.iconSelect1.active = false;
    this.iconSelect2.active = false;
    this.iconSelect3.active = false;
    this.iconSelect4.active = false;
    this.iconSelect5.active = false;

    // console.log('this._panelIdx:', this._panelIdx);
    if (mbgGame.sceneName === 'iphoneX') {
      mbgGame.resManager.setAutoAtlasFrame(this[`iconSelect${this._panelIdx}`], 'uiIcon', 'btnBgSelectedX');
    }
    this[`iconSelect${this._panelIdx}`].active = true;
  },
  curPageIdx() {
    return this._panelIdx; // todo 准备去掉
  },
  showPanel(name) {
    if (!mbgGame.preloadRes[name]) {
      mbgGame.managerUi.floatMessage(mbgGame.getString('waitStr_res'));
      return;
    }
    mbgGame.performanceCheck(name, '1', true);

    const names = ['panelSquare', 'panelLab', 'panelStory', 'panelCharacters', 'panelClan', 'panelShop'];
    let contentNode;
    for (let i = 0; i < names.length; i++) {
      const node = cc.find(names[i], this.panelLayer);
      if (name === names[i]) {
        // 显示
        node.active = true;
        contentNode = node;
        this._panelIdx = i;
      } else {
        node.active = false;
      }
    }
    const pageBg = ['bgSquare', 'black', 'bgStory', 'bgChara', 'bgClan', 'bgShop'];
    if (pageBg[this._panelIdx]) {
      mbgGame.resManager.setImageFrame(this.panelBg, 'images', pageBg[this._panelIdx]);
      if (this._panelIdx === 1) {
        this.panelBg.type = cc.Sprite.Type.SLICED;
        this.panelBg.sizeMode = cc.Sprite.SizeMode.CUSTOM;
      } else {
        this.panelBg.type = cc.Sprite.Type.SIMPLE;
        this.panelBg.sizeMode = cc.Sprite.SizeMode.RAW;
      }
    }
    this.setBtnBg();
    let panelCom = mbgGame[name];
    if (!panelCom) {
      const node = cc.instantiate(mbgGame.preloadRes[name]);
      contentNode.addChild(node);
      panelCom = node.getComponent(name);
      mbgGame[name] = panelCom;
    }
    panelCom.onOpened();
    mbgGame.resManager.playMusic("battleLoop1", true);
    mbgGame.performanceCheck(name, 'finish');
  },

});