cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.RichText,
    content: cc.RichText,
    btnGet: cc.Node,
    awardsContent: cc.Node,
    awardsSV: cc.Node,
    lineNode: cc.Node,
    contentSV: cc.Node,
  },

  buildAward(award) {
    mbgGame.log('[mailDetail] buildAward', award);
    if (!award) return;
    [
      'diamonds',
      'gem',
      'mat',
      'sta',
      'coins',
      'score',
    ].forEach((x) => {
      if (!award[x]) return;
      mbgGame.managerUi.getAwardItem(this.awardsContent, { icon: `award_${x}`, count: +award[x] });
    });
    if (award.itemdatas) {
      for (let i = 0; i < award.itemdatas.length; i++) {
        mbgGame.managerUi.getAwardItem(this.awardsContent, { itemData: award.itemdatas[i] });
      }
    } else if (award.items) {
      const itemList = warDefines.transRewardItems(award.items);
      for (let i = 0; i < itemList.length; i++) {
        mbgGame.managerUi.getAwardItem(this.awardsContent, {
          itemData: {
            i: itemList[i][0],
            q: itemList[i][2],
            s: itemList[i][3],
            lv: 1,
          },
          style: 'unidentify',
        });
      }
    }
  },

  onAddBaseWin(id) {
    this.id = id;
    const mailsData = mbgGame.getCache('player.mailList');
    if (!mailsData) return;
    const mailData = mailsData[id];
    // mbgGame.log('mailData:', mailData);
    this.title.string = mailData.title;
    this.content.string = mailData.content || ' ';
    // this.time.string = mbgGame.transTime(mailData.outDate - Math.floor((new Date()).getTime() / 1000));

    if (mailData.award) {
      this.buildAward(mailData.award);
    } else {
      // 没有附件的邮件
      this.awardsSV.active = false;
      this.lineNode.active = false;
      this.contentSV.height = 320;
      this.btnGet.getComponent('itemBtn').setBtnLabel(mbgGame.getString('ok'));
    }
  },

  getMe() {
    // mbgGame.log('getMe', this.id);
    const mailsData = mbgGame.getCache('player.mailList');
    if (!mailsData) return;
    const self = this;
    mbgGame.netCtrl.sendMsg("player.mailOp", {
      op: 2,
      id: this.id,
    }, (data) => {
      // mbgGame.log("getMe mailOp", data);
      data.keys.forEach((x) => {
        delete mailsData[x];
      });
      emitter.emit("newMailCome");
      if (self.node && self.node.isValid) {
        self.node._winBase.closeMe();
      }
    });
  },
});
