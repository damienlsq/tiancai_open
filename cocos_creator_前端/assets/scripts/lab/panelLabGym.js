const labdefines = require('labdefines');

cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.Node,
  },

  onLoad() {
    // 保存模版
    this.itemTemplate = this.content.children[0];
    this.content.removeAllChildren();
  },
  onDestroy() {
    if (this.npcCom && this.npcCom.node && this.npcCom.node.isValid) {
      if (this.npcCom._Agree) {
        this.npcCom.holeOut();
      } else {
        this.npcCom.resumeNow();
      }
    }
  },
  onAddBaseWin(npcCom) {
    if (npcCom && npcCom.node && npcCom.node.isValid) {
      this.npcCom = npcCom;
      npcCom.stopNow();
    }
    this.node._winTooltips = mbgGame.getString('tooltips_gymDesc');
    this.node._winBase.setTitle(mbgGame.getString('facnameGym'));

    for (let i = 0; i < labdefines.GymFacIDs.length; i++) {
      const facID = labdefines.GymFacIDs[i];
      if (!mbgGame.player.hasFac(facID)) continue;
      const node = cc.instantiate(this.itemTemplate);
      this.content.addChild(node);
      this.initDev(node, facID);
    }
  },
  initDev(node, facID) {
    const bg = cc.find('bg', node);
    const btn = cc.find('itemBtn', node);
    btn.m_FacID = facID;
    mbgGame.resManager.setImageFrame(bg, 'images', `facbg_${facID}`);
    const charaPos = cc.find('charaPos', bg);
    const charaID = mbgGame.player.getCharaIDByFacID(facID);
    if (charaID) {
      // 添加角色
      const chara = cc.instantiate(mbgGame.preloadRes.floorCharacter);
      charaPos.addChild(chara);
      const com = chara.getComponent("floorCharacter");
      if (charaID <= 15) {
        com.onCreated({
          charaID,
          mode: 'normal',
          actionList: [{ action: 'normal', weight: 100 }],
        });
      } else {
        com.onCreated({
          mTplID: charaID,
          spineName: mbgGame.config[`mtpl${charaID}`].spine,
          charaID,
          mode: 'stand',
          actionList: [{ action: 'stand', weight: 100 }],
        });
      }
      btn.getComponent('itemBtn').setStatus(false, mbgGame.getString('facFull'));
    }
    btn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('recommond'));
  },

  onRecommond(event) {
    if (!event.target || !event.target.isValid) return;
    const facID = event.target.m_FacID;

    if (!mbgGame.panelLab) {
      mbgGame.sceneMenu.createPage1();
    }

    if (this.npcCom && this.npcCom._squareNPCID) {
      mbgGame.panelLab.addCharaToFac(facID, this.npcCom._squareNPCID, null, () => {
        if (this.npcCom && this.npcCom.node && this.npcCom.node.isValid) {
          this.npcCom._Agree = true;
        }
        emitter.emit('closeMe');
      });
    } else {
      mbgGame.resManager.loadPrefab('panelLabJobDetail', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addFullWin(node, 'panelLabJobDetail', 0, facID);
      });
    }
  },
});