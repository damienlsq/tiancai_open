cc.Class({
  extends: cc.Component,

  properties: {
    coins: cc.Label, // 物资
    diamonds: cc.Label, // 钻石
    mat: cc.Label,
    staNow: cc.Label,
    staMax: cc.Label,
    matNode: cc.Node,
    staNode: cc.Node,
    nickName: cc.Label,
    totemNode: cc.Node,
    bg: cc.Node,
    bgX: cc.Node,
  },
  // use this for initialization
  onLoad() {
    mbgGame.topUI = this;
    if (mbgGame.sceneName === 'iphoneX') {
      this.bgX.active = true;
      this.bg.active = false;
    } else {
      this.bgX.active = false;
      this.bg.active = true;
    }

    this.lastStaTime = 0;
    const initVal = '0';
    // this.matNode.active = false;
    this.coins.string = initVal;
    this.diamonds.string = initVal;
    this.staNow.string = '0';
    this.staMax.string = '/0';
    this.mat.string = '0';
    emitter.on(this, "updateAttr", this.updateAllAttr);
    emitter.on(this, "updateUserInfo", this.refreshUserInfo);
    mbgGame.preloadRes.itemFlag = cc.instantiate(this.totemNode.children[0]);
    this.totemNode.removeAllChildren();
    this.refreshUserInfo();
  },
  onDestroy() {
    emitter.off(this, "updateAttr");
    emitter.off(this, "updateUserInfo");
  },
  setShow(show) {
    this.node.active = show;
  },
  refreshUserInfo() {
    this.nickName.string = mbgGame.userInfo.nickname || mbgGame.getString('nickNameEmpty');
    mbgGame.managerUi.addIconFlag(this.totemNode, mbgGame.userInfo.totem);
  },

  getOldAttr(name) {
    if (!this.m_OldDict) {
      this.m_OldDict = {};
    }
    return this.m_OldDict[name] || 0;
  },
  addAttr(name, num) {
    if (name === 'sta' || name === 'staMax') {
      if (name === 'sta') {
        const val = this.getOldAttr('sta') + num;
        this.setAttr(name, val, this.getOldAttr('staMax'));
      } else {
        const val = this.getOldAttr('staMax') + num;
        this.setAttr(name, this.getOldAttr('sta'), val);
      }
    } else {
      const val = this.getOldAttr(name) + num;
      this.setAttr(name, val);
    }
  },
  setAttr(name, val, val2) {
    if (name === 'staInfo') {
      this.getOldAttr('sta');
      this.m_OldDict.sta = val;
      this.getOldAttr('staMax');
      this.m_OldDict.staMax = val2;
      this.staNow.string = `${val}`;
      this.staMax.string = `/${val2}`;
    } else {
      this.getOldAttr(name);
      this.m_OldDict[name] = val;
      this[`${name}`].string = mbgGame.smartNum(val);
    }
  },

  updateAllAttr() {
    const coins = mbgGame.player.getCoins();
    this.setAttr('coins', coins);
    const diamonds = mbgGame.player.getDiamonds();
    this.setAttr('diamonds', diamonds);
    const mat = mbgGame.player.getMat();
    this.setAttr('mat', mat);

    const sta = mbgGame.player.getSta();
    const staMax = mbgGame.player.getStaMax();
    this.setAttr('staInfo', sta, staMax);
  },

  clickMail() {
    mbgGame.resManager.loadPrefab('panelMail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelMail');
    });
  },
  clickSetup() {
    // 关闭所有界面再打开设置界面
    emitter.emit('closeMe');
    mbgGame.resManager.loadPrefab('panelSetup', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelSetup');
    });
  },
});
