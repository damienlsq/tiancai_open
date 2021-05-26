const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,

  properties: {
    facID1: 0,
    facID2: 0,
    gymNodes: {
      type: cc.Node,
      default: [],
    },
  },
  // use this for initialization
  onLoad() {
    this.m_FacIDs = [this.facID1, this.facID2];
    this.initMe();
  },
  getSceneName() {
    return 'gym';
  },
  initMe() {
    this.initCommon();
  },
  refreshFloor(dOption) {
    for (let i = 0; i < this.m_FacIDs.length; i++) {
      const facID = this.m_FacIDs[i];
      if (dOption && dOption.targetFacID && facID !== dOption.targetFacID) {
        continue;
      }
      const n = this.gymNodes[i];
      const hasFac = mbgGame.player.hasFac(facID);
      if (hasFac) {
        if (dOption && dOption.buildFacID && dOption.buildFacID === facID) {
          this.playBuildFacAni(n);
        }
        n.active = true;
        this.destroyHammer(n);
        this.refreshFacSpine(facID, n, dOption && dOption.resetFac);
      } else if (mbgGame.player.isFacUnlocked(facID)) {
        n.active = true;
        this.showHammer(n);
      } else {
        n.active = false;
        this.destroyHammer(n);
      }
    }
  },
  onOpenGym1() {
    mbgGame.panelLab.openFacWin(this.facID1);
  },
  onOpenGym2() {
    mbgGame.panelLab.openFacWin(this.facID2);
  },
});