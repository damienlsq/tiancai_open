cc.Class({
  extends: cc.Component,

  properties: {
    i18nList: {
      default: [],
      type: cc.Node,
    },
    // 粗体字
    i18nBoldList: {
      default: [],
      tooltip: "自动添加<b>到richtext",
      type: cc.Node,
    },
  },

  // use this for initialization
  onLoad() {
    this.autoDealI18n();
  },

  autoDealI18n() {
    // 自动处理i18n的label
    this.i18nList.forEach((x) => {
      if (!x) return;
      const name = x.name;
      if (name.startsWith('i18n_')) {
        const key = name.substring('i18n_'.length);
        const str = mbgGame.getString(key);
        if (str) {
          let com = x.getComponent(cc.Label);
          if (!com) {
            com = x.getComponent(cc.RichText);
            if (!com) {
              console.error('没有设置label或者richtext2', x);
              return;
            }
          }
          com.string = str;
        }
      }
    });

    this.i18nBoldList.forEach((x) => {
      if (!x) return;
      const name = x.name;
      if (name.startsWith('i18n_')) {
        const key = name.substring('i18n_'.length);
        const str = mbgGame.getString(key);
        if (str) {
          let com = x.getComponent(cc.Label);
          if (!com) {
            com = x.getComponent(cc.RichText);
            if (!com) {
              console.error('没有设置label或者richtext2', x);
              return;
            }
            com.string = mbgGame.getBoldStr(str);
          } else {
            com.string = str;
          }
        }
      }
    });
  },
});