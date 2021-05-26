/*
    buff图标
    用于fighter以及buttonSkill
*/

cc.Class({
  extends: cc.Component,
  properties: {
    buffIcon: cc.Prefab,
    buffIconLayout: cc.Node,
  },
  onLoad() {
    emitter.on(this, "addBuffIcon", (objID, dOption) => {
      if (this.m_objID === objID) {
        this.addBuffIcon(dOption);
      }
    });
    emitter.on(this, "refreshBuffIcon", (objID, dOption) => {
      if (this.m_objID === objID) {
        const com = this.getBuffIconCom(dOption.stobjID);
        if (com) {
          com.refreshBuffIcon(dOption);
        }
      }
    });
    emitter.on(this, "refreshBuffRound", (objID, dRoundInfo) => {
      if (this.m_objID === objID) {
        for (const stobjID in dRoundInfo) {
          const com = this.getBuffIconCom(+stobjID);
          if (com) {
            com.refreshBuffIcon({ lr: dRoundInfo[stobjID] });
          }
        }
      }
    });
    emitter.on(this, "delBuffIcon", (objID, dOption) => {
      if (this.m_objID === objID) {
        this.delBuffIcon(dOption.stobjID);
      }
    });
    emitter.on(this, "delAllBuffIcon", (objID) => {
      if (!objID || this.m_objID === objID) {
        this.delAllBuffIcon();
      }
    });
  },
  onDestroy() {
    emitter.off(this, "addBuffIcon");
    emitter.off(this, "delBuffIcon");
    emitter.off(this, "delAllBuffIcon");
  },
  listenTarget(objID) {
    this.m_objID = objID;
  },
  // 头顶上的buff小图标
  addBuffIcon(dOption) {
    const dStateConfig = mbgGame.config[`skillstate${dOption.stateID}`];
    if (!dStateConfig) {
      mbgGame.error("addBuffIcon, no such stateID", dOption.stateID);
      return;
    }
    if (!dOption.icon) {
      dOption.icon = dStateConfig.icon;
    }
    if (!dOption.icon) return;
    const obj = cc.instantiate(this.buffIcon);
    this.buffIconLayout.addChild(obj);
    obj._BuffObjID = dOption.stobjID;
    const com = obj.getComponent('buffIcon');
    com.initMe(dOption);
  },
  getBuffIconCom(stobjID) {
    for (let i = 0; i < this.buffIconLayout.children.length; i++) {
      const obj = this.buffIconLayout.children[i];
      if (obj._BuffObjID === stobjID) {
        return obj.getComponent("buffIcon");
      }
    }
    return null;
  },
  delBuffIcon(stobjID) {
    const removeObjs = [];
    this.buffIconLayout.children.forEach((x) => {
      // buff icon
      if (x._BuffObjID === stobjID) {
        removeObjs.push(x);
      }
    });
    removeObjs.forEach((x) => {
      x.destroy();
    });
  },
  delAllBuffIcon() {
    const removeObjs = [];
    this.buffIconLayout.children.forEach((x) => {
      // buff icon
      if (x._BuffObjID) {
        removeObjs.push(x);
      }
    });
    removeObjs.forEach((x) => {
      x.destroy();
    });
  },
});