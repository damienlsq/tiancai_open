const btnMode = cc.Enum({
  _custom: 0, // 自定义
  _228X80: 6,
  _142X61: 1,
  _98X58: 2,
  _102X34: 3,
  _96X46: 4,
  _220X90: 5,
});
const btnType = cc.Enum({
  _custom: 0, // 自定义
  Orange: 1,
  Yellow2: 2,
  GreenNoOutline: 3,
  RedNoOutline: 4,
  Blue: 5,
  Yellow3: 6,
  Orange3: 7,
  Yellow: 8,
  Selected: 9,
});

cc.Class({
  extends: cc.Component,

  properties: {
    btnMode: {
      default: 0,
      type: btnMode,
      notify( /* oldValue */ ) {
        this.initBtn();
      },
    },
    btnType: {
      default: 0,
      type: btnType,
      notify( /* oldValue */ ) {
        this.initBtn();
      },
    },
    btnLabel: {
      default: '??',
      notify( /* oldValue */ ) {
        this.setBtnLabel();
      },
      tooltip: '支持i18n,如设置为:i18n_ok',
    },
    clickEvent: {
      default: null,
      type: cc.Component.EventHandler,
      tooltip: 'xxx',
    },
    btnSound: {
      default: 'UI_Select',
      tooltip: '按钮音效',
    },
  },

  // use this for initialization
  onLoad() {
    this.initBtn();
    this.setBtnLabel();
    if (this.clickEvent && this.clickEvent.target && this.clickEvent.handler) {
      this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }
  },
  setBtnSprite() {
    let name = 'btnYellow';
    let fontColor = '#FFFFFF';
    const sprite = this.node.getComponent(cc.Sprite);
    if (!sprite) return;

    switch (this.btnType) {
      case btnType.Yellow:
        name = 'btnYellow';
        fontColor = '#6a2807';
        break;
      case btnType.Orange:
        name = 'btnOrange';
        fontColor = '#6a2807';
        break;
      case btnType.Yellow2:
        name = 'btnYellow2';
        fontColor = '#6a2807';
        break;
      case btnType.GreenNoOutline:
        name = 'btnGreenNoOutline';
        fontColor = '#FFFFFF';
        break;
      case btnType.RedNoOutline:
        name = 'btnRedNoOutline';
        fontColor = '#FFFFFF';
        break;
      case btnType.Blue:
        name = 'btnBlue';
        fontColor = '#FFFFFF';
        break;
      case btnType.Yellow3:
        name = 'btnYellow3';
        fontColor = '#6a2807';
        break;
      case btnType.Orange3:
        name = 'btnOrange3';
        fontColor = '#6a2807';
        break;
      case btnType.Selected:
        name = 'btnSelect';
        fontColor = '#FFFFFF';
        sprite.type = cc.Sprite.Type.SIMPLE;
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        this.node.getComponent(cc.Button).transition = cc.Button.Transition.NONE;
        break;
      case btnType._custom:
        return;
      default:
        break;
    }

    if (CC_EDITOR) {
      const uuid = Editor.assetdb.remote.urlToUuid(`db://assets/resources/uiIcon/${name}.png/${name}`);
      cc.loader.load({
        type: 'uuid',
        uuid
      }, (err, sf) => {
        sprite.spriteFrame = sf;
      });
    } else if (CC_PREVIEW) {
      const spriteFrame = cc.loader.getRes(`uiIcon/${name}`, cc.SpriteFrame);
      if (!spriteFrame) return;
      sprite.spriteFrame = spriteFrame;
    } else {
      const uiIcon = cc.loader.getRes('uiIcon/uiIcon', cc.SpriteAtlas);
      if (!uiIcon) return;
      const spriteFrame = uiIcon.getSpriteFrame(name);
      if (!spriteFrame) return;
      sprite.spriteFrame = spriteFrame;
    }

    const labelNode = this.node.getChildByName("btnLabel");
    if (!labelNode) return;
    const btnLabel = labelNode.getComponent(cc.RichText);
    if (btnLabel) {
      btnLabel.node.color = mbgGame.hex2color(fontColor);
      if (this.btnType === btnType.Selected) {
        labelNode.x = -14;
        btnLabel.fontSize = 20;
        btnLabel.lineHeight = 20;
      }
    }
  },
  // 按钮大小决定文字字号
  setBtnSize() {
    let size; // 按钮大小
    let fontSize = 28; // 字体大小
    let lineHeight = 30; // 字体行高
    switch (this.btnMode) {
      case btnMode._228X80:
        size = cc.size(228, 80);
        fontSize = 28;
        lineHeight = 30;
        break;
      case btnMode._142X61:
        size = cc.size(142, 61);
        fontSize = 20;
        lineHeight = 22;
        break;
      case btnMode._98X58:
        size = cc.size(98, 58);
        fontSize = 20;
        lineHeight = 22;
        break;
      case btnMode._102X34:
        size = cc.size(102, 34);
        fontSize = 18;
        lineHeight = 20;
        break;
      case btnMode._96X46:
        size = cc.size(96, 46);
        fontSize = 20;
        lineHeight = 22;
        break;
      case btnMode._220X90:
        size = cc.size(220, 90);
        fontSize = 28;
        lineHeight = 30;
        break;
      case btnMode._custom:
        return;
      default:
        break;
    }
    this.node.setContentSize(size);
    const labelNode = this.node.getChildByName("btnLabel");
    if (!labelNode) return;
    const rt = labelNode.getComponent(cc.RichText);
    if (rt) {
      rt.fontSize = fontSize;
      rt.lineHeight = lineHeight;
    }
  },

  initBtn() {
    this.setBtnSize();
    this.setBtnSprite();
  },
  setBtnType(name) {
    // mbgGame.log('RedNoOutline', name, btnType[name]);
    this.btnType = btnType[name] || btnType.Yellow;
    this.initBtn();
  },
  setBtnLabel(str) {
    const labelNode = this.node.getChildByName("btnLabel");
    if (!labelNode) return;
    const rt = labelNode.getComponent(cc.RichText);
    if (!rt) return;
    let s = rt.string;
    if (!str && this.btnLabel) {
      if (_.includes(this.btnLabel, 'i18n_')) {
        s = mbgGame.getString(this.btnLabel.substring(5)) || '??';
      } else if (this.btnLabel !== '??') {
        s = this.btnLabel;
      }
    } else if (_.includes(str, 'i18n_')) {
      s = mbgGame.getString(str.substring(5));
    } else {
      s = str;
    }

    // todo 处理cocos的richtext bug
    if (labelNode.getComponent(cc.RichText)) {
      s = `<color=#${rt.node.color.toHEX('#rrggbb')}>${s}</c>`
    }
    // todo cocos修复后可以删除这个代码

    if (this.btnMode === btnMode._228X80) {
      if (_.includes(s, '<br')) {
        const arr = s.split('<br />');
        arr[0] = `<size=20><color=#6a2807>${arr[0]}</c></size>`;
        arr[1] = `<size=24><lineHeight=20><b>${arr[1]}</b></size>`;
        s = `${arr[0]}<br />${arr[1]}`;
      }
    }
    if (this.btnMode === btnMode._142X61) {
      if (_.includes(s, '<br')) {
        const arr = s.split('<br />');
        arr[0] = `<size=16><color=#6a2807><lineHeight=20>${arr[0]}</c></size>`;
        arr[1] = `<size=20>${arr[1]}</size>`;
        s = `${arr[0]}<br />${arr[1]}`;
      }
    }
    rt.string = s || '';
  },
  setStatus(status, str) {
    const btn = this.node.getComponent(cc.Button);
    btn.interactable = status;
    if (str) {
      this._disableMsg = str;
    }
  },
  setSound(n) {
    this.btnSound = n;
  },
  onClick(event) {
    const btn = this.node.getComponent(cc.Button);
    if (!btn.interactable) {
      if (this._disableMsg) {
        mbgGame.managerUi.floatMessage(this._disableMsg);
      }
      return;
    }
    if (this.clickEvent) {
      cc.Component.EventHandler.emitEvents([this.clickEvent], event);
    }
    if (this.btnSound) {
      mbgGame.playSound(this.btnSound, 2);
    }
  },
  getLabelNode() {
    const labelNode = this.node.getChildByName("btnLabel");
    if (labelNode) return labelNode;
    return null;
  },

  setSelectStatus(status) {
    const sprite = this.node.getComponent(cc.Sprite);
    if (!sprite) return;
    mbgGame.resManager.setAutoAtlasFrame(sprite, 'uiIcon', status ? 'btnSelected' : 'btnSelect');
  },
});