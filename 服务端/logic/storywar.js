const defines = require('./w_defines');
const CBase = require('./base');


// ///////////////////////////////////////////////////////////////////////////
// Plot 剧情逻辑代码
// ////////////////////////////////////////////////////////////////////////////
class CPlotCtrl extends CBase {
  calPlotData(iPlotID) {
    const dialogIDs = mbgGame.config.PlotID2DialogIDs[iPlotID];
    if (_.isEmpty(dialogIDs)) {
      return null;
    }
    const dData = {
      plotID: iPlotID,
    };
    const pobj = this.pobj();
    const dialogConfigs = [];
    if (dialogIDs.length) {
      for (let i = 0; i < dialogIDs.length; i++) {
        const dialogID = dialogIDs[i];
        const dConfig = _.clone(mbgGame.config[`dialog${dialogID}`]);
        if (!dConfig) {
          this.logError("[dialog] no config, iPlotID:", iPlotID, ", dialogID:", dialogID);
          continue;
        }
        // 删除空字段减少发包体积
        if (dConfig.event === 0) {
          delete dConfig.event;
        }
        if (dConfig.team === 0) {
          delete dConfig.team;
        }
        dConfig.str = pobj.getString(`dialog${dialogID}`, null, true);
        let mTpl = dConfig.mTpl;
        if (mTpl > 0) {
          if (mTpl <= 15) mTpl += 4000;
          const dTplConfig = mbgGame.config[`mtpl${mTpl}`];
          if (dTplConfig) {
            dConfig.scale = dTplConfig.Scale;
          } else {
            this.logError("[dialog] dTplConfig, iPlotID:", iPlotID, ", dialogID:", dialogID, "mTpl", dConfig.mTpl);
          }
        }
        dialogConfigs.push(dConfig);
      }
    }
    dData.dialogConfigs = dialogConfigs;
    return dData;
  }
}


// ///////////////////////////////////////////////////////////////////////////
// 剧情战
// ////////////////////////////////////////////////////////////////////////////
class CStoryWar extends CPlotCtrl {
  // 暂时没用到
  getDBData() {
    let dDBData = this.pobj().getVal("story");
    if (!dDBData) {
      dDBData = {};
      this.pobj().setValOnly("story", dDBData);
    }
    return dDBData;
  }
  onSendStoryData() {
    const dDBData = this.getDBData();
    this.pobj().sendCmd("storydata", dDBData);
  }
  getSchemeData(worldIdx, schemeIdx, stageIdx) {
    if (worldIdx === defines.newbieWorldIdx) {
      if (stageIdx === 3) {
        return {
          charaIDs: [1, 3],
        };
      }
      return {
        charaIDs: [1],
      };
    }
    const dWorld = this.pobj().getWorldData(worldIdx);
    if (!dWorld) {
      return null;
    }
    if (schemeIdx == null) {
      schemeIdx = 0;
    }
    let dScheme;
    if (worldIdx >= 1 && worldIdx <= 3) {
      const requiredCharaIDs = _.filter(defines.CharaIDsByStoryWorld[worldIdx], (_charaID) => {
        return this.pobj().hasChara(_charaID);
      });
      dScheme = this.getSchemeDataDict(worldIdx, schemeIdx);
      dScheme.charaIDs = requiredCharaIDs;
    } else if (worldIdx === 6) {
      if (this.pobj().isStorySchemeUnlocked()) {
        return this.pobj().m_WarCommon.getSchemeData(defines.pvpWorldIdx, schemeIdx);
      }
      dScheme = this.getSchemeDataDict(worldIdx, schemeIdx);
      dScheme.charaIDs = this.pobj().calDefaultDefTeam();
    }

    return dScheme;
  }
  getSchemeDataDict(worldIdx, schemeIdx) {
    const dWorld = this.pobj().getWorldData(worldIdx);
    if (!dWorld.scheme) {
      dWorld.scheme = {};
    }
    if (!dWorld.scheme[schemeIdx]) {
      dWorld.scheme[schemeIdx] = {
      };
    }
    const dScheme = dWorld.scheme[schemeIdx];
    return dScheme;
  }
  onCharaUnlocked(charaID) {
    if (!this.pobj().isStorySchemeUnlocked()) {
      // 如果没放满人，自动丢进去
      const dScheme = this.getSchemeData(6);
      dScheme.charaIDs = dScheme.charaIDs || [];
      if (dScheme.charaIDs.indexOf(charaID) !== -1) {
        return;
      }
      for (let i = 0; i < 5; i++) {
        if (!dScheme.charaIDs[i]) {
          dScheme.charaIDs[i] = charaID;
          break;
        }
      }
    }
  }
  isWarBegan() {
    return this.m_WarBegan;
  }
  validBeginStoryWar(dParam) {
    if (this.m_WarBegan) {
      return mbgGame.config.ErrCode.Story_WarBegan;
    }
    const pobj = this.pobj();
    const worldIdx = dParam.worldIdx; // 哪个世界
    const stageIdx = dParam.stageIdx; // 哪一关
    if (worldIdx === defines.newbieWorldIdx) {
      // 开机剧情战 只验证flag
      if (
        (stageIdx >= 1 && stageIdx <= 2 && pobj.hasUnlockPlot(stageIdx))) {
        return mbgGame.config.ErrCode.OK;
      }
      return mbgGame.config.ErrCode.Story_NoStage;
    }
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return mbgGame.config.ErrCode.Story_WrongWorld;
    }
    if (!_.isNumber(stageIdx)) {
      return mbgGame.config.ErrCode.Story_WrongStageIdx;
    }
    if (pobj.m_PVECtrl.getCurMaxStageIdx(worldIdx) < stageIdx) {
      return mbgGame.config.ErrCode.Story_StageLocked;
    }
    const dStageConfig = defines.getStageConfig(worldIdx, stageIdx);
    if (_.isEmpty(dStageConfig)) {
      return mbgGame.config.ErrCode.Story_NoStage;
    }
    const costSta = dStageConfig.costSta;
    if (pobj.getSta() < costSta) {
      return mbgGame.config.ErrCode.LackSta;
    }
    return mbgGame.config.ErrCode.OK;
  }
  getStageData(worldIdx, stageIdx, dontCreate) {
    const pobj = this.pobj();
    const dWorld = pobj.getWorldData(worldIdx);
    if (!dWorld.d) {
      dWorld.d = {};
    }
    if (!dontCreate && !dWorld.d[stageIdx]) {
      dWorld.d[stageIdx] = [0, 0];// [progress 打赢过几波小怪, star boss战已经拿到几个星]
    }
    return dWorld.d[stageIdx];
  }
  getMonsterTeamData(worldIdx, stageID, stageIdx) {
    const pobj = this.pobj();
    if (worldIdx === defines.newbieWorldIdx) {
      return pobj.m_PVECtrl.getMonsterTeamData(worldIdx, stageID);
    }
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    const [progress, star] = this.getStageData(worldIdx, stageIdx);
    if (progress === (dStageConfig.wave || 2)) {
      return pobj.m_PVECtrl.getMonsterTeamData(worldIdx, stageID);
    }
    const stageLv = dStageConfig.lv;
    const mIDs = dStageConfig.mIDs;
    const dTeamData = {};
    let mNum = _.random(mIDs.length, mIDs.length + 1);
    mNum = Math.min(5, mNum);
    let posIdx = 0;
    for (let k = 0; k < mNum; k += 1, posIdx += 1) {
      const mID = mIDs[_.random(mIDs.length - 1)];
      const dWarData = pobj.m_PVECtrl.calMonsterWarData(mID, stageLv);
      dWarData.posIdx = posIdx;
      dTeamData[posIdx] = dWarData;
    }
    return dTeamData;
  }
  // 剧情模式战役、开机剧情战
  beginStoryWar(dParam) {
    const errCode = this.validBeginStoryWar(dParam);
    if (errCode) {
      return errCode;
    }
    const pobj = this.pobj();
    const worldIdx = dParam.worldIdx; // 哪个世界
    const stageIdx = dParam.stageIdx; // 哪一关
    const schemeIdx = Math.round(dParam.schemeIdx); // 哪一个阵型
    const dStageConfig = defines.getStageConfig(worldIdx, stageIdx);
    const stageID = defines.getStageRealID(worldIdx, stageIdx);
    const dScheme = this.getSchemeData(worldIdx, schemeIdx, stageIdx);
    if (_.isEmpty(dScheme.charaIDs)) {
      return mbgGame.config.ErrCode.Error;
    }
    const dItem = {};
    dItem[defines.TEAM_LEFT] = mbgGame.WarData.packWarData_Item(dScheme.bag, pobj.m_ItemBag.getItemDBData());
    const dBotting = {};
    dBotting[defines.TEAM_LEFT] = dScheme.botting;
    const dData = {
      ft: defines.getForceEndTime(worldIdx),
      worldIdx,
      stageIdx,
      stageID,
      lt: "PVE",
      record: true,
      bg: dStageConfig.bg,
      shortid: pobj.getShortID(),
      item: dItem,
      botting: dBotting,
      auto: pobj.isBottingEnabled(),
      team: {
        left: pobj.m_PVECtrl.getLeftTeamWarData(dScheme.charaIDs),
        right: this.getMonsterTeamData(worldIdx, stageID, stageIdx),
      },
      cwar: (worldIdx !== 5 && mbgGame.config.cwar) ? 1 : 0,
      sendInit: true,
      send: true,
    };
    dData.cinfo = pobj.m_PVECtrl.getClientInfo({
      stageID,
      charaID: defines.getFirstCharaID(dScheme.charaIDs),
      mID: dData.team.right[0].ID,
    });
    mbgGame.bsmgr.createWar(pobj, dData);
    this.m_curWorldIdx = worldIdx;
    this.m_curStageIdx = stageIdx;
    this.m_cwar = dData.cwar;
    return mbgGame.config.ErrCode.OK;
  }
  isClientWar() {
    return this.m_cwar;
  }
  // 战前剧情播放完后，真正开始战斗
  beginStoryWarReal() {
    if (this.m_WarBegan) {
      return mbgGame.config.ErrCode.Story_WarBegan;
    }
    const pobj = this.pobj();
    const worldIdx = this.m_curWorldIdx;
    const stageIdx = this.m_curStageIdx;
    if (worldIdx == null || stageIdx == null) {
      return mbgGame.config.ErrCode.Error;
    }
    delete this.m_curWorldIdx;
    delete this.m_curStageIdx;
    mbgGame.bsmgr.beginWar(pobj, {
      worldIdx,
    });
    this.m_WarBegan = true;
    this.m_WorldIdx = worldIdx; // 有用的，用来resumewar
    return null;
  }
  // 关卡第一次通关时的掉落（只掉一次）
  calStoryFirstDrop(worldIdx, stageIdx) {
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return null;
    }
    const stageID = defines.getStageRealID(worldIdx, stageIdx);
    const dStageConfig = mbgGame.config[`stage${stageID}`];
    return dStageConfig && dStageConfig.firstDrop;
  }
  // 胜利才会调用这个函数
  calStoryWarEnd(worldIdx, dWarEndData, wave, dWarResult, worldChanged) {
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return;
    }
    const lstData = this.getStageData(worldIdx, dWarEndData.stageIdx);
    const progress = lstData[0];
    const star = lstData[1];
    let newStar = 0;
    if (star > 0 || progress >= wave) {
      // 判定条件
      newStar = 1;
      // 1. 胜利
      // 2. 耗时小于等于1分钟
      // 3. 全部人没死
      if (dWarEndData.costTime <= 60) {
        newStar = 2;
        let deadCount = 0;
        const dHp = dWarEndData.hpinfo.left;
        for (const ID in dHp) {
          if (dHp[ID].hp <= 0) deadCount += 1;
        }
        if (deadCount === 0) newStar = 3;
      }
    } else {
      lstData[0] = progress + 1;
      worldChanged = true;
    }
    if (newStar > star) {
      lstData[1] = newStar;
      worldChanged = true;
    }
    if (worldChanged) this.pobj().onWorldDataChanged(worldIdx);
    dWarResult.stagestar = newStar;
    dWarResult.stageIdx = dWarEndData.stageIdx;
  }
  receiveChapterReward(chapterID, idx) {
    mbgGame.logger.info("receiveChapterReward", chapterID, idx);
    const dData = mbgGame.config.chapter[chapterID];
    const worldIdx = Math.floor(chapterID / 1000);
    const chapterIdx = chapterID % 1000;
    if (defines.StoryWorlds.indexOf(worldIdx) === -1) {
      return mbgGame.config.ErrCode.Error;
    }
    let starCount = 0;
    // 计算总星数够不够领取该奖励
    for (let i = 0; i < dData.stageID.length; i++) {
      const stageID = dData.stageID[i];
      const stageIdx = stageID % 1000;
      const lstData = this.getStageData(worldIdx, stageIdx, true);
      const star = (lstData && lstData[1]) || 0;
      starCount += star;
    }
    mbgGame.logger.info("starCount", starCount);
    const needStar = dData.stars[idx];
    if (needStar == null) {
      return mbgGame.config.ErrCode.Error;
    }
    if (starCount < needStar) {
      return mbgGame.config.ErrCode.Error;
    }
    // 是否已领取
    const dWorld = this.pobj().getWorldData(worldIdx);
    if (!dWorld.c) {
      dWorld.c = {};
    }
    if (!dWorld.c[chapterIdx]) {
      dWorld.c[chapterIdx] = {};
    }
    if (dWorld.c[chapterIdx][idx]) {
      return mbgGame.config.ErrCode.Error;
    }
    dWorld.c[chapterIdx][idx] = 1;// 标记领取
    this.pobj().onWorldDataChanged(worldIdx);
    // 给奖励
    const dAward = mbgGame.common.utils.deepClone(dData[`reward${idx + 1}`]);
    dAward.id = `chest${idx + 1}`;
    dAward.chestType = mbgGame.config.constTable.CWType6;
    this.pobj().giveAward(dAward, `chapter${chapterID}`);
    return null;
  }
  onWarEnd(worldIdx, dData) {
    if (!this.m_WarBegan) {
      return;
    }
    delete this.m_cwar;
    this.m_WarBegan = false;
    delete this.m_WorldIdx;
    const pobj = this.pobj();
    if (worldIdx === defines.newbieWorldIdx) {
      pobj.finishPlot(dData.stageIdx); // 1、2
      pobj.unlockPlot(dData.stageIdx + 1); // 2、3
    }
    if (dData.result === defines.WarWin) {
      if (worldIdx === 6) {
        if (dData.stageIdx === 1) {
          pobj.unlockPlot(4);
        }
      }
      const stageID = defines.getStageRealID(worldIdx, dData.stageIdx);
      const dStageConfig = mbgGame.config[`stage${stageID}`];
      const wave = dStageConfig.wave || 2;
      const costSta = dStageConfig.costSta;
      pobj.addSta(-costSta, null, 'story');
      let dFirstDrop;
      let worldChanged = false;
      if (defines.StoryWorlds.indexOf(worldIdx) !== -1) {
        const lstData = this.getStageData(worldIdx, dData.stageIdx);
        const dWorld = pobj.getWorldData(worldIdx);
        let totalStages = mbgGame.config.constTable.StoryStages;
        if (worldIdx === 6) {
          totalStages = 75;
        }
        if (lstData[0] >= wave) {
          if (worldIdx === 6) {
            if (dData.stageIdx === 2 && dData.result === defines.WarWin) {
              pobj.unlockPlot(5);
            } else if (dData.stageIdx === 3 && dData.result === defines.WarWin) {
              pobj.unlockPlot(6);
            } else if (dData.stageIdx === 4 && dData.result === defines.WarWin) {
              pobj.unlockPlot(7);
            }
          }
        }
        if (lstData[0] >= wave
          && dWorld.maxlv <= totalStages
          && dData.stageIdx === dWorld.maxlv) {
          dFirstDrop = this.calStoryFirstDrop(worldIdx, dData.stageIdx);
          // pobj.logInfo("[story] calStoryFirstDrop", dFirstDrop);
          // pobj.logInfo("[story] calStageDrop", dFirstDrop);
          const [chapterID, isLastStage] = mbgGame.config.stageID2ChapterID[stageID];
          pobj.logInfo("[story] first:", chapterID, isLastStage, dWorld.maxlv);
          if (isLastStage) {
            pobj.m_Stat.setStatVal(`maxchapter${worldIdx}`, chapterID % 1000);
          }
          dWorld.maxlv += 1;// 可以到constTable.StoryStages + 1
          pobj.m_Lab.checkUpgrade();
          worldChanged = true;
          if (dStageConfig.reward) {
            const rewards = typeof (dStageConfig.reward) === "string" ? [
              dStageConfig.reward,
            ] : dStageConfig.reward;
            pobj.doOnceReward(rewards);
          }
        }
      }
      let dDrop = {};
      // pobj.logInfo("[story] after boss drop", dDrop, stageID);
      if (dFirstDrop) {
        dDrop = pobj.concatAwardData(dDrop, dFirstDrop);
        //  pobj.logInfo("[story] after stage first drop", dDrop);
      }
      pobj.m_PVECtrl.calStageDrop(stageID, dData.charaIDs, dDrop);
      this.m_WarResult = pobj.m_WarCommon.giveAwardForWar(worldIdx, dData.charaIDs, dDrop, "story");
      this.calStoryWarEnd(worldIdx, dData, wave, this.m_WarResult, worldChanged);
    } else {
      pobj.sendCmd("warresult", {
        worldIdx,
        result: 2,
      });
    }
  }
  sendWarResult() {
    const pobj = this.pobj();
    if (this.m_WarResult) {
      pobj.sendCmd("warresult", this.m_WarResult);
      delete this.m_WarResult;
      return null;
    }
    return mbgGame.config.ErrCode.Error;
  }
}

module.exports = CStoryWar;