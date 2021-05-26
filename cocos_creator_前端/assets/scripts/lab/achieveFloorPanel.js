const facFloorBase = require('facFloorBase');
const labdefines = require('labdefines');
const warDefines = require('warDefines');

cc.Class({
  extends: facFloorBase,
  properties: {
    redTipAchieve: cc.Node,

    labLevel: cc.Label,

    medalShelf: cc.Node,
    devices: sp.Skeleton,
  },
  onLoad() {
    this.redTipAchieve.active = false;
    this.initMe();
    emitter.on(this, "refreshAchieve", this.checkAchieve);
    const lv = mbgGame.player.getLabLv();
    if (!lv) {
      this.labLevel.string = '';
    } else {
      this.labLevel.string = `${lv}${mbgGame.getString('lv')}`;
    }
    this.medalShelf.children.forEach((x) => { x.active = false; });
    this.redTipAchieve.active = false;

    cc.loader.loadRes(`spine/achieveFloorSpine`, sp.SkeletonData, (err, d) => {
      this.devices.skeletonData = d;
      this.devices.setAnimation(0, 'animation', true);
    });
  },
  getSceneName() {
    return 'achieve';
  },
  initMe() {
    this.initCommon();
    this.checkAchieve();
  },
  checkAchieve() {
    if (!mbgGame.panelLab || mbgGame.panelLab.getFloorStatus(this, labdefines.FloorType.Achieve) !== 0) return;
    const data = mbgGame.getCache('player.achieveinfo');
    // mbgGame.log('[refreshAchieveList]',data);
    if (!data) {
      mbgGame.checkNetCache('player.achieveinfo', this.checkAchieve.bind(this));
      this.redTipAchieve.active = false;
      return;
    }
    let redOn = false;
    _.mapKeys(data.achieve, (dData, achieveID) => {
      const dStatData = data.stat;
      const dConfig = mbgGame.config[`achieve${achieveID}`];
      if (!dConfig) {
        return;
      }
      const maxLv = dConfig.maxLv;
      const lv = dData.lv || 0;
      if (lv >= maxLv) {
        return;
      }
      const statID = mbgGame.player.getStatID(dConfig.StatName);
      const percent = Math.min(1, (dStatData[statID] || 0) / dConfig.values[lv]);
      if (percent >= 1) {
        redOn = true;
      }
    });
    this.redTipAchieve.active = redOn;

    const maxPoints = _.keys(data.achieve).length * 5;
    const total = mbgGame.player.getTotalSkillStars();
    const medalsCount = this.medalShelf.children.length;
    const oneRank = Math.floor(maxPoints / medalsCount);
    // mbgGame.log('checkAchieve:', total, maxPoints, medalsCount, oneRank);

    cc.find('medal1', this.medalShelf).active = total > 0;
    for (let i = 2; i <= medalsCount - 1; i++) {
      const node = cc.find(`medal${i}`, this.medalShelf);
      if (node) {
        if (total > oneRank * i) {
          node.active = true;
        } else {
          node.active = false;
        }
      }
    }
    // 最后一个
    cc.find(`medal${medalsCount}`, this.medalShelf).active = total === maxPoints;
  },
  refreshFloor() {
    this.checkAchieve();
  },

  openAchieve(mode) {
    mbgGame.resManager.loadPrefab('panelAchievement', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'panelAchievement', mode);
    });
  },

  clickPlayerAchieve() {
    if (!mbgGame.player.hasFinishPlot(4)) {
      return;
    }
    this.openAchieve('achieve');
  },

  clickPlayerStat() {
    if (!mbgGame.player.hasFinishPlot(4)) {
      return;
    }
    this.openAchieve('stat');
  },

  onLabInfo() {
    this.openAchieve('lab');
  },
});