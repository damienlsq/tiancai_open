const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,
  properties: {
    devices: sp.Skeleton,
  },
  onLoad() {
    this.initCommon();
    cc.loader.loadRes(`spine/clanDevices`, sp.SkeletonData, (err, d) => {
      this.devices.skeletonData = d;
      this.devices.setAnimation(0, 'animation', true);
    });
  },
  getSceneName() {
    return 'clan';
  },
  refreshFloor() {
    /*
    if (mbgGame.player.isClanUnlocked()) {
      this.memberVisit('refresh');
    }
    */
  },

  memberVisit(param) {
    if (!mbgGame.hasClan) return;
    if (param === 'refresh') {
      if (!this._schedule_memberVisit_ON) {
        this.schedule(this.memberVisit.bind(this), 15 + _.random(30), cc.macro.REPEAT_FOREVER);
        this._schedule_cmemberVisit_ON = true;
      }
      return;
    }
    const clanData = mbgGame.getCache('clan.clanInfo');
    if (!clanData) {
      mbgGame.checkNetCache('clan.clanInfo');
      return;
    }

    const charaIDs = [];
    clanData.members.forEach((x) => {
      if (x.tC) charaIDs.push(x.tC);
    });
    // mbgGame.log('memberVisit:', clanData, charaIDs);
    if (charaIDs.length < 1) return;

    // 20%概率出现
    if (_.random(100) > 20) return;
    const now = moment().unix();
    if (this._lastVisitTime && now - this._lastVisitTime < 15) {
      // 15秒内不会出重复出
      return;
    }
    this._lastVisitTime = now;

    const charaID = _.sample(charaIDs);
    const actionOnceList = [];
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'say', type: "rant" }]));
    actionOnceList.push({ action: 'move' });
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'say', type: "rant" }, { action: 'move' }]));
    actionOnceList.push(_.sample([{ action: 'normal' }, { action: 'move' }]));
    actionOnceList.push({ action: 'move' });
    actionOnceList.push({ action: 'transferOut' });
    const options = {
      charaID,
      mode: 'actionList',
      firstAction: 'transferIn',
      scene: this.getSceneName(),
      sceneCom: this,
      actionOnceList,
      speed: 2,
      clickDisable: true,
      posX: this.getPosXByPosID('Visit'),
    };

    // mbgGame.log('characterVisit', charaID, options);
    const com = this.addCharacter(options);
    com.setClickLayerEnabled(false);
  },

  openClan() {
    mbgGame.sceneMenu.onClickBtn4();
  },
});