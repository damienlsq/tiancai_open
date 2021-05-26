cc.Class({
  extends: cc.Component,

  properties: {
    moveUp: true,
    dis: 100,
    usingTime: 2,
    bgCritic: cc.Node,
  },
  getFont(fontID) {
    switch (fontID) {
      case mbgGame.FontNormal:
        return 'normal';
      case mbgGame.FontCritic:
        return 'critic';
      case mbgGame.FontHeal:
        return 'heal';
      case mbgGame.FontPoison:
        return 'poison';
      case mbgGame.FontSkill:
        return 'skill';
      default:
        break;
    }
    return 'normal';
  },
  floatNow() {
    // 动画效果    move移动   fade渐隐    动画完成后删除自己
    this.node.setScale(1, 1);
    this.node.opacity = 255;

    const duration = 1.3 / mbgGame.replaySpeed;
    let actionMove;
    const dir = new cc.Vec2(0, 1);
    if (this.moveUp) {
      actionMove = cc.moveBy(duration, dir.mul(_.random(0.7 * this.dis, this.dis)));
    } else {
      actionMove = cc.moveBy(duration, dir.mul(_.random(0.7 * this.dis, this.dis)).neg());
    }
    const actionAll = cc.sequence(actionMove,
      cc.callFunc(() => {
        mbgGame.managerUi.floatFightMessageFinish(this.node);
      }));
    const scaleSeq = cc.sequence(cc.scaleTo(0, 1.5),
      cc.delayTime(0.5 / mbgGame.replaySpeed),
      cc.spawn(cc.scaleTo(0.4 / mbgGame.replaySpeed, 1),
        cc.fadeOut(0.4 / mbgGame.replaySpeed)));
    this.node.runAction(actionAll);
    this.node.runAction(scaleSeq);
  },

  initMe(option) {
    if (option.pos) {
      // mbgGame.log('pos', option.pos);
      this.node.setPosition(option.pos);
    } else {
      this.node.setPosition(new cc.Vec2(0, 100));
    }
    if (!this.numberNodeCom) {
      const node = cc.instantiate(mbgGame.preloadRes.number);
      this.node.addChild(node);
      this.numberNodeCom = node.getComponent('number');
    }
    this.numberNodeCom.initMe({
      str: option.msg || '',
      type: this.getFont(option.fontID || 1),
      prefix: option.numType,
    });
    /*
    if (option.fontID === mbgGame.FontCritic) {
      this.bgCritic.active = true;
    } else {
      this.bgCritic.active = false;
    }
    */
    this.bgCritic.active = false;
    this.floatNow();
  },
});