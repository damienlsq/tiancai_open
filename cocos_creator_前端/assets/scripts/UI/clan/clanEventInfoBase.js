const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    clanEventInfo0: cc.Prefab,
    clanEventInfo1: cc.Prefab,
    clanEventInfo2: cc.Prefab,
    clanEventInfo3: cc.Prefab,
    clanEventInfo4: cc.Prefab,
    clanEventInfo5: cc.Prefab,
    clanEventInfo6: cc.Prefab,

    eventNode: cc.Node,
  },

  initMe(id) {
    const events = mbgGame.getCache('clan.clanEvents');
    if (!events) return;
    const data = events[id];
    // mbgGame.log('eventinfobase', data, id);
    if (!data) return;

    let infoPre = this.clanEventInfo2;
    infoPre = this[`clanEventInfo${data.mode}`];
    const node = cc.instantiate(infoPre);
    node._clanEventID = id;
    node._clanEventData = data;
    const com = node.getComponent("clanEventInfo");
    com.initMe(id);
    this.eventNode.addChild(node);

    this.node.height = mbgGame.clanEvent.getEventHeight(data, id);
    this.node.y = this.node.height * node.anchorY;
    this.node.x = node.width * node.anchorX;
    this.logLastViewID(id);
    /*
        mbgGame._eventIDD = mbgGame._eventIDD || 1;
        const sprite = this.node.addComponent(cc.Sprite);
        sprite.type = cc.Sprite.Type.SLICED;
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        mbgGame.resManager.setAutoAtlasFrame(sprite, 'labIcon', mbgGame._eventIDD % 2 === 1 ? 'frameBlack' : 'frameWhite');
        mbgGame._eventIDD++;
     */
  },

  logLastViewID(id) {
    // 记录低最后看过的id
    const logEventLastID = +cc.sys.localStorage.getItem("clanEventID");
    if (!logEventLastID || (+id > +logEventLastID)) {
      cc.sys.localStorage.setItem("clanEventID", `${id}`);
    }
  },

});
