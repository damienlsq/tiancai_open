const warDefines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    icon: cc.Sprite,
    attrName: cc.RichText,
    attrNum: cc.RichText,
  },
  initAsUnknown() {
    if (this.icon) {
      mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', 'attr_unknown');
    }
    this.attrName.string = '（随机属性）';
    if (this.attrNum) {
      this.attrNum.string = '';
    }
  },
  initForItem({ sAttr, val, sType, color, real }) {
    let attrName = mbgGame.getString(sAttr);
    const attrValueStr = warDefines.transValToStr(val, sAttr, sType);

    let valStr;
    if (real) {
      valStr = this.makeText(sAttr, val, real);
    } else {
      valStr = attrValueStr;
    }
    if (color) {
      attrName = `<color=${color}>${attrName}</color>`;
      valStr = `<color=${color}>${valStr}</color>`;
    }

    if (this.attrNum) {
      this.attrName.string = attrName;
      this.attrNum.string = valStr;
    } else {
      this.attrName.string = `${attrName}: ${valStr}`;
    }

    if (this.icon) {
      if (warDefines.iconName[sAttr]) {
        this.icon.node.active = true;
        mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', warDefines.iconName[sAttr]);
      } else {
        this.icon.node.active = false;
      }
    }
  },

  // 人物属性显示
  makeColor(real, base, mark, nospace, noSymbol) {
    let content = `${real - base}${mark}`;
    if (!noSymbol) {
      content = `${real > base ? '+' : ''}${content}`;
    }
    return `<color=#${real > base ? '99ff00' : 'ff0000'}>${!nospace ? ' ' : ''}${content} </color>`;
  },
  makeText(sAttr, base, real) {
    const mark = warDefines.Attr2Mark[sAttr];
    if (base === real) {
      return `${base}${mark}`;
    }
    let str = '';
    if (base > 0) {
      str = `${base}${mark}`;
      str += this.makeColor(real, base, mark, false, false);
    } else {
      str = this.makeColor(real, base, mark, true, true);
    }
    return str;
  },
  initForChara(sAttr, base, real) {
    const attrName = mbgGame.getString(sAttr);
    const valStr = this.makeText(sAttr, base, real);

    if (this.attrNum) {
      this.attrName.string = attrName;
      this.attrNum.string = valStr;
    } else {
      this.attrName.string = `${attrName}: ${valStr}`;
    }

    if (this.icon) {
      if (warDefines.iconName[sAttr]) {
        this.icon.node.active = true;
        mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', warDefines.iconName[sAttr]);
      } else {
        this.icon.node.active = false;
      }
    }
  },
  initTrainAttr(sAttr, dData) {
    const attrID = warDefines.Attr2ID[sAttr];
    // mbgGame.log("initTrainAttr", dData.tlv, sAttr, attrID);
    const val = dData.tlv[attrID] || 0;
    const attrName = mbgGame.getString(sAttr);
    const mark = warDefines.GymAttr2Mark[sAttr];
    const valStr = `+${val}${mark}`;

    if (this.attrNum) {
      this.attrName.string = attrName;
      this.attrNum.string = valStr;
    } else {
      this.attrName.string = `${attrName}: ${valStr}`;
    }
    if (this.icon) {
      mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', warDefines.iconName[sAttr]);
    }
  },
});
