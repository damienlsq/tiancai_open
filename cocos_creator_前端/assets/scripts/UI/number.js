cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.Node,
  },
  getOrCreateSprite() {
    if (!this.m_NodeList) {
      this.m_NodeList = {};
    }
    let node = this.m_NodeList[this.m_spIdx];
    if (!node) {
      node = new cc.Node();
      const sprite = node.addComponent(cc.Sprite);
      sprite.type = cc.Sprite.Type.SIMPLE;
      sprite.sizeMode = cc.Sprite.SizeMode.RAW;
      sprite.trim = false;
      this.content.addChild(node);
      this.m_NodeList[this.m_spIdx] = node;
    }
    node.active = true;
    this.m_spIdx += 1;
    return node.getComponent(cc.Sprite);
  },
  hideAllSprite() {
    this.content.children.forEach((node) => {
      node.active = false;
    });
  },
  addNewSprite(frameName, atlas) {
    const sprite = this.getOrCreateSprite();
    mbgGame.resManager.setAutoAtlasFrame(sprite, atlas, frameName);
  },

  initMe(data) {
    // mbgGame.log('number initMe', data);
    this.hideAllSprite();
    this.m_spIdx = 0;
    this.m_NodeList = {};
    if (data.prefix) {
      this.addNewSprite(data.prefix, 'uiBase');
    }
    // 先转为字符串
    const str = `${data.str}`;
    for (let i = 0; i < str.length; i++) {
      let frameName;
      const ch = str[i];
      if (+ch >= 0 && +ch <= 9) {
        // 数字
        frameName = `${data.type}${ch}`;
      } else {
        frameName = ch;
      }
      this.addNewSprite(frameName, data.atlas || 'uiBase');
    }
  },
});