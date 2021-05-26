const mbgGame = require("mbgGame");
const warDefines = require("warDefines");

cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.Label,
    time: cc.Label,
    iconNode: cc.Node,
  },

  // 获取一个奖励icon， 显示最好那个
  getAwardIcon(award) {
    // mbgGame.log('[mailDetail] buildAward', award);
    if (!award) {
      const sprite = this.iconNode.addComponent(cc.Sprite);
      sprite.type = cc.Sprite.Type.SIMPLE;
      sprite.sizeMode = cc.Sprite.SizeMode.RAW;
      mbgGame.resManager.setAutoAtlasFrame(this.iconNode, 'uiBase', 'mail');
      return;
    }

    let item;
    if (award.itemdatas) {
      item = _.maxBy(award.itemdatas, 'q');
      if (item) {
        const obj = mbgGame.managerUi.getIconItem();
        this.iconNode.addChild(obj);
        const com = obj.getComponent("itemPanel");
        com.initMe({ itemData: item, style: 'award' });
        return;
      }
    } else if (award.items) {
      const itemList = warDefines.transRewardItems(award.items);
      item = itemList[0];
      if (item) {
        const obj = mbgGame.managerUi.getIconItem();
        this.iconNode.addChild(obj);
        const com = obj.getComponent("itemPanel");
        com.initMe({
          itemData: {
            i: item[0],
            q: item[2],
            s: item[3],
            lv: 1,
          },
          style: 'unidentify',
        });
        return;
      }
    }

    let count = 1;
    [
      'diamonds',
      'coins',
      'gem',
      'mat',
      'sta',
      'score',
    ].forEach((x) => {
      if (!award[x]) return;
      if (!item) {
        item = x;
        count = award[x];
      }
    });
    if (item) {
      const obj = mbgGame.managerUi.getIconItem();
      this.iconNode.addChild(obj);
      const com = obj.getComponent("itemPanel");
      com.initMe({ icon: `award_${item}`, count: +count, style: 'award' });
    }
  },

  // gf附件获取标记，0 未获取， 1 已获取  2 没有附件
  // rf阅读标记 0 未读， 1 已读
  refreshMe(id) {
    if (this.id !== id) return;
    const mailsData = mbgGame.getCache('player.mailList');
    if (!mailsData) return;
    const data = mailsData[id];
    if (!data) {
      // 已经删除掉数据
      this.node.destroy();
      return;
    }
    // mbgGame.log('mailData', data);
    this.time.string = mbgGame.transTime(data.outDate - Math.floor((new Date()).getTime() / 1000));
    // 显示一个奖励图标

    /*
    let iconName = 'mail';
    if (data.gf === 1) {
      iconName = 'mail_r';
    } else if (data.gf === 2) {
      iconName = data.rf === 0 ? 'mail' : 'mail_r';
    } else if (data.gf === 0) {
      iconName = data.rf === 0 ? 'mail_gift' : 'mail_gift_r';
    }
    mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', iconName);
  */
    this.getAwardIcon(data.award);
    this.title.string = data.title;
  },

  initMe(id) {
    this.id = id;
    this.refreshMe(id);
  },

  clickMe() {
    // mbgGame.log('clickMe', this.data);
    mbgGame.resManager.loadPrefab('panelMailDetail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addSmallWin(node, 'panelMailDetail', this.id);
    });
  },
});
