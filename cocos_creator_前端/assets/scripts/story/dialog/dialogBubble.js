const assert = require('assert');

cc.Class({
  extends: cc.Component,

  properties: {
    arrow: cc.Node,
    arrowLeft: cc.Node,
    arrowRight: cc.Node,
    textLabel: cc.RichText,
  },

  // use this for initialization
  onLoad() {
    this.strLimit = 12;
  },
  getTextLabel() {
    return this.textLabel;
  },
  say(text, pos, arrowType, hideDelay, checkOutWin) {
    this.node.active = true;
    this.node.stopAllActions();
    this.arrowType = arrowType;
    this.arrow.active = arrowType >= 1 && arrowType <= 2;
    this.checkOutWinEnabled = checkOutWin;
    if (arrowType === 1) {
      this.arrow.x = 0;
      this.arrow.angle = -90;
    } else if (arrowType === 2) {
      if (this.node.x > 0) {
        this.arrow.angle = -120; // 左
      } else {
        this.arrow.angle = -60; // 右
      }
    }
    this.checkText(text);
    this.arrowLeft.active = false;
    this.arrowRight.active = false;
    this.getTextLabel().string = `<color=#000000>${text}</c>`;
    this.node.opacity = 255;
    if (pos) {
      this.setPos(pos);
    }
    this.node.setScale(0, 0);
    this.node.runAction(cc.scaleTo(0.2, 1, 1));
    if (hideDelay) {
      this.node.runAction(cc.sequence(cc.delayTime(hideDelay), cc.callFunc(() => {
        this.node.active = false;
      }, this)));
    }
  },
  showArrowLeft() {
    this.arrowLeft.active = true;
    this.arrowRight.active = false;
    this.arrow.active = false;
  },
  showArrowRight() {
    this.arrowRight.active = true;
    this.arrowLeft.active = false;
    this.arrow.active = false;
  },
  checkText(text) {
    // 根据字符设置分行
    let maxLine = 0;
    const lines = text.split('\n');
    // mbgGame.log('checkText text-----', text);
    for (let i = 0; i < lines.length; i++) {
      const lineTex = lines[i].replace(/<[^>]+>/g, '');
      // mbgGame.log('checkText lineTex', lineTex);
      if (lineTex.length >= maxLine) {
        maxLine = lineTex.length;
      }
    }
    if (maxLine > this.strLimit) {
      maxLine = this.strLimit;
    }
    this.getTextLabel().maxWidth = this.getTextLabel().fontSize * maxLine;
    if (cc.sys.isNative) {
      this.getTextLabel().maxWidth += 12;
    }
  },
  setPos(pos) {
    if (!this.isValid) return;
    if (this.getTextLabel().node.width > 300) {
      this.getTextLabel().maxWidth = 300;
    }
    const sizeByObject = this.node.getComponent('sizeByObject');
    sizeByObject.fixSize();
    const size = sizeByObject.calSize();
    if (this.arrowType === 3) {
      pos = pos.add(cc.v2(size.width * 0.5, 0));
      this.showArrowLeft();
    } else if (this.arrowType === 4) {
      pos = cc.pSub(pos, cc.v2(size.width * 0.5, 0));
      this.showArrowRight();
    }
    this.arrow.x = 0;
    this.node.setPosition(pos);
    this.checkNodeOutWin();
  },
  simpleSetPos(pos) {
    this.node.setPosition(pos);
    this.checkNodeOutWin();
  },
  checkNodeOutWin() {
    if (!this.checkOutWinEnabled) {
      return;
    }
    const node = this.node;
    let worldPos = node.parent.convertToWorldSpaceAR(node.getPosition());
    worldPos = mbgGame.managerUi.node.convertToNodeSpaceAR(worldPos);
    const leftX = worldPos.x - (node.width * node.anchorX);
    const rightX = worldPos.x + (node.width * node.anchorX);
    if (leftX <= -320) {
      const offset = Math.abs(leftX + 320);
      node.x += offset;
      this.arrow.x -= offset;
    } else if (rightX >= 320) {
      const offset = Math.abs(rightX - 320);
      node.x -= offset;
      this.arrow.x += offset;
    }
  },
  onClick() {
    this.node.active = false;
  },
});