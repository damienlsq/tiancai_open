const defines = require('warDefines');
const warBase = require('warBase');

cc.Class({
  extends: warBase,

  properties: {
  },

  // use this for initialization
  onLoad() {
  },
  // 收到syncok后才处理缓存的warevent
  // Note:三个世界的data混在一起
  cacheWarEvent(data) {
    if (!this.m_EventCache) {
      this.m_EventCache = [];
    }
    this.m_EventCache.push(data);
  },
  handleCachedWarEvent() {
    if (!this.m_EventCache) {
      return;
    }
    for (let i = 0; i < this.m_EventCache.length; i += 1) {
      const data = this.m_EventCache[i];
      this.onWarEvent(data);
    }
    delete this.m_EventCache;
  },
  onFadeBlack(worldIdx, dData) {
    const com = this.warMgr().getWarCom(worldIdx);
    if (!com) {
      emitter.emit('closeMe');
      return;
    }
    this.warMgr().showWorldNode();
    com.initWar(worldIdx, dData);
    this.warUtils().doStartAnalytisc(com);
    if (!com.isTimerNeeded()) {
      com.uiWar.closeTimer();
    } else if (!com.isStarted()) {
      com.showWarning();
    }
    if (worldIdx === 0) {
      com.setWarEnd(false);
    }
    if ([1, 2, 3, 6].indexOf(worldIdx) !== -1 && !mbgGame.player.canFightStoryStageBoss(worldIdx, com.stageIdx())) {
      // 剧情小怪战
      com.playWarMusic("battleBoss", true);
    } else {
      com.playWarMusic("battleSpeed", true);
    }
    emitter.emit('closeMe');
  },
  onWarEvent(data) {
    if (!mbgGame._dataReady || !mbgGame._resReady) {
      this.cacheWarEvent(data);
      return;
    }
    try {
      const dData = data.data;
      //   mbgGame.log("[onWarEvent]", JSON.stringify(data));
      const worldIdx = data.world;
      if (data.event === "Init" || data.event === "Reset") {
        mbgGame.log("war init", worldIdx, "dData.resume", dData.resume);
        if (worldIdx !== defines.newbieWorldIdx) {
          if (!dData.resume) {
            this.warMgr().releaseAllWars();
          }
        }
        if (dData.resume) {
          mbgGame.warCtrl.releaseAllWars(); // 释放掉客户端战斗
        }
        this.warMgr().createWar(worldIdx);
        this.warMgr().showWar();
      }
      const com = this.warMgr().getWarCom(worldIdx);
      if (!com) {
        return;
      } if (data.event === "Reset") {
        mbgGame.log("Reset", dData);
        const wID = mbgGame.warCtrl.createWar(dData.init);
        com.setFwdPair(dData.fwdPair);
        // TODO: 播放op
        const oWar = mbgGame.warCtrl.getWar(wID);
        if (dData.replay) {
          oWar.setClientReplay();
        }
        const dWarData = oWar.getState();
        com.setClientWarID(wID);
        mbgGame.log("dWarData", dWarData);
        this.warMgr().fadeToBlack(this.onFadeBlack.bind(this, worldIdx, dWarData), this);
      } else if (data.event === "Init") {
        com.setClientWarID(null);
        this.warMgr().fadeToBlack(this.onFadeBlack.bind(this, worldIdx, dData), this);
      } else if (data.event === "UE") {// Update Energy
        const e = dData.e;
        com.setEnergy(e);
      } else if (data.event === "Emote") {
        com.uiWar.doEmote(dData.id);
      } else if (data.event === "UnitInfo") {
        const dUnitData = data.data;
        const ID = dUnitData.ID;
        mbgGame.log("[war] UnitInfo:", dUnitData);
        if (ID > 15) {
          this.warUtils().getMonsterInfo(ID, dUnitData.info.lv, 'war', (dMonsterData) => {
            // 和GS拿固定的怪物数据dMonsterData，然后把战时的怪物数据assgin到固定的
            dUnitData.info = _.assignIn(_.clone(dMonsterData), dUnitData.info);
            // mbgGame.log("[war] monster:", JSON.stringify(dUnitData));
            mbgGame.managerUi.openWinCharaInfo(ID, {
              charaData: dUnitData.info,
            });
          });
        } else {
          mbgGame.managerUi.openWinCharaInfo(ID, {
            charaData: dUnitData.info,
          });
        }
      } else if (data.event === "AC") {
        for (let objID in dData.o2a) {
          objID = +objID;
          const actions = dData.o2a[objID];
          const fighter = com.getFighterByObjID(objID);
          if (fighter) {
            fighter.cmdCtrl().handleAction(actions);
          } else {
            cc.warn("no fighter", objID, actions);
          }
        }
      } else if (data.event === "SetBotting") {
        if (com.isWarInited()) {
          mbgGame.log("SetBotting", data.data);
          emitter.emit("SetBotting", data.data.auto);
        }
      } else if (data.event === "Revive") {
        const fighter = com.getFighterByObjID(dData.objID);
        const hp = data.data.hp;
        if (fighter) {
          fighter.ctrl().revive();
          fighter.setHp(hp);
        }
      } else if (data.event === "ShowDesc") {
        mbgGame.log("onShowDesc", dData);
        let mainfighter = com.getFighterByPosIdx(defines.TEAM_LEFT, 0);
        if (dData.mydesc && mainfighter) {
          mainfighter.ctrl().say({
            text: dData.mydesc,
            arrowType: 0,
            aboutHide: true,
            hideDelay: 2,
          });
        }
        mainfighter = com.getFighterByPosIdx(defines.TEAM_RIGHT, 0);
        if (dData.targetdesc && mainfighter) {
          mainfighter.ctrl().delaySay(1, {
            text: dData.targetdesc,
            arrowType: 0,
            aboutHide: true,
            hideDelay: 2,
          });
        }
      } else if (data.event === "WarEnd") {
        if (!com.isReplayMode() && !com.isStarted()) {
          return;
        }
        mbgGame.log("warEvent WarEnd", worldIdx);
        mbgGame.performanceCheck("WarEnd", '1', true);
        com.setStarted(false);
        com.setWarResult(dData.result);
        emitter.emit("updateSkillBtn", "WarEnd");
        this.scheduleOnce(() => {
          emitter.emit('fightEnd');
        }, 1);
        com.uiWar.closeTimer();
        mbgGame.performanceCheck("WarEnd", '2');
        if (com.isReplayMode()) {
          if (dData.result === mbgGame.WarWin) {
            com.doWinAction(defines.TEAM_LEFT);
          } else if (dData.result === mbgGame.WarFail) {
            com.doWinAction(defines.TEAM_RIGHT);
          }
          this.scheduleOnce(() => {
            this.warMgr().onCloseWarResultPanel(com.worldIdx, true);
          }, 2);
          return;
        }
        if (worldIdx === 99) {
          mbgGame.removeCache('arena.record');
          if (!com.isDefender()) {
            if (dData.result === mbgGame.WarWin) {
              com.doWinAction(defines.TEAM_LEFT);
            } else if (dData.result === mbgGame.WarFail) {
              com.doWinAction(defines.TEAM_RIGHT);
            }
          }
          if (com.isDefender()) {
            if (dData.result === mbgGame.WarFail) {
              com.doWinAction(defines.TEAM_LEFT);
            } else if (dData.result === mbgGame.WarWin) {
              com.doWinAction(defines.TEAM_RIGHT);
            }
          }
          // 改为点完报告UI的确定按钮时关闭战斗界面
        }
        if (defines.StoryWorlds.indexOf(worldIdx) !== -1 || worldIdx === 5) {
          if (com.isClientWar()) {
            com.setWarEndData(dData);
          }
          // 获取并播放战后剧情
          if (dData.result === mbgGame.WarWin) {
            if (com.isBossFight()) com.requestPlot(worldIdx, com.stageIdx(), 1);
            else com.onFinishPlot(worldIdx, 1);
          }
        }
        if (defines.PVEWorlds.indexOf(worldIdx) !== -1) {
          this.warUtils().doResultAnalytisc(com, dData.result);
          const dontRevive = com.dayWarType() === "wheelwar";
          mbgGame.log("com.dayWarType() ", com.dayWarType());
          if (dData.result === mbgGame.WarWin) {
            com.doWinAction(defines.TEAM_LEFT, dontRevive);
          }
        }
        if (dData.result === mbgGame.WarFail) {
          mbgGame.player.warLostAnaly({
            left: com.getTeamData(defines.TEAM_LEFT),
            right: com.getTeamData(defines.TEAM_RIGHT),
          });
        }
        mbgGame.performanceCheck("WarEnd", '3');
      } else if (data.event === "StartTeams") {
        com.setWarDuration(dData.duration);
        com.setWarBeginTime(dData.beginTime);
        com.setStarted(true);
        com.eachFighter((fighter) => {
          fighter.ctrl().onStart();
        });
        com.setShowUIPanel(true);
        if (com.isTimerNeeded()) {
          com.uiWar.showTimer();
        }
      } else if (data.event === "Error") {
        const noWarn = true;
        const str = mbgGame.getString(`errcode${dData.err}`, {}, noWarn);
        if (str) {
          mbgGame.managerUi.floatMessage(str);
        }
      } else {
        mbgGame.error("[warEvent] unknown event", data.event);
      }
    } catch (e) {
      mbgGame.log('onWarEvent error, event', data.event);
      mbgGame.error(e);
      mbgGame.log('onWarEvent error, event', data.event);
      mbgGame.error(e);
    }
  },
});