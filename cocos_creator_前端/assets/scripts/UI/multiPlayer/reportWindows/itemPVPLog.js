cc.Class({
  extends: cc.Component,

  properties: {
    me: cc.Node,
    target: cc.Node,
    share: cc.Node,

    timeNode: cc.Node,
    winIcon: cc.Sprite,
    winScore: cc.Node,
    winColor: '#123456',
    loseColor: '#123456',
  },
  initMe(dRecord) {
    // mbgGame.log('dRecord', dRecord);
    dRecord.name = mbgGame.userInfo.nickname;
    dRecord.totem = mbgGame.userInfo.totem;
    this.m_replayUUID = dRecord.replayUUID;

    if (dRecord.result === 1) {
      this.winScore.color = mbgGame.hex2color(this.winColor);
      mbgGame.setLabel(this.winScore, `+${dRecord.addScore}`);
    } else if (dRecord.result === 2) {
      this.winScore.color = mbgGame.hex2color(this.loseColor);
      mbgGame.setLabel(this.winScore, `-${Math.abs(dRecord.addScore)}`);
    } else {
      this.winScore.active = false;
    }

    if (dRecord.result === 1) {
      mbgGame.resManager.setImageFrame(this.winIcon, 'images', 'pvpLogWin');
    } else if (dRecord.result === 2) {
      mbgGame.resManager.setImageFrame(this.winIcon, 'images', 'pvpLogLost');
    } else {
      mbgGame.resManager.setImageFrame(this.winIcon, 'images', 'pvpLogDraw');
    }

    mbgGame.setLabel(this.timeNode, mbgGame.formatTime(dRecord.time / 1000));

    if (mbgGame.hasClan) {
      this.share.active = true;
    } else {
      this.share.active = false;
    }
    if (dRecord.type === 1) {
      // 进攻别人
      this.updateTeam(this.me, dRecord);
      this.updateTeam(this.target, dRecord.target);
    } else {
      // 防守别人
      this.updateTeam(this.me, dRecord.target);
      this.updateTeam(this.target, dRecord);
    }
  },

  updateTeam(node, data) {
    mbgGame.setLabel(cc.find('name', node), data.name || '');
    mbgGame.setLabel(cc.find('score/labelScore', node), data.score || '0');
    mbgGame.managerUi.addIconFlag(cc.find('totem', node), data.totem || 0);

    const teamNode = cc.find('team', node);
    for (let i = 0; i < data.charaIDs.length; i++) {
      const charaID = data.charaIDs[i];
      const iconNode = teamNode.children[i];
      if (!charaID) {
        iconNode.active = false;
        continue;
      }
      iconNode.active = true;
      if (!iconNode.charaCom) {
        const charaNode = mbgGame.managerUi.getIconCharacter();
        charaNode.setScale(0.68, 0.68);
        iconNode.addChild(charaNode);
        iconNode.charaCom = charaNode.getComponent('iconCharacter');
      }
      iconNode.charaCom.initMe({
        charaID,
        lv: data.lv[i],
      });
    }
  },

  onReplay() {
    mbgGame.player.doReplay(this.m_replayUUID, "pvplog");
  },
  onShare() {
    mbgGame.player.doShareWar(this.m_replayUUID);
  },

});