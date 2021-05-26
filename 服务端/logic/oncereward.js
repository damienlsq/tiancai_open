const defines = require('./w_defines');
const labdefines = require('./labdefines');

/*

  处理各种一次性奖励，如：解锁XXX

*/

const Key2Handler = {
  解锁时空探险: (pobj) => {
    const ok = pobj.m_RaidCtrl.unlock();
    if (!ok) {
      return;
    }
    pobj.m_RaidCtrl.onSendRaidData();
    const worldName = pobj.getString('title_stage9');
    pobj.sendMessage(
      worldName,
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_raid',
      });
  },
  解锁试炼: (pobj, raidIdx) => {
    raidIdx = +raidIdx;
    const ok = pobj.m_RaidCtrl.unlockRaidStage(raidIdx);
    if (!ok) {
      return;
    }
    pobj.m_RaidCtrl.onSendRaidData();
  },
  道具教学: (pobj) => {
    if (pobj.isFlagOn(defines.Flag.TeachItem)) {
      return;
    }
    pobj.setFlagOn(defines.Flag.TeachItem, true);
    pobj.sendCmd('showteach', {
      type: 'equip',
    });
  },
  解锁楼层: (pobj, floorType) => {
    floorType = +floorType;
    const ok = pobj.m_Lab.unlockFloor(floorType);
    if (!ok) {
      return;
    }
    if (floorType === labdefines.FloorType.Chest) {
      pobj.sendCmd('showteach', {
        type: 'chest',
      });
    }
    if (floorType === labdefines.FloorType.Talent) {
      return;
    }
    const floorname = pobj.getString(`floorname${floorType}`, {}, true);
    const floordesc = pobj.getString(`unlock_floor${floorType}`, {}, true);
    if (floordesc && floorname) {
      pobj.sendMessage(
        floorname,
        'unlock',
        {
          t: 1,
          type: 2,
          desci18n: `unlock_floor${floorType}`,
        });
    }
  },
  解锁英雄: (pobj, charaID) => {
    charaID = +charaID;
    const ok = pobj.unlockCharaByID(charaID);
    if (!ok) {
      return;
    }
    if (charaID === 2) {
      return;
    }
    const charaname = pobj.getString(`charaname${charaID}`);
    pobj.sendMessage(
      `${charaname}`,
      'unlock',
      {
        t: 1,
        type: 2,
        charaID,
        desci18n: `unlock_chara${charaID}`,
      });
  },
  解锁建筑: (pobj, facID, dontNotify) => {
    facID = +facID;
    const ok = pobj.m_Lab.unlockFac(facID);
    if (!ok) {
      return;
    }
    if (dontNotify) {
      return;
    }

    /*
    const facname = pobj.getString(`facname${facID}`);
    pobj.sendWarningAfterWar(`${facname}`);
    */
  },
  解锁属性: (pobj, sAttr, dontNotify) => {
    const ok = pobj.m_Lab.unlockAttr(sAttr);
    if (!ok) {
      return;
    }
    if (dontNotify) {
      return;
    }
    const facname = pobj.getString(`facname${sAttr}`);
    pobj.sendMessage(
      facname,
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: `unlock_${sAttr}`,
      });
  },
  解锁世界: (pobj, worldIdx) => {
    const ok = pobj.unlockStoryWorld(worldIdx);
    if (!ok) {
      return;
    }
    const worldname = pobj.getString(`title_stage${worldIdx}`);
    pobj.sendMessage(
      `${worldname}`,
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: `unlock_world${worldIdx}`,
      });
  },
  解锁支线: (pobj) => {
    let ok = true;
    ok |= pobj.unlockStoryWorld(1);
    ok |= pobj.unlockStoryWorld(2);
    ok |= pobj.unlockStoryWorld(3);
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      `平行世界大冒险`,
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: `unlock_world123`,
      });
  },
  解锁天才乱斗: (pobj) => {
    const ok = pobj.unlockTCBattle();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      '随便打打',
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_battle',
      });
  },
  解锁天才专场: (pobj) => {
    const ok = pobj.unlockHeroWar();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      pobj.getString('title_herowar'),
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_herowar',
      });
  },
  解锁金币副本: (pobj) => {
    const ok = pobj.unlockCoinWar();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      pobj.getString('title_coinwar'),
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_coinwar',
      });
  },
  解锁斗币副本: (pobj) => {
    const ok = pobj.unlockMatWar();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      pobj.getString('title_matwar'),
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_matwar',
      });
  },
  解锁天赋系统: (pobj) => {
    const ok = pobj.unlockTalentSys();
    if (!ok) {
      return;
    }
  },
  解锁争霸: (pobj) => {
    const ok = pobj.unlockArena();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      '天才争霸',
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_pvp',
      });
  },
  解锁时空乱斗: (pobj) => {
    const ok = pobj.unlockWheelWar();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      pobj.getString('title_wheelwar'),
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_wheelwar',
      });
  },
  解锁联盟: (pobj) => {
    const ok = pobj.unlockClan();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      pobj.getString('clan'),
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_clan',
      });
  },
  解锁自动: (pobj) => {
    const ok = pobj.unlockBotting();
    if (!ok) {
      return;
    }
  },
  解锁竞猜: (pobj) => {
    const ok = pobj.unlockGambleSys();
    if (!ok) {
      return;
    }
    pobj.sendMessage(
      '天才竞猜',
      'unlock',
      {
        t: 1,
        type: 2,
        desci18n: 'unlock_gamble',
      });
  },
};

const prefixLst = ["解锁英雄", "解锁建筑", "解锁属性", "解锁试炼", "解锁楼层", "解锁世界"];

function doOnceReward(pobj, rewards, dontNotify) {
  if (!rewards) {
    return;
  }
  for (let i = 0; i < rewards.length; i++) {
    const reward = rewards[i];
    let key = reward;
    let param = null;
    for (let k = 0; k < prefixLst.length; k++) {
      const prefix = prefixLst[k];
      const idx = key.indexOf(prefix);
      if (idx !== -1) {
        param = key.substr(prefix.length);
        key = prefix;
      }
    }
    const handler = Key2Handler[key];
    if (!handler) {
      pobj.logError("[doOnceReward] no handler", reward);
      return;
    }
    handler(pobj, param, dontNotify);
  }
}


module.exports = doOnceReward;