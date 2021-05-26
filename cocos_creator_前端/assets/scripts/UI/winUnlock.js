cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.Node,
    desc: cc.Node,
    descchara: cc.Node,
  },
  onLoad() {
    mbgGame.winUnlock = this;
  },
  onDestroy() {
    delete mbgGame.winUnlock;
  },
  onAddBaseWin(data, param) {
    const obj = new cc.Node();
    mbgGame.setLabel(this.title, data.msg || '');
    obj.addComponent(sp.Skeleton);
    const spineObj = obj.addComponent("spineObject");
    this.node._winBase.maskBg.addChild(obj, -1);
    obj.y = -20;
    spineObj.onSpineLoad = function () {
      this.setSkin(param.type === 1 ? "skin1" : "skin2");
      this.doAction('unlock', true);
    };
    spineObj.loadSpine('unlock');
    mbgGame.setLabel(this.desc, param.desc || mbgGame.getString(param.desci18n));

    if (param.charaID) {
      mbgGame.setLabel(this.descchara, param.desc || mbgGame.getString(param.desci18n));
      this.m_floorCharacter = cc.instantiate(mbgGame.preloadRes.floorCharacter);
      this.node.addChild(this.m_floorCharacter);
      this.m_floorCharacter.y = -20;
      const com = this.m_floorCharacter.getComponent("floorCharacter");
      com.onCreated({
        charaID: param.charaID,
        mode: '',
      });
      com.showShadow(true);
      this.desc.active = false;
      this.descchara.active = true;
    }
  },
  closeMe() {
    delete mbgGame.winUnlock;
    mbgGame.managerUi.checkCachedMessage();
  },
});