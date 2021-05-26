const facFloorBase = require('facFloorBase');
const labdefines = require('labdefines');

const FacID = labdefines.FacID;

cc.Class({
  extends: facFloorBase,

  properties: {
    collectorNodes: {
      default: [],
      type: cc.Node,
    },
  },
  // use this for initialization
  onLoad() {
    this.m_turnRight = true;
    this.m_FacIDs = _.clone(labdefines.CollectorFacIDs);
    this.initMe();
  },
  getSceneName() {
    return 'collector';
  },
  initMe() {
    this.initCommon();
  },
  refreshFloor(dOption) {
    mbgGame.log("collector refreshFloor");
    for (let i = 0; i < labdefines.CollectorFacIDs.length; i++) {
      const facID = labdefines.CollectorFacIDs[i];
      const n = this.collectorNodes[i];
      const hasFac = mbgGame.player.hasFac(facID);
      if (hasFac) {
        if (dOption && dOption.buildFacID && dOption.buildFacID === facID) {
          this.playBuildFacAni(n);
        }
        n.active = true;
        this.destroyHammer(n);
        this.refreshFacSpine(facID, n);
      } else if (mbgGame.player.isFacUnlocked(facID)) {
        n.active = true;
        this.showHammer(n);
      } else {
        n.active = false;
        this.destroyHammer(n);
      }
    }
  },
  onOpenC1() {
    mbgGame.panelLab.openFacWin(FacID.collector1);
  },
  onOpenC2() {
    mbgGame.panelLab.openFacWin(FacID.collector2);
  },
  onOpenC3() {
    mbgGame.panelLab.openFacWin(FacID.collector3);
  }
});