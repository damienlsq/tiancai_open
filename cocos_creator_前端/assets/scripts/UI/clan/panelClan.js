cc.Class({
  extends: cc.Component,

  properties: {
    uiLayer1: cc.Node,
    uiLayer2: cc.Node,
    uiLayer3: cc.Node,
    btn1: cc.Node,
    btn2: cc.Node,
    btnsFoot: cc.Sprite,
    btn1Label: cc.Label,
    btn2Label: cc.Label,

    tabsNode: cc.Node,
  },
  onLoad() {
    this.refreshClan();
    emitter.on(this, 'refreshClan', this.refreshClan);
  },
  onDestroy() {
    emitter.off(this, 'refreshClan');
  },
  setBtnMode(mode) {
    this._btnMode = mode;
    switch (mode) {
      case 'noClan':
        this.btn1Label.string = mbgGame.getString('clanSearch');
        this.btn2Label.string = mbgGame.getString('clanNew');
        break;
      case 'hasClan':
        this.btn1Label.string = mbgGame.getString('clanCommunity');
        this.btn2Label.string = mbgGame.getString('clanShop');
        break;
      default:
        break;
    }
  },
  clickBtn1() {
    this.uiLayer1.active = true;
    this.uiLayer2.active = false;
    this.uiLayer3.active = false;
    this.btnsFoot.node.active = false;
    if (this.uiLayer1.children.length) return;
    if (this._btnMode === 'noClan') {
      // 搜索
      mbgGame.resManager.loadPrefab('clanSearch', (prefab) => {
        const node = cc.instantiate(prefab);
        this.uiLayer1.addChild(node);
      });
    } else if (this._btnMode === 'hasClan') {
      // 事件
      mbgGame.resManager.loadPrefab('clanEvent', (prefab) => {
        const node = cc.instantiate(prefab);
        this.uiLayer1.addChild(node);
        this._eventCom = node.getComponent('clanEvent');
        this.onOpened();
      });
    }
  },
  clickBtn2() {
    this.uiLayer2.active = true;
    this.uiLayer1.active = false;
    this.uiLayer3.active = false;
    if (this.uiLayer2.children.length) {
      this.btnsFoot.node.active = this._btnMode === 'noClan';
      // 刷新黑市商品
      emitter.emit("timeVarUpdate");
      return;
    }
    if (this._btnMode === 'noClan') {
      // 创建
      mbgGame.resManager.loadPrefab('clanCreate', (prefab) => {
        const node = cc.instantiate(prefab);
        this.uiLayer2.addChild(node);
        this.btnsFoot.node.active = true;
      });
    } else if (this._btnMode === 'hasClan') {
      // 联盟商人
      mbgGame.resManager.loadPrefab('clanMarket', (prefab) => {
        const node = cc.instantiate(prefab);
        this.uiLayer2.addChild(node);
        this.btnsFoot.node.active = false;
        // 刷新黑市商品
        emitter.emit("timeVarUpdate");
      });
    }
  },
  clickBtn3() {
    this.uiLayer3.active = true;
    this.uiLayer1.active = false;
    this.uiLayer2.active = false;
    this.btnsFoot.node.active = true;
    mbgGame.resManager.loadPrefab('clanRank', (prefab) => {
      const node = cc.instantiate(prefab);
      this.uiLayer3.addChild(node);
    });
  },
  refreshClan() {
    // mbgGame.log('refreshClan',mbgGame.hasClan);
    this.uiLayer1.removeAllChildren();
    this.uiLayer2.removeAllChildren();
    if (mbgGame.hasClan) {
      this.setBtnMode('hasClan');
      this.clickBtn1();
    } else {
      this.setBtnMode('noClan');
      this.clickBtn1();
    }
  },
  onOpened() {
    // 点击按钮进来查看
    if (this._eventCom && this.uiLayer1.active) {
      // 手动点来开就取消红点
      emitter.emit("redTips", 'clanOff');
      // 缓存检查
      mbgGame.getCache('clan.clanEvents', 60);
      this._eventCom.refreshList();
    }
  },
});
