cc.Class({
  extends: cc.Component,

  properties: {
    debug1Layout: cc.Node,
    btnContent: cc.Node,
    content: cc.Node,
    debug2Layout: cc.Node,
    spineContent: cc.Node,
    aniLabel: cc.Label,
    charaContent: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = '开发';
    this.m_Idx = 0;
    for (let i = 0; i < 15; i++) {
      const node = this.charaContent.children[i];
      node._charaID = i + 1;
      const sprite = node.getComponent(cc.Sprite);
      mbgGame.resManager.setImageFrame(sprite, 'images', `chara_front_${node._charaID}`);
    }

    this.btnTemplate = this.btnContent.children[0];
    this.btnContent.removeAllChildren();

    const btnDebug = {
      解锁时空探险: 'debug.unlockraid',
      解锁日常: 'debug.unlockDayWar',
      解锁支线: 'debug.unlockstoryworld',
      解锁所有关卡: 'debug.allstorystages',
      升级时空探险: 'debug.upgraderaid',
      解锁主线布阵: 'debug.unlockStoryScheme',
      清小怪进度: 'debug.cleanStoryProgress',

      解锁天才争霸: 'debug.unlockArena',
      解锁天才竞猜和随便: 'debug.unlockTCBattle',

      解锁自动技能: 'debug.unlockBotting',
      解锁联盟: 'debug.unlockClan',
      解锁天赋系统: 'debug.unlockTalentSys',
      解锁所有楼层: 'debug.unlockallbuild',
      所有书: 'debug.allBook',
      给工作: 'debug.addtask',
      给宝箱: 'debug.giveChest',
      研究所等级加1: 'debug.addlablv',
      升天赋: '',

      给金币: 'debug.addCoin',
      给斗币: 'debug.addMat',
      给钻石: 'debug.addDiamond',
      给体力: 'debug.addSta',
      给联盟币: 'debug.addGem',
      给成就星: 'debug.addStar',
      给道具: 'debug.allitem',
      角色等级加10: 'debug.upgradechara',
      技能和角色等级加10: this.onUpCharaAndSkill,

      更新PVP缓存: 'debug.updateArena',
      赛季日结: 'debug.arenaDayEnd',
      赛季结束: 'debug.arenaSeasonEnd',
      测试结算: 'debug.warresult',

      竞猜结算: 'debug.closeMatch',
      竞猜查询: 'gamble.info',
      竞猜确认: this.onConfirmGamble,
      竞猜下注: this.onMakeStake,

      重新游戏不带剧情: this.onResetGameNoNewbie,
      重新游戏: this.onResetGame,
      重置剧情: this.onResetNewbiePlot,
      完成剧情: this.onFinishPlots,
      更改UUID: this.onSetUUID,
      查看主角动作: this.onHeros.bind(this),
      查看怪物动作: this.onMonsters.bind(this),
      积分修改: this.onSetPVPScore,
      时空探险等级修改: this.onSetRaidLv,
    };

    _.mapKeys(btnDebug, (cmd, name) => {
      const btn = cc.instantiate(this.btnTemplate);
      mbgGame.setLabel(cc.find('label', btn), name);
      btn._debugCMD = cmd;
      this.btnContent.addChild(btn);
    });
  },
  onClickBtn(event) {
    if (!event.target._debugCMD) return;
    if (_.isFunction(event.target._debugCMD)) {
      event.target._debugCMD();
      return;
    }
    mbgGame.log(`发送 [${event.target._debugCMD}]`);
    mbgGame.netCtrl.sendMsg(event.target._debugCMD, {},
      (x) => {
        mbgGame.log(`返回 [${event.target._debugCMD}]:`, x);
      });
  },
  onPre() {
    if (this.m_Idx === 0) {
      this.m_Idx = this.m_animations.length - 1;
    } else {
      this.m_Idx -= 1;
    }
    this.changeAllAni(this.m_Idx);
  },
  onNext() {
    if (this.m_Idx === this.m_animations.length - 1) {
      this.m_Idx = 0;
    } else {
      this.m_Idx += 1;
    }
    this.changeAllAni(this.m_Idx);
  },
  onHeros() {
    this.m_Idx = 0;
    this.debug1Layout.active = false;
    this.debug2Layout.active = true;
    this.m_spineCtrls = [];
    for (let i = 1; i <= 15; i++) {
      const fighterNode = cc.instantiate(mbgGame.preloadRes.fighter);
      // var fighter = fighterNode.getComponent('fighter');
      this.spineContent.addChild(fighterNode);
      const com = fighterNode.getComponent('fighter');
      com.m_Data = {};
      com.setSpineName(`chara${i}`);
      // com.addHp(-1);
      // com.initBloodBar();
      // fighterNode.x = 200;
      // fighterNode.y = -50;
      fighterNode.width = 150;
      fighterNode.height = 150;
      const self = this;
      com.spineCtrl().onSpineLoad = function () {
        self.onInited(this);
      };
      com.spineCtrl().loadSpine(`chara${i}`);
      this.m_spineCtrls.push(com.spineCtrl());
    }
  },
  onMonsters() {
    this.debug1Layout.active = false;
    this.debug2Layout.active = true;
    const monsters = [];
    this.m_animations = ['airAttack', 'attack', 'defense', 'die', 'miss', 'resurrection', 'skill', 'stand', 'walk'];
    _.forEach(mbgGame.config, (v, k) => {
      if (k.indexOf('mtpl') === -1) return;
      if (k === 'mtpl99') return;
      monsters.push(k);
    });
    this.m_spineCtrls = [];
    for (let i = 0; i < monsters.length; i++) {
      const mtpl = monsters[i];
      const monsterConfig = mbgGame.config[mtpl];
      if (!monsterConfig || !monsterConfig.spine) continue;
      // mbgGame.log('monsterConfig', monsterConfig, +mtpl.substring(4));
      const fighterNode = cc.instantiate(this.fighter);
      // var fighter = fighterNode.getComponent('fighter');
      this.spineContent.addChild(fighterNode);
      const com = fighterNode.getComponent('fighter');
      fighterNode.width = 150;
      fighterNode.height = 300;

      com.m_Data = {
        type: +mtpl.substring(4) <= 15 ? 0 : 1,
      };
      com.setCharaID(+mtpl.substring(4));
      com.setSpineName(monsterConfig.spine);
      com.spineCtrl().loadSpine(monsterConfig.spine);

      com.ctrl().say({
        text: '测试文字高度',
      });
      this.m_spineCtrls.push(com.spineCtrl());
    }
  },
  onInited(spineCtrl) {
    // com.spineCtrl().doSequenceAction("defense", "stand");
    let animations = spineCtrl.spine().skeletonData.skeletonJson.animations;
    animations = _.keys(animations);
    spineCtrl.m_animations = animations;
    this.m_animations = animations;
    spineCtrl.m_Idx = 0;
    // mbgGame.log("animations", animations);
    this.changeAni(spineCtrl, animations, spineCtrl.m_Idx);
  },
  changeAllAni(idx) {
    for (let i = 0; i < this.m_spineCtrls.length; i++) {
      const spineCtrl = this.m_spineCtrls[i];
      this.changeAni(spineCtrl, this.m_animations, idx);
    }
  },
  changeAni(spineCtrl, animations, idx) {
    spineCtrl.doAction(animations[idx], true);
    this.aniLabel.string = animations[idx];
  },
  onConfirmGamble() {
    mbgGame.netCtrl.sendMsg("gamble.info", {
    }, (data) => {
      mbgGame.log("onGambleInfo", data);
      if (data.code === "ok") {
        const dMatch = data.data.data;
        for (const matchUUID in dMatch) {
          mbgGame.netCtrl.sendMsg("gamble.confirm", {
            uuid: matchUUID,
          }, (data) => {
            mbgGame.log("onConfirmGamble", data);
          });
        }
      }
    });
  },
  onMakeStake() {
    mbgGame.netCtrl.sendMsg("gamble.makeStake", {
      type: 1,
      result: 1,
    }, (data) => {
      mbgGame.log("onMakeStake type 1", data);
    });
    mbgGame.netCtrl.sendMsg("gamble.makeStake", {
      type: 2,
      result: 1,
    }, (data) => {
      mbgGame.log("onMakeStake type 2", data);
    });
  },

  onUnlockChara(event) {
    const charaID = event.target._charaID;
    mbgGame.netCtrl.sendMsg("debug.unlockchara", {
      charaID,
    });
  },

  onSetRaidLv(editbox) {
    mbgGame.managerUi.createLineEditor({
      title: "改时空探险等级",
      info: "输入想设置的等级",
      hint: mbgGame.getString("editHint"),
      limit: 80,
    }, (lv) => {
      lv = lv.trim();
      mbgGame.netCtrl.sendMsg("debug.setRaidLv", {
        lv,
      }, (data) => {
        mbgGame.log("onSetRaidLv, res:", data);
      });
    });
  },
  onSetPVPScore() {
    mbgGame.managerUi.createLineEditor({
      title: "改争霸积分",
      info: "输入想设置的积分",
      hint: mbgGame.getString("editHint"),
      limit: 80,
    }, (score) => {
      score = score.trim();
      mbgGame.netCtrl.sendMsg("debug.setPVPScore", {
        score,
      }, (data) => {
        mbgGame.log("onSetPVPScore,res:", data);
      });
    });
  },
  onToggleWarDebug() {
    this.m_WarDebug = !this.m_WarDebug;
    mbgGame.netCtrl.sendMsg("war.setDebug", {
      enabled: this.m_WarDebug,
    }, (data) => {
      mbgGame.log("[setDebug]", data);
    });
  },
  onToggleServer() {
    if (mbgGame.host === "") {
      mbgGame.host = "";
      cc.sys.localStorage.setItem("server", mbgGame.host);
      mbgGame.managerUi.floatMessage("准备切换至qd服");
    } else {
      mbgGame.host = "";
      cc.sys.localStorage.setItem("server", mbgGame.host);
      mbgGame.managerUi.floatMessage("准备切换至bs2-dev服");
    }
    this.scheduleOnce(() => {
      mbgGame.restart();
    }, 2);
  },
  onSetUUID() {
    mbgGame.managerUi.createLineEditor({
      title: "使用该UUID的账号",
      info: "输入一个合法的UUID",
      hint: mbgGame.getString("editHint"),
      limit: 80,
    }, (str) => {
      str = str.trim();
      mbgGame.removeLocalData();
      mbgGame.setSaveUUID(str);
      mbgGame.state.uuid = str;
      mbgGame.restart();
    });
  },

  onResetGame() {
    // mbgGame.log("[ResetGame]");
    cc.sys.localStorage.removeItem("noNewbie");
    mbgGame.netCtrl.sendMsg("player.removeData", {}, () => {
      mbgGame.removeLocalData();
      mbgGame.restart(); // 收到删除回复才重置
    });
  },

  // 重置不开剧情
  onResetGameNoNewbie() {
    // mbgGame.log("[ResetGame]");
    mbgGame.netCtrl.sendMsg("player.removeData", {}, () => {
      mbgGame.removeLocalData();
      cc.sys.localStorage.setItem("noNewbie", 'on');
      mbgGame.restart(); // 收到删除回复才重置
    });
  },

  onResetNewbiePlot() {
    cc.sys.localStorage.removeItem("noNewbie");
  },
  onFinishPlots() {
    mbgGame.netCtrl.sendMsg("debug.finishPlots", {});
  },
  onUpCharaAndSkill() {
    mbgGame.netCtrl.sendMsg("debug.upgradechara", { upskill: true });
  },

});