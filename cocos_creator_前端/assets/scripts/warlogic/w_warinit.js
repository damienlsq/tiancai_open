const CWar = require('./w_war');
const defines = require('./w_defines');
const utils = require('./w_utils');


// GS要求设置一些oWar的属性
function autoSetWarAttr(oWar, dData) {
  if (dData.stageIdx) {
    oWar.setStageIdx(dData.stageIdx);
  }
  if (dData.stageID) {
    oWar.setStageID(dData.stageID);
  }
  if (dData.ft) {
    oWar.setForceEndTime(dData.ft);
  }
  if (dData.fpt) {
    oWar.setFramesPerTick(dData.fpt);
  }
  if (dData.canstop != null) {
    oWar.setCanStop(dData.canstop);
  }
  if (dData.shortid != null) {
    oWar.setShortID(dData.shortid);
  }
  if (dData.noEnchant) {
    oWar.setNoEnchant(1);
  }
  if (dData.gsvar) {
    oWar.setGSVar(dData.gsvar);
  }
  // 战斗场景的背景
  if (dData.bg) {
    oWar.setBg(dData.bg);
  }
  if (dData.cinfo) {
    oWar.setInfoForClient(dData.cinfo);
  }
  if (dData.targetUUID) {
    oWar.setTargetUUID(dData.targetUUID);
  }
  if (dData.frt) {
    oWar.setForceReadyTime(dData.frt);
  }
  if (dData.botting) {
    // oWar.wlog("autoSetWarAttr", dData.botting);
    for (let i = 0; i < defines.bothTeams.length; i++) {
      const iTeam = defines.bothTeams[i];
      const charaIDs = dData.botting[iTeam];
      oWar.setBottingConfig(iTeam, {
        charaIDs,
        auto: iTeam === defines.TEAM_LEFT ? dData.auto : 1,
      });
    }
    // oWar.wlog("oWar.m_Botting", oWar.m_Botting);
  }
}

function createWarByData(dData, wID, listener) {
  const oWar = new CWar();
  oWar.enableLog();
  oWar.setWarID(wID);
  dData.wID = wID;
  if (!dData.replay && dData.record) {
    //  oWar.wlog("record begin", dData.worldIdx);
    oWar.setRecordEnabled(true);
    // oWar.wlog("md5 of warData:", md5(JSON.stringify(oWar.m_WarAllData)));
  }
  if (oWar.isRecordEnabled() || dData.cwar) {
    oWar.setWarInitData(utils.deepClone(dData));
  }
  if (dData.cwar) {
    oWar.setClientWar(1);
  }
  oWar.setWorldIdx(dData.worldIdx);
  oWar.setCreateTime(dData.ct);
  if (dData.seed) {
    oWar.setSeed(dData.seed);
  }
  oWar.registerListener(listener);
  if (listener) {
    listener.setWar(oWar);
  }
  // oWar.wlog(JSON.stringify(dData));
  if (dData.replay) {
    // const dReplayData = utils.deepClone(dData);
    // delete dReplayData.result;
    // delete dReplayData.opList;
    // delete dReplayData.replay;
    // const sData = JSON.stringify(dReplayData);
    // oWar.wlog("md5 of replay warData:", md5(sData));
    // oWar.wlog(sData);
    // fs.writeFile("wreplay.js", `const dData = JSON.parse(\`${JSON.stringify(dReplayData)}\`); module.exports = dData;`);
    // oWar.wlog("replay opList", dData.opList, "result", dData.result);
    oWar.setReplayModeEnabled(true);
    oWar.setReplayResult(dData.result);
    oWar.setClientOpList(dData.opList);
    if (dData.lastframe) {
      oWar.m_lastframe = dData.lastframe;
    }
    if (dData.haltTime) {
      const [percent, seconds] = dData.haltTime;
      let haltSeconds = 0;
      if (percent && dData.cst) {
        haltSeconds = Math.round(dData.cst * 0.5);
      } else {
        haltSeconds = seconds;
      }
      oWar.setHaltTime(haltSeconds);
    }
    // oWar.wlog(`setClientOpList:`, dData.opList);
  }
  if (dData.token) {
    oWar.setToken(dData.token);
  }
  if (dData.targetToken) {
    oWar.setTargetToken(dData.targetToken);
  }
  autoSetWarAttr(oWar, dData);
  if (dData.team) {
    if (dData.team.left) {
      oWar.initTeam(defines.TEAM_LEFT, dData.team.left, dData.item && dData.item[defines.TEAM_LEFT]);
    }
    if (dData.team.right) {
      oWar.initTeam(defines.TEAM_RIGHT, dData.team.right, dData.item && dData.item[defines.TEAM_RIGHT]);
    }
  }
  return oWar;
}

module.exports = {
  autoSetWarAttr,
  createWarByData,
};