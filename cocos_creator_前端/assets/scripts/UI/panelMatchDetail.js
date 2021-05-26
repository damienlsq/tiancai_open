const warDefines = require('warDefines');

cc.Class({
  extends: cc.Component,
  properties: {
    btnLeft: cc.Node,
    btnRight: cc.Node,
    atkNode: cc.Node,
    defNode: cc.Node,
    atkName: cc.Label,
    defName: cc.Label,
    title: cc.RichText,
    desc: cc.RichText,
    continueTips: cc.Node,
    btnReplay: cc.Node,
  },
  onDestroy() {
    delete this.m_itemGamble;
    delete this.m_MatchUUID;
    delete this.m_MatchData;
  },
  onAddBaseWin(matchType, matchUUID, dMatchData, itemGamble) {
    this.m_itemGamble = itemGamble;
    const newMatch = matchUUID !== this.m_MatchUUID;
    this.m_MatchUUID = matchUUID;
    this.m_MatchData = dMatchData;
    this.continueTips.runAction(cc.sequence(cc.fadeTo(1.0, 100), cc.fadeIn(1.0)).repeatForever());
    this.title.string = mbgGame.getString(`title_match${matchType}`);
    this.desc.string = mbgGame.getString(`matchdesc${matchType}`);
    if (!newMatch) {
      return;
    }
    this.atkName.string = itemGamble.leftPlayerName.string;
    this.defName.string = itemGamble.rightPlayerName.string;
    this.btnLeft.active = true;
    this.btnRight.active = true;
    if (this.m_MatchData.d) { // 已下注
      this.btnLeft.getComponent('itemBtn').setStatus(false, '已下注');
      this.btnRight.getComponent('itemBtn').setStatus(false, '已下注');
    }
    this.btnReplay.active = this.m_MatchData.e !== 1;
    const sidList = mbgGame.player.getItemsCanGamble(matchType);
    if (sidList.length < 1) {
      // 没有可堵道具
      this.btnLeft.getComponent('itemBtn').setStatus(false, '你没有道具可以参与');
      this.btnRight.getComponent('itemBtn').setStatus(false, '你没有道具可以参与');
    }
    this.initTeamInfo(warDefines.TEAM_LEFT, this.atkNode);
    this.initTeamInfo(warDefines.TEAM_RIGHT, this.defNode);
  },
  getTeamData(iTeam) {
    return iTeam === warDefines.TEAM_LEFT ? this.m_MatchData.b.left : this.m_MatchData.b.right;
  },
  initTeamInfo(iTeam, teamInfoNode) {
    const data = this.getTeamData(iTeam);
    // const playerTotem = teamInfoNode.getChildByName("totem");
    // mbgGame.managerUi.addIconFlag(playerTotem, data.totem || 0);

    for (let i = 0; i < data.charaIDs.length; i++) {
      const charaID = data.charaIDs[i];
      if (!charaID) {
        continue;
      }
      const charaNode = teamInfoNode.children[i];
      let node = mbgGame.managerUi.getIconCharacter();
      let com = node.getComponent('iconCharacter');
      com.initMe({
        charaID,
        lv: data.lv[i],
      });
      node._iTeam = iTeam;
      node._charaID = charaID;
      com.addButton(this, 'panelMatchDetail', 'onSelectChara');
      charaNode.getChildByName('chara').addChild(node);

      if (data.item && data.item[i]) {
        node = mbgGame.managerUi.getIconItem();
        com = node.getComponent('itemPanel');
        com.initMe({
          itemData: data.item[i],
          style: 'preview',
        });
        charaNode.getChildByName('item').addChild(node);
      }
    }
  },
  onStakeLeft() {
    this.node._winBase.closeMe();
    this.m_itemGamble.onStakeLeft();
  },
  onStakeRight() {
    this.node._winBase.closeMe();
    this.m_itemGamble.onStakeRight();
  },
  onReplay() {
    if (mbgGame.getLock('net', 'gamble.replay')) {
      return;
    }
    mbgGame.setLock('net', 'gamble.replay');
    // mbgGame.log("onReplay");
    mbgGame.netCtrl.sendMsg("gamble.replay", {
      uuid: this.m_MatchUUID,
    }, (data) => {
      mbgGame.log("onReplay data", data);
      mbgGame.clearLock('net', 'gamble.replay');
      if (data.code === "ok") {
        mbgGame.player.setReplayType("gamblepreview");
      } else {
      }
    });
  },
  onSelectChara(event) {
    const iTeam = event.target._iTeam;
    const charaID = event.target._charaID;
    const data = this.getTeamData(iTeam);
    const dCharaInfo = data.info && data.info[charaID];
    if (!dCharaInfo) {
      return;
    }
    dCharaInfo.itemData = data.item[data.charaIDs.indexOf(charaID)];
    mbgGame.managerUi.openWinCharaInfo(charaID, {
      charaData: dCharaInfo,
    });
  },
});