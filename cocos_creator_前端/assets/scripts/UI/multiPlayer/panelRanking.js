cc.Class({
  extends: cc.Component,

  properties: {
    totemNode: cc.Node,
    integralCurrent: cc.Label,
    integralBest: cc.Label,
    rankingCurrent: cc.Label,
    rankingBest: cc.Label,
    awardDiamonds: cc.RichText,
    btnGet: cc.Node,
    endtimeLabel: cc.RichText,
    dayReward: cc.RichText,

    listContent: cc.Node,
    labelName: cc.RichText,
    curSeason: cc.Label,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_ranking');
    this.items = [];
    // 保存模版
    this.rankingListItemTemplate = cc.instantiate(this.listContent.children[0]);
    this.listContent.removeAllChildren();
    mbgGame.managerUi.addIconFlag(this.totemNode, mbgGame.userInfo.totem);
    this.dayReward.string = mbgGame.getString('dayreward');
  },
  onAddBaseWin() {
    this.refreshMe();
  },
  refreshMe() {
    const data = mbgGame.getCache('arena.rank', 60);
    if (!data) {
      mbgGame.checkNetCache('arena.rank', this.refreshMe.bind(this));
      return;
    }
    if (!this.node || !this.node.isValid) {
      return;
    }
    mbgGame.log('rankdata refreshMe', data);

    this.integralCurrent.string = mbgGame.getString('rankCurScore', {
      v: mbgGame.player.getPVPScore(),
    });
    this.integralBest.string = mbgGame.getString('rankBestScore', {
      v: mbgGame.player.getPVPMaxScore(),
    });

    this.rankingCurrent.string = mbgGame.getString('rankCurRank', {
      v: mbgGame.player.getPVPRank(),
    });
    this.rankingBest.string = mbgGame.getString('rankBestRank', {
      v: mbgGame.player.getPVPMaxRank(),
    });
    this.curSeason.string = mbgGame.getString('rankCurSeason', { n: data.seasonIdx });

    const timeCom = this.endtimeLabel.node.addComponent('effectTimerString');
    timeCom.initMe({
      endTime: Math.floor(data.endtime / 1000),
      strKey: 'rankSeasonLeft',
      interval: 1,
    });

    this.updateRewardPanel();
    this.labelName.string = mbgGame.getBoldStr(mbgGame.userInfo.nickname);
    this.updateList();
  },

  onGetAward() {
    mbgGame.netCtrl.sendMsg("arena.getreward", {}, (data) => {
      mbgGame.log("[arena.getreward]", data);
      const diamonds = data.data && data.data.diamonds;
      if (data.code === "err") {
        mbgGame.managerUi.floatMessage(data.err);
      } else if (diamonds != null) {
        this.updateRewardPanel(diamonds);
        mbgGame.removeCache('arena.rank');
        mbgGame.sceneMenu.checkZhengBa();
        mbgGame.panelSquare.checkRedTip();
      }
    });
  },
  updateRewardPanel(diamonds) {
    const data = mbgGame.getCache('arena.rank');
    if (diamonds == null) {
      diamonds = data.diamonds || 0;
    }
    data.diamonds = diamonds;
    this.awardDiamonds.string = mbgGame.getString('unitPrice', {
      unit: 'logo_diamonds',
      price: diamonds,
    });
    this.btnGet.getComponent('itemBtn').setStatus(diamonds > 0);
  },

  setSurplusTime(str) {
    this.surplusTime.string = str;
  },
  update() {
    if (!this.renderList || !this.renderList.length) return;
    const dData = this.renderList.shift();
    // mbgGame.log('dData', dData);

    if (!this.items[dData.rank]) {
      const node = cc.instantiate(this.rankingListItemTemplate);
      this.listContent.addChild(node);
      this.items[dData.rank] = node.getComponent('panelRankingItem');
    }
    this.items[dData.rank].initMe(dData);
    this.items[dData.rank].node.setScale(1.05);
    this.items[dData.rank].node.runAction(cc.scaleTo(0.1, 1, 1));
  },
  updateList() {
    const data = mbgGame.getCache('arena.rank');
    const rankdata = data.rank;
    this.renderList = this.renderList || [];
    for (let i = 0; i < rankdata.length; i++) {
      rankdata[i].rank = i + 1;
      this.renderList.push(rankdata[i]);
    }
  },

});
