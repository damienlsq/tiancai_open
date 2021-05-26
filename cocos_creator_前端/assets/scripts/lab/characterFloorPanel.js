const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,
  properties: {
    charaBoard: cc.Node,
    itemBoard: cc.Node,
    charaTemplate: cc.Node,
  },
  onLoad() {
    this.charaTemplate = cc.instantiate(this.charaBoard.children[0]);
    this.charaBoard.removeAllChildren();
    this.initCommon();
  },
  getSceneName() {
    return 'character';
  },
  refreshFloor() {
    this.charaBoard.removeAllChildren();
    for (let charaID = 1; charaID <= 15; charaID++) {
      const node = cc.instantiate(this.charaTemplate);
      this.charaBoard.addChild(node);
      if (mbgGame.player.hasChara(charaID)) {
        mbgGame.resManager.setAutoAtlasFrame(node, 'labIcon', `c${charaID}`);
        node._charaID = charaID;
      } else {
        delete node._charaID;
      }
    }

    // 显示3个最高级的道具
    const _saveCon = mbgGame._itemsSortCondition;
    mbgGame._itemsSortCondition = 'power';
    const sidList = mbgGame.player.getOwnedItemList_Belong();
    mbgGame._itemsSortCondition = _saveCon;
    for (let i = 0; i < this.itemBoard.children.length; i++) {
      const node = this.itemBoard.children[i];
      if (!node) continue;
      const sid = sidList.shift();
      if (!sid) {
        node.active = false;
      } else {
        node.active = true;
        const itemNode = mbgGame.managerUi.getIconItem();
        node.addChild(itemNode);
        itemNode.setScale(0.5, 0.5);
        const com = itemNode.getComponent('itemPanel');
        com.initMe({
          style: 'iconMe',
          sid,
        });
      }
    }
  },
  openCharaInfo(event) {
    if (!event.target._charaID) return;
    mbgGame.managerUi.openWinCharaInfo(event.target._charaID);
  },
  openCharacters() {
    mbgGame.sceneMenu.onClickBtn3();
  },
});