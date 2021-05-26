const warDefines = require('warDefines');

cc.Class({
  extends: cc.Component,
  properties: {
    animPos: cc.Node,
    rewardLabel: cc.Node,
    chestSp: cc.Sprite,
    scoreLabel: cc.RichText,
    titleSp: cc.Sprite,
  },
  playGradeAni(grade, node, cb) {
    const epoch = warDefines.calEpoch(grade);
    const idx = warDefines.calRomanNumIdx(grade);
    mbgGame.log("playGradeAni epoch, idx", epoch, idx);
    let so;
    if (!node) {
      mbgGame.log("creat node");
      node = new cc.Node();
      this.animPos.addChild(node);
      node.addComponent(sp.Skeleton);
      so = node.addComponent('spineObject');
    } else {
      so = node.getComponent('spineObject');
      if (epoch < 5) {
        so.setSkin(`s${idx}`);
      }
      if (cb) cb(so, idx);
      return;
    }
    so.onSpineLoad = function () {
      if (epoch < 5) {
        this.setSkin(`s${idx}`);
      }
      if (cb) cb(this, idx);
    };
    so.loadSpine(`gradeAnim${epoch}`);
  },
  playGradeDownAni(grade, diffEpoch, cb) {
    this.playGradeAni(grade, null, (so, idx) => {
      so.doActionNoClear('loop', false);
      so.setComplteCB(() => {
        if (diffEpoch) {
          so.doActionNoClear('endA', false);
        } else {
          so.doActionNoClear('endB', false);
        }
        so.setComplteCB(cb);
      });
    });
  },
  playGradeUpAni(grade, diffEpoch, node) {
    this.playGradeAni(grade, node, (so, idx) => {
      so.doOnceAction(diffEpoch ? 'startA' : 'startB', 'loop', true);
    });
  },
  initMe(oldGrade, newGrade) {
    const self = this;
    const diffEpoch = warDefines.calEpoch(oldGrade) !== warDefines.calEpoch(newGrade);
    this.playGradeDownAni(oldGrade, diffEpoch, (node) => {
      if (diffEpoch) {
        node.destroy();
        node = null;
      }
      mbgGame.log("playGradeUpAni", newGrade);
      self.playGradeUpAni(newGrade, diffEpoch, node);
    });
    if (!diffEpoch) {
      mbgGame.resManager.setImageFrame(this.titleSp, 'images', `pvptitle${warDefines.calEpoch(newGrade)}`);
    } else {
      mbgGame.resManager.setImageFrame(this.titleSp, 'images', `pvptitle${warDefines.calEpoch(oldGrade)}`);
      this.titleSp.node.runAction(cc.sequence(cc.delayTime(2), cc.fadeOut(1), cc.callFunc(() => {
        mbgGame.resManager.setImageFrame(this.titleSp, 'images', `pvptitle${warDefines.calEpoch(newGrade)}`);
      }), cc.delayTime(0.5), cc.fadeIn(1)));
    }
    this.scoreLabel.string = `当前积分 <img src=""/> ${mbgGame.player.getPVPScore()}`;
    let hasChest = false;
    const dChest = mbgGame.player.getPVPChestInfo();
    for (const g in dChest) {
      if (dChest[g] === 1) {
        hasChest = true;
        break;
      }
    }
    this.rewardLabel.active = hasChest;
    this.chestSp.node.active = hasChest;
    if (hasChest) {
      mbgGame.resManager.setImageFrame(this.chestSp, 'images', 'chest3');
    }
  },
  onConfirm() {
    this.closeMe();
  },
  closeMe() {
    this.animPos.removeAllChildren();
    this.node.destroy();
    emitter.emit('refreshGradeInfo');
  },
  // 两种情况，大段变，大段不变
});