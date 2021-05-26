const spineCtrl = require('spineCtrl');

cc.Class({
  extends: cc.Component,

  properties: {
    itemCharaUpAttrPre: cc.Node,
    frameAttribute: cc.Node,
    charaNode: cc.Node,
    continueTips: cc.Node,
    animSC: spineCtrl,
  },
  onLoad() {
    this.animSC.onSpineLoad = function () {
      this.doAction("effectCharaUpBgLight", true);
    };
    this.animSC.loadSpine("effectCharaUpBgLight");
    this.continueTips.runAction(cc.sequence(cc.fadeTo(1.0, 100), cc.fadeIn(1.0)).repeatForever());
  },
  getAttrName(attr, img) {
    const a = mbgGame.getString(attr);
    return `<img src='${img}' />${a}`;
  },
  opened(charaID, data) {
    const dOld = data.charas.old[charaID];
    const dCur = data.charas.cur[charaID];
    this.addAttr(this.getAttrName('attr_level', 'attr_level'), dOld.lv, dCur.lv);
    this.addAttr(this.getAttrName('Atk', 'attr_atk'), dOld.Atk, dCur.Atk);
    this.addAttr(this.getAttrName('Def', 'attr_def'), dOld.Def, dCur.Def);
    this.addAttr(this.getAttrName('MaxHp', 'attr_hp'), dOld.MaxHp, dCur.MaxHp);
    // mbgGame.resManager.setImageFrame(this.charaNode, 'images', `chara_front_${id}`);

    const charaNode = cc.instantiate(mbgGame.preloadRes.floorCharacter);
    this.charaNode.addChild(charaNode);
    const com = charaNode.getComponent('floorCharacter');
    com.onCreated({
      charaID,
      mode: 'action',
      modeAction: 'win',
    });
  },

  addAttr(name, oldData, newData) {
    const node = cc.instantiate(this.itemCharaUpAttrPre);
    node.active = true;
    this.frameAttribute.addChild(node);
    const com = node.getComponent('itemCharaUpAttr');
    com.arrtName.string = name;
    com.oldData.string = oldData;
    com.newData.string = newData;
  },

  closeMe() {
    this.node.destroy();
  },

});