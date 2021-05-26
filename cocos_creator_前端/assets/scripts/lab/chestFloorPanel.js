const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,

  properties: {
    chestContainer: cc.Node,
  },
  // use this for initialization
  onLoad() {
    this.chestTemplate = cc.instantiate(this.chestContainer.children[0]);
    this.chestContainer.removeAllChildren();
    this.initMe();
    emitter.on(this, "refreshChestInfo2", this.onRefreshChestInfo.bind(this));
  },
  getSceneName() {
    return '';
  },
  getChestInfoLabel() {
    if (!this.chestInfo) {
      this.chestInfo = this.node.getChildByName("chestInfo").getComponent(cc.Label);
    }
    return this.chestInfo;
  },
  initMe() {
  },
  onRefreshChestInfo() {
    const chestInfo = this.getChestInfoLabel();
    if (mbgGame.player.isUnlockingBattleChest()) {
      const lefttime = mbgGame.player.getBattleChestLefttime(mbgGame.player.getUnlockingBattleChestID());
      if (lefttime <= 0) {
        chestInfo.string = mbgGame.getString('recvchest');
      } else {
        chestInfo.string = mbgGame.transTime(lefttime);
      }
    } else {
      chestInfo.string = '';
    }
  },
  refreshFloor() {
    this.refreshAllChest();
    this.onRefreshChestInfo();
  },
  getChest(idx) {
    return this.m_Chests && this.m_Chests[idx];
  },
  refreshAllChest() {
    this.m_Chests = this.m_Chests || {};
    for (let i = 0; i < mbgGame.player.getBattleLabChestLimit(); i++) {
      if (!this.m_Chests[i]) {
        const obj = cc.instantiate(this.chestTemplate);
        this.chestContainer.addChild(obj);
        this.m_Chests[i] = obj.getComponent("itemBattleChest");
      }
      this.m_Chests[i].refreshChestInfo(i, "lab");
    }
  },
});