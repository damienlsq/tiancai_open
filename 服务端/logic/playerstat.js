const CBase = require('./base');

/*
     统计和成就
     stat = {
         statID: value
     }
     achv = {
         achieveSID: {
             lv: 0 //已领取的级别,未领取过等于0级
         }
     }
     已发现/曾经获得的某类东西的统计, 不需要发给客户端
     dis = {
       key : [],
       目前有：
       item : [], // 道具itemID列表
     }
 */

const DisKey2StatName = {
  item: 'itemCollect',
};

class CStat extends CBase {
  getStatDBData() {
    let dData = this.pobj().getVal("stat");
    if (!dData) {
      dData = {};
      this.pobj().setValOnly("stat", dData);
    }
    return dData;
  }
  getStatDBValue(key) {
    const dData = this.pobj().getVal("stat") || {};
    return dData[key];
  }
  getAchieveDBData() {
    let dData = this.pobj().getVal("achv");
    if (!dData) {
      dData = {};
      this.pobj().setValOnly("achv", dData);
    }
    return dData;
  }
  getAchieveDataByID(achieveSID) {
    const dData = this.getAchieveDBData();
    if (!dData[achieveSID]) {
      dData[achieveSID] = {
        lv: 0,
      };
    }
    return dData[achieveSID];
  }
  addStatVal(sStatName, val) {
    const curVal = this.getStatVal(sStatName);
    if (!_.isNumber(curVal)) return;
    const newVal = curVal + val;
    this.setStatVal(sStatName, newVal);
  }
  // 更新统计值
  setStatVal(sStatName, val) {
    const iStatSID = mbgGame.config.StatName2StatID[sStatName];
    if (!iStatSID) {
      return false;
    }
    val = parseInt(val);
    if (typeof (val) !== "number") {
      this.logError("setStatVal wrong val", val);
      return false;
    }
    const dData = this.getStatDBData();
    dData[iStatSID] = val;
    return true;
  }
  getStatVal(sStatName) {
    const iStatSID = mbgGame.config.StatName2StatID[sStatName];
    if (!iStatSID) {
      return 0;
    }
    const dData = this.getStatDBData();
    return dData[iStatSID] || 0;
  }
  // 成就等级
  getAchieveLv(iAchieveSID) {
    if (!iAchieveSID) {
      this.logError("[getAchieveLv] no SID", iAchieveSID);
      return 0;
    }
    const dData = this.getAchieveDataByID(iAchieveSID);
    return dData.lv;
  }
  setAchieveLv(iAchieveSID, lv) {
    if (!iAchieveSID) {
      this.logError("[setAchieveLv]", iAchieveSID, lv);
      return;
    }
    const dData = this.getAchieveDataByID(iAchieveSID);
    dData.lv = lv;
  }
  completeAchieve(iAchieveSID) {
    let lv = this.getAchieveLv(iAchieveSID);
    if (!this.checkAchieve(iAchieveSID)) return false;
    lv += 1;
    this.setAchieveLv(iAchieveSID, lv);
    // 奖励星星
    this.pobj().addAttrInt("star", 1);
    return true;
  }
  checkAchieve(iAchieveSID) {
    const dAchieve = mbgGame.config[`achieve${iAchieveSID}`];
    const lv = this.getAchieveLv(iAchieveSID);
    const iNeedVal = dAchieve.values[lv];
    const sStatName = dAchieve.StatName;
    const iStatVal = this.getStatVal(sStatName);
    if (iNeedVal != null && iStatVal >= iNeedVal) {
      return true;
    }
    return false;
  }
  rewardForAchieve(iAchieveSID) {
    const dAchieve = mbgGame.config[`achieve${iAchieveSID}`];
    const lv = this.getAchieveLv(iAchieveSID);
    let dDrop = dAchieve.RewardList[lv - 1];
    if (!dDrop) {
      this.logError("[rewardForAchieve] no award config", iAchieveSID, dDrop, lv);
      return;
    }
    dDrop = mbgGame.common.utils.deepClone(dDrop);
    this.pobj().giveAward(dDrop, `achieve${iAchieveSID}, lv: ${lv}`);
  }
  buildSendAchieve() {
    const netCtrl = this.pobj().getNetCtrl();
    // const achieveData = this.getAchieveDBData();
    const sendData = {};
    const myChannelID = netCtrl.channel_id;
    const achieveList = _.keys(mbgGame.config).filter((x) => {
      return x.substring(0, 7) === 'achieve';
    });
    let achieveIDs = _.map(achieveList, (achieve) => {
      const achieveID = +achieve.replace('achieve', '');
      return achieveID;
    });
    achieveIDs = _.filter(achieveIDs, (achieveID) => {
      const dConfig = mbgGame.config[`achieve${achieveID}`];
      if (dConfig.channel_id && _.isArray(dConfig.channel_id) && dConfig.channel_id.length > 0 && (dConfig.channel_id.indexOf(myChannelID) === -1)) {
        return false;
      }
      return !dConfig.invalid;
    });
    achieveIDs.forEach((iAchieveSID) => {
      const dAchieve = mbgGame.config[`achieve${iAchieveSID}`];
      const lv = this.getAchieveLv(iAchieveSID);
      const dDrop = dAchieve.RewardList[lv];
      sendData[iAchieveSID] = {
        lv,
        award: dDrop,
      };
    });
    return sendData;
  }
  buildStatData(statList) {
    // 0的项目不发送客户端
    const self = this;
    const list = [];
    statList.forEach((x) => {
      let data;
      let value1;
      let value2;
      if (_.isArray(x)) {
        if (x.length === 2) {
          value1 = self.getStatVal(x[0]);
          value2 = self.getStatVal(x[1]);
          if (value1 === 0 && value2 === 0) return;
          data = [
            self.pobj().getString(`stat_${x[0]}`) || x[0],
            self.pobj().getString(`stat_${x[1]}`) || x[1],
            self.pobj().smartNum(value1),
            self.pobj().smartNum(value2),
          ];
        } else if (x.length === 3) {
          value1 = self.getStatVal(x[1]);
          value2 = self.getStatVal(x[2]);
          if (value1 === 0 && value2 === 0) return;
          data = [
            self.pobj().getString(`stat_${x[0]}`) || x[0],
            self.pobj().smartNum(value1),
            self.pobj().smartNum(value2),
          ];
        }
      } else if (_.isObject(x)) {
        data = x;
      } else {
        value1 = self.getStatVal(x);
        if (value1 === 0) return;
        data = [
          self.pobj().getString(`stat_${x}`) || x,
          self.pobj().smartNum(self.getStatVal(x)),
        ];
      }
      list.push(data);
    });
    return list;
  }

  getStatSendData() {
    const sendData = {
      stat: [],
    };

    const self = this;
    let arr = [
      ['curScore', 'curScore', 'MaxScore'],
      ['curRank', 'curRank', 'MaxRank'],
      'PVPTimes',
      {
        name: self.pobj().getString('stat_totalTime'),
        time: self.getStatVal('totalTime'),
      }, {
        name: self.pobj().getString('stat_totalOnlineTime'),
        duration: self.getStatVal('totalOnlineTime'),
      },
      'diamonds',
      'spendDiamonds',
      'PostTimes',
      // ['doLikeTimes', 'doLikeTimes', 'LikeTimes'],
    ];
    const topCharaID = this.getStatVal('topCharaID');
    const topSkillID = this.getStatVal('topSkillID');
    if (topCharaID) {
      const charaname = self.pobj().getString(`charaname${topCharaID}`);
      const tplCharaLv = self.getStatVal('topCharaLv');
      const value = `${charaname}(${tplCharaLv})`;
      arr.push({
        name: self.pobj().getString('stat_topCharaID'),
        value,
      });
    }
    if (topSkillID) {
      const skillname = self.pobj().getString(`skillname${topSkillID}`);
      const topSkillLv = self.getStatVal('topSkillLv');
      arr.push({
        name: self.pobj().getString('stat_topSkillID'),
        value: `${skillname}(${topSkillLv})`,
      });
    }
    arr = arr.concat([
      'UseSkill1011',
      'UseSkill1021',
      'UseSkill1031',
      'UseSkill1041',
      'UseSkill1051',
      'UseSkill1061',
      'UseSkill1071',
      'UseSkill1081',
      'UseSkill1091',
      'UseSkill1101',
      'UseSkill1111',
      'UseSkill1121',
      'UseSkill1131',
      'UseSkill1141',
      'UseSkill1151',
    ]);
    sendData.stat = this.buildStatData(arr);

    return sendData;
  }
  getDiscoverDBData() {
    let dData = this.pobj().getVal("dis");
    if (!dData) {
      dData = {};
      this.pobj().setValOnly("dis", dData);
    }
    return dData;
  }
  getDiscoverList(key) {
    const dDBData = this.getDiscoverDBData();
    if (!dDBData[key]) {
      dDBData[key] = [];
    }
    return dDBData[key];
  }
  tryAddToDiscoverList(key, id) {
    if (!id) {
      return false;
    }
    const lst = this.getDiscoverList(key);
    if (lst.indexOf(id) !== -1) {
      return false; // 已经有了
    }
    lst.push(id);
    const sStatName = DisKey2StatName[key];
    if (!sStatName) {
      return false;
    }
    this.setStatVal(sStatName, lst.length);
    return true;
  }
}

module.exports = CStat;
