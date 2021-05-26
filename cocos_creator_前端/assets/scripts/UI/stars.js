const onImg = 'starBigOn';
const offImg = 'starBigNor';

cc.Class({
  extends: cc.Component,

  reset() {
    delete this.m_arrayStars;
    delete this.m_star;
    this.node.removeAllChildren();
  },

  onDestroy() {
    delete this.m_arrayStars;
    delete this.m_star;
  },
  playStarAni(idx) {
    if (!this.m_arrayStars) {
      return;
    }
    const node = new cc.Node();
    node.addComponent("sp.Skeleton");
    const com = node.addComponent("spineObject");
    const parent = this.m_arrayStars[idx];
    parent.addChild(node);
    const sp = parent.getComponent(cc.Sprite);
    mbgGame.resManager.setAutoAtlasFrame(sp, 'uiBase', offImg);
    node.x = 0;
    node.y = -3;
    com.onSpineLoad = function () {
      mbgGame.playSound('UI_Star');
      com.playAnimationAndDestroy("star", () => {
        sp.enabled = true;
        mbgGame.resManager.setAutoAtlasFrame(sp, 'uiBase', onImg);
      });
    };
    com.loadSpine("star");
  },
  playBlinkAni(idx) {
    if (!this.m_arrayStars) {
      return;
    }
    const node = this.m_arrayStars[idx];
    const sp = node.getComponent(cc.Sprite);
    mbgGame.resManager.setAutoAtlasFrame(sp, 'uiBase', onImg);
    node.stopAllActions();
    node.runAction(
      cc.sequence(cc.fadeTo(1.0, 50), cc.fadeTo(1.0, 255)).repeatForever());
  },
  setMaxStar(maxStar) {
    this.m_arrayStars = this.m_arrayStars || [];
    const length = this.m_arrayStars.length;
    if (length < maxStar) {
      for (let i = 0; i < (maxStar - length); i++) {
        const node = this.newStar(offImg);
        this.node.addChild(node);
        this.m_arrayStars.push(node);
      }
    } else if (length > maxStar) {
      for (let i = maxStar; i < length; i++) {
        const obj = this.m_arrayStars[this.m_arrayStars.length - 1];
        if (!obj || !obj.isValid) {
          obj.destroy();
        }
      }
    }
    for (let i = 0; i < this.m_arrayStars.length; i++) {
      const node = this.m_arrayStars[i];
      if (!node || !node.isValid) continue;
      node.opacity = 255;
      node.stopAllActions();
      mbgGame.resManager.setAutoAtlasFrame(node.getComponent(cc.Sprite), 'uiBase', offImg);
    }
  },
  newStar(img) {
    const node = new cc.Node();
    const sprite = node.addComponent(cc.Sprite);
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    sprite.trim = false;
    mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiBase', img);
    return node;
  },
  getStar() {
    return this.m_star;
  },
  setStar(curStar, maxStar) {
    this.setMaxStar(maxStar);
    const oldStar = this.getStar();
    this.m_star = curStar;
    for (let i = 0; this.m_arrayStars && i < this.m_arrayStars.length; i++) {
      const node = this.m_arrayStars[i];
      node.opacity = 255;
      node.stopAllActions();
      mbgGame.resManager.setAutoAtlasFrame(node.getComponent(cc.Sprite), 'uiBase', i < curStar ? onImg : offImg);
    }
    if (oldStar != null && oldStar >= 0 && oldStar < this.m_star) {
      this.playStarAni(this.m_star - 1);
    }
  },
  starEffect(val) {
    if (this.m_arrayStars && this.m_arrayStars[val]) {
      mbgGame.managerUi.changeEffect(this.m_arrayStars[val]);
    }
  },
});