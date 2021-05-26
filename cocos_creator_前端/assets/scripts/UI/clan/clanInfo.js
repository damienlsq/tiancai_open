const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    flag: cc.Node,
    clanName: cc.Node,
    memberCount: cc.Node,
    owner: cc.Node,
    totalScore: cc.Node,
    needScore: cc.Node,
    btnApply: cc.Node,
  },

  initMe(data, isRank) {
    // mbgGame.log('data', data);
    this.clanUUID = data.uuid;
    if (this.flag && data.flag != null) {
      mbgGame.managerUi.addIconFlag(this.flag, data.flag);
    }
    mbgGame.setLabel(this.clanName, data.name);
    mbgGame.setLabel(this.owner, mbgGame.getString("clanOwner", {
      owner: data.owner,
    }));
    mbgGame.setLabel(this.memberCount, `${mbgGame.getString("clanCountIntro")}${data.count} / ${mbgGame.config.constTable.clanMemberMax}`);
    /*
    // 计算距离
    const myGeo = mbgGame.getGeo();
    const clanGeo = mbgGame.buildGeo(data.geo);
    const d = mbgGame.calcDistance(myGeo, clanGeo);
    let unit = mbgGame.getString('km');
    let dis = '??';
    if (d >= 10) {
      dis = d.toFixed(0);
    } else if (d >= 1) {
      dis = d.toFixed(1)
    } else if (d < 1) {
      unit = mbgGame.getString('mi');
      dis = (d * 1000).toFixed(0);
    }
    this.dist.node.active = false;
    屏蔽获取玩家geo
    this.dist.string = mbgGame.getString("clanDis", {
      dis, unit,
    });
    mbgGame.getString('km');
    */
    mbgGame.setLabel(this.totalScore, mbgGame.getString('clanTotalScore', {
      score: data.tScore || 0,
    }));
    mbgGame.setLabel(this.needScore,
      mbgGame.getString('clanNeedScore', {
        score: data.score || 0,
      }));
  },

  viewInfo() {
    mbgGame.gameScene && mbgGame.gameScene.setWait(mbgGame.getString("waitStr_data"));
    mbgGame.netCtrl.sendMsg("clan.clanInfo", {
      uuid: this.clanUUID,
    }, (data) => {
      // mbgGame.log('viewInfo:', data);
      mbgGame.gameScene && mbgGame.gameScene.setWaitOver();
      if (data.code === 'ok') {
        // 打开显示
        mbgGame.resManager.loadPrefab('clanDetail', (prefab) => {
          const node = cc.instantiate(prefab);
          data.data.uuid = this.clanUUID;
          mbgGame.managerUi.addNormalWin(node, 'clanDetail', data.data);
        });
      }
    });
  },
});
