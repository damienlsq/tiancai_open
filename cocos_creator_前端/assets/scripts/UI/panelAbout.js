cc.Class({
  extends: cc.Component,

  properties: {
    content: cc.Node,
    mask: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_credits');

    this.content.active = false;

    // 保存模版
    this.itemCreditTemplate = cc.instantiate(this.content.children[0]);
    this.content.removeAllChildren();

    const nameKeys = [];
    _.mapKeys(mbgGame.i18n, (v, k) => {
      if (k.indexOf('creditstitle') !== -1) {
        nameKeys.push(k.substring(12));
      }
    });
    // mbgGame.log('mbgGame.i18n', nameKeys);

    for (let i = 0; i < nameKeys.length; i++) {
      const title = mbgGame.getString(`creditstitle${nameKeys[i]}`);
      const name = mbgGame.getString(`creditsname${nameKeys[i]}`);
      if (title && name) {
        // mbgGame.log('credits item', this.content.height, this.mask.height);
        const item = cc.instantiate(this.itemCreditTemplate);
        this.content.addChild(item);
        item.getChildByName('title').getComponent(cc.RichText).string = title;
        item.getChildByName('name').getComponent(cc.RichText).string = name;
      }
    }

    this.scheduleOnce(() => {
      this.content.active = true;
      this.content.y = -(this.mask.height / 2) - 50;
      const originalY = this.content.y;

      this.scheduleOnce(() => {
        // this.content.runAction(cc.moveTo(this.content.height / 50, new cc.Vec2(0, this.content.height + 80)));
        const seq = cc.sequence(cc.moveTo(this.content.height / 50, new cc.Vec2(0, this.content.height + 80)), cc.callFunc(() => {
          this.content.y = originalY - 240;
        })).repeatForever();
        this.content.runAction(seq);
      }, 0);
    }, 0);
  },
});