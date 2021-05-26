const facFloorBase = require('facFloorBase');
const labdefines = require('labdefines');

cc.Class({
  extends: facFloorBase,
  properties: {
    talentBtn: cc.Node,
    spinepos: cc.Node,
  },
  // use this for initialization
  onLoad() {
    this.initMe();
    // this.schedule(this.randNPC, 17, cc.macro.REPEAT_FOREVER);
    const node = new cc.Node();
    node.addComponent(sp.Skeleton);
    const so = node.addComponent("spineObject");
    this.spinepos.addChild(node);
    so.onSpineLoad = function () {
      this.doAction(`animation`, true);
    };
    so.loadSpine('electricHouse');
  },
  initMe() {
    this.initCommon();
  },
  refreshFloor() {
    this.talentBtn.active = mbgGame.player.hasFloor(3);
  },
  clickTalent() {
    mbgGame.resManager.loadPrefab('panelTalent', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelTalent');
    });
  },
  getSceneName() {
    return 'talent';
  },

  // 保留
  randNPC() {
    if (_.random(100) > 5) return;
    if (mbgGame.panelLab.getFloorStatus(this, labdefines.FloorType.Talent) !== 0) return;
    if (this._npc) return;
    const npcID = _.sample([1007, 1008, 1012, 1013, 1014, 1015, 1016,
      1025, 1026, 1027, 1028, 1029, 1030, 1031, 2001, 2013, 2021, 2023, 2024, 2025, 2026,
      3022, 3017, 3013]);
    this._npc = this.addCharacter({
      mTplID: npcID,
      charaID: npcID,
      spineName: mbgGame.config[`mtpl${npcID}`].spine,
      scene: this.getSceneName(),
      sceneCom: this,
      mode: 'actionList',
      clickDisable: true,
      posX: 'randX',
      firstAction: 'holeIn',
      actionList: [
        { action: 'stand', weight: 50 },
        { action: 'say', weight: 50, type: "rant" },
      ],
    });

    this.scheduleOnce(() => {
      this._npc.holeOut();
      delete this._npc;
    }, 10 + _.random(30));
  },
});