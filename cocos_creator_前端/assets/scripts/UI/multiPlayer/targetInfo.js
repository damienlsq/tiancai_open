cc.Class({
  extends: cc.Component,

  properties: {
    nameLabel: cc.Label,
    scoreLabel: cc.Label,
    fightBtn: cc.Node,
    iconPanelNode: cc.Node,
    iconPlayer: cc.Node,
    iconResult: cc.Sprite,
    iconCharaScale: 0.7,
  },
  // use this for initialization
  onLoad() {
    this.charaList = [];
    for (let i = 0; i < 5; i++) {
      const icon = mbgGame.managerUi.getIconCharacter();
      icon.setScale(this.iconCharaScale, this.iconCharaScale);
      this.iconPanelNode.addChild(icon);
      // icon.width *= this.iconCharaScale;
      // icon.hight *= this.iconCharaScale;
      this.charaList.push(icon);
    }
    emitter.on(this, "zhengbaUpdateFlag", this.updateFlag);
  },
  onDestroy() {
    emitter.off(this, "zhengbaUpdateFlag");
  },
  onRealFight(idx) {
    mbgGame.warMgr.tryBeginWar(() => {
      mbgGame.netCtrl.sendMsg("arena.beginPVP", {
        defenderIdx: idx,
        schemeIdx: mbgGame.player.getSavedSchemeIdx('pvpwar'),
      }, (data) => {
        mbgGame.log("[beginPVP]", data);
        if (data.code === "ok") {
        } else {
          mbgGame.managerUi.floatMessage(data.err);
        }
      });
    });
  },
  onFight() {
    if (this.m_Idx == null) return;
    mbgGame.managerUi.openSchemeTeamEditor({
      wartype: 'pvpwar',
      worldIdx: 99,
      finishCB: () => {
        this.onRealFight(this.m_Idx);
      },
    });
  },
  updateFlag() {
    const idx2flag = mbgGame.player.getPVPFlag();
    const flag = idx2flag && idx2flag[this.m_Idx];
    if (flag === 1) {
      this.fightBtn.active = false;
      this.iconResult.node.active = true;
      mbgGame.resManager.setAutoAtlasFrame(this.iconResult, 'uiIcon', 'pvpWin');
    } else {
      this.fightBtn.active = true;
      this.iconResult.node.active = false;
    }
  },
  initMe(zhengbaCom, idx, dData) {
    this.m_Idx = idx;
    if (!dData) {
      this.node.active = false;
    } else {
      this.node.active = true;
      this.updateFlag();
      this.nameLabel.string = dData.name || "";
      this.scoreLabel.string = `${dData.score || "0"}`;
      mbgGame.managerUi.addIconFlag(this.iconPlayer, dData.totem);
      for (let i = 0; i < 5; i++) {
        const charaID = dData.charaIDs[i];
        const dChara = dData.team[charaID];
        const com = this.charaList[i].getComponent('iconCharacter');
        com.initMe({
          charaID,
          lv: dChara ? dChara.lv : 0,
        });
      }
    }
  },
});