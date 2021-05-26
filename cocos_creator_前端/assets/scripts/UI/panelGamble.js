// 赌局类型
// 赌局类型
mbgGame.MatchType = {
  Exchange: 1, // 替换成新的道具，itemID随机，sid、星级、品质、等级不变，随机属性变
  Refresh: 2, // 和Exchange近似，区别是itemID不变
  AddLv: 3, // 该道具的lv+1
};

mbgGame.MatchTypes = [mbgGame.MatchType.Exchange, mbgGame.MatchType.Refresh, mbgGame.MatchType.AddLv];

cc.Class({
  extends: cc.Component,
  properties: {
    content: cc.Node,
    sv: cc.ScrollView,
  },
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_tcgamble');

    emitter.on(this, "refreshGamble", this.refreshMe);

    // 保存模版
    this.itemGambleTemplate = cc.instantiate(this.content.children[0]);
    this.content.removeAllChildren();
  },
  onDestroy() {
    emitter.off("refreshMe");
  },
  initItemGambleNodes() {
    if (!this.m_Type2ItemGamble) {
      this.m_Type2ItemGamble = {};
      let node = cc.instantiate(this.itemGambleTemplate);
      this.content.addChild(node);
      this.m_Type2ItemGamble[mbgGame.MatchType.Exchange] = node;
      node = cc.instantiate(this.itemGambleTemplate);
      this.content.addChild(node);
      this.m_Type2ItemGamble[mbgGame.MatchType.Refresh] = node;
      node = cc.instantiate(this.itemGambleTemplate);
      this.content.addChild(node);
      this.m_Type2ItemGamble[mbgGame.MatchType.AddLv] = node;
    }
  },
  getItemGamble(matchType, matchUUID) {
    const node = this.m_Type2ItemGamble[matchType];
    if (!node) {
      return null;
    }
    const com = node.getComponent("itemGamble");
    if (com.m_MatchUUID === matchUUID) {
      return com;
    }
    return null;
  },
  onAddBaseWin(args) {
    this.refreshMe(false, () => {
      mbgGame.log("[panelGamble] refreshMe ok");
      if (!this.isValid) {
        mbgGame.log("[panelGamble] !isValid");
        return;
      }
      if (args) {
        const matchType = args[0];
        const matchUUID = args[1];
        const result = args[2];
        const itemGamble = this.getItemGamble(matchType, matchUUID);
        if (itemGamble) itemGamble.afterWatch(result);
      }
    });
  },
  refreshMe(force, cb) {
    if (force) {
      mbgGame.removeCache('gamble.info');
    }
    const data = mbgGame.getCache('gamble.info', 60);
    if (!data) {
      mbgGame.gameScene.setWait(mbgGame.getString("waitStr_data"));
      mbgGame.checkNetCache('gamble.info', this.refreshMe.bind(this, false, cb));
      return;
    }
    mbgGame.gameScene.setWaitOver();
    if (!this.isValid) {
      return;
    }
    this.initItemGambleNodes();
    mbgGame.log("[gamble] refreshMe", data);
    for (let i = 0; i < mbgGame.MatchTypes.length; i++) {
      const matchType = mbgGame.MatchTypes[i];
      const curMatchUUID = data.cur[matchType];
      const stakedMatchUUID = data.staked[matchType];
      //  优先显示已经下注的
      const matchUUID = stakedMatchUUID || curMatchUUID;
      const dMatchData = data.data[matchUUID];
      const node = this.m_Type2ItemGamble[matchType];
      const com = node.getComponent("itemGamble");
      if (!dMatchData.t) {
        // 坏的数据
        node.active = false;
      } else {
        com.initMe(matchType, matchUUID, dMatchData);
      }
    }

    const stakedSidList = [];
    for (const matchType in data.staked) {
      const matchUUID = data.staked[matchType];
      const dMatchData = data.data[matchUUID];
      if (dMatchData.d && dMatchData.d.in && dMatchData.d.in.sid) {
        stakedSidList.push(+dMatchData.d.in.sid);
      }
      // 预期结束时间 也可能提前结算了
      let leftTime = dMatchData.e ? 0 : dMatchData.s + mbgGame.player.getGambleInterval(matchType) - moment().unix();
      leftTime = Math.max(0, leftTime);
      const title = mbgGame.getString(`title_match${matchType}`);
      mbgGame.localPush(leftTime, `【${title}】战斗已开始`);
    }
    // 验证背包的道具是否存在已加锁但是又不在下注清单里的
    const dOwn = mbgGame.player.getOwnedItems();
    const sidListNeedUnlock = [];
    for (let sid in dOwn) {
      sid = +sid;
      const dItem = dOwn[sid];
      if (dItem.l2 || dItem.l3) {
        if (stakedSidList.indexOf(sid) === -1) {
          // 不在下注清单
          sidListNeedUnlock.push(sid);
        }
      }
    }
    if (sidListNeedUnlock.length > 0) {
      mbgGame.netCtrl.sendMsg("gamble.fixitems", {
        sids: sidListNeedUnlock,
      });
    }
    if (cb) cb();
  },
  scrollToOffset(matchType) {
    let h = 0;
    for (let t = 1; t <= 3; t += 1) {
      const node = this.m_Type2ItemGamble[matchType];
      if (!node) {
        continue;
      }
      h += node.height;
      if (t === matchType) break;
    }
    this.sv.scrollToOffset(cc.v2(0, h), 0.3);
  },
});