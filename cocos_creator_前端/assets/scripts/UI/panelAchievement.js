const cnnm = require('cn-nm');
const defines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    tabsNode: cc.Node,
    tableViewNode: cc.Node,

    statList: cc.Node,
    statContent: cc.Node,
    labInfo: cc.Node,
    labContent: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_data');
    this.items = [];
    // 保存模版
    this.itemAchievementTemplate = cc.instantiate(this.tableViewNode.getComponent('mbgView').content.children[0]);
    this.tableViewNode.getComponent('mbgView').content.removeAllChildren();

    // 保存模版
    this.statInfoTemplate = cc.instantiate(this.statContent.children[0]);
    this.statContent.removeAllChildren();

    this.statList.active = false;
    this.labInfo.active = false;
  },

  onAddBaseWin(mode) {
    if (mode === 'stat') {
      this.tabsNode.getComponent('itemTab').setTabOn(2);
    } else if (mode === 'lab') {
      this.tabsNode.getComponent('itemTab').setTabOn(1);
    } else {
      this.tabsNode.getComponent('itemTab').setTabOn(0);
    }
  },

  clickBtnAchieve() {
    this.tableViewNode.active = true;
    this.statList.active = false;
    this.labInfo.active = false;
    this.refreshAchieveList();
  },
  clickBtnStat() {
    this.tableViewNode.active = false;
    this.statList.active = true;
    this.labInfo.active = false;
    this.refreshStat();
  },
  clickBtnLab() {
    this.tableViewNode.active = false;
    this.statList.active = false;
    this.labInfo.active = true;
    this.refreshLab();
  },

  // 成就
  refreshAchieveList() {
    const data = mbgGame.getCache('player.achieveinfo', 10);
    // mbgGame.log('[refreshAchieveList]',data);
    if (!data) {
      mbgGame.checkNetCache('player.achieveinfo', this.refreshAchieveList.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    let idList = [];
    _.keys(data.achieve).forEach((achieveID) => {
      if (mbgGame.config[`achieve${achieveID}`]) {
        idList.push(achieveID);
      } else {
        mbgGame.error('成就错误', achieveID);
      }
    });
    // mbgGame.log('idList1', idList, _.keys(data.achieve));
    idList = _.sortBy(idList, (achieveID) => {
      const dStatData = data.stat;
      const dConfig = mbgGame.config[`achieve${achieveID}`];
      const maxLv = dConfig.maxLv;
      const dData = data.achieve[achieveID] || {};
      const lv = dData.lv || 0;
      if (lv >= maxLv) {
        return -1;
      }
      const statID = mbgGame.player.getStatID(dConfig.StatName);
      const percent = Math.min(1, (dStatData[statID] || 0) / dConfig.values[lv]);
      return percent;
    });
    idList = idList.reverse();
    const self = this;
    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    this.mbgViewCom.initTableView({
      items: idList,
      newCellObject(table, idx) {
        // mbgGame.log('newCellObject', idx, eventData.msg);
        const node = cc.instantiate(self.itemAchievementTemplate);
        node.getComponent('itemAchievement').refreshAchieveInfo(table.getDataItem(idx));
        return node;
      },
    });
  },

  // 统计
  addStat(name, score) {
    const node = cc.instantiate(this.statInfoTemplate);
    const nameNode = cc.find('nodeName/name', node);
    const scoreNode = cc.find('nodeValue/value', node);
    this.statContent.addChild(node);
    mbgGame.setLabel(nameNode, name);
    mbgGame.setLabel(scoreNode, score);
  },

  autoName(key) {
    let name = key;
    if (key.startsWith('cur_')) {
      name = mbgGame.getString('curInfo', {
        info: mbgGame.getString(key.substring('cur_'.length)),
      });
    } else if (key.startsWith('max_')) {
      name = mbgGame.getString('maxInfo', {
        info: mbgGame.getString(key.substring('max_'.length)),
      });
    } else if (key.startsWith('high_')) {
      name = mbgGame.getString('highInfo', {
        info: mbgGame.getString(key.substring('high_'.length)),
      });
    } else {
      name = mbgGame.getString(key);
    }
    name = name || key;
    return name;
  },

  parseAddStat(data) {
    const self = this;
    data.forEach((x) => {
      if (_.isArray(x)) {
        if (x.length === 2) {
          self.addStat(x[0], x[1]);
        } else if (x.length === 3) {
          self.addStat(x[0], `${x[1]} / ${x[2]}`);
        } else if (x.length === 4) {
          self.addStat(`${x[0]} / ${x[1]}`, `${x[2]} / ${x[3]}`);
        }
      } else if (_.isObject(x)) {
        if (x.duration != null) {
          const duration = moment.duration(x.duration, 'seconds').humanize();
          self.addStat(x.name, duration);
        } else if (x.time != null) {
          self.addStat(x.name, moment(x.time * 1000).toNow());
        } else {
          self.addStat(x.name, x.value);
        }
      }
    });
  },

  refreshStat() {
    const data = mbgGame.getCache('player.statinfo', 5 * 60);
    if (!data) {
      mbgGame.checkNetCache('player.statinfo', this.refreshStat.bind(this));
      return;
    }
    if (!this.node || !this.node.isValid) {
      return;
    }
    this.statContent.removeAllChildren();
    this.parseAddStat(data.stat);
  },

  // 研究所
  refreshLab() {
    let lvNode = cc.find(`lvNowContent/frameLv/lvNow`, this.labContent);
    let descNode = cc.find(`lvNowContent/descNow`, this.labContent);
    const nowLv = mbgGame.player.getLabLv();
    this.itemLabInfo(lvNode, descNode, nowLv);
    const nextLv = nowLv + 1;
    const dConfig = mbgGame.config[`lab${nextLv}`];
    lvNode = cc.find(`lvNextContent/frameLv/lvNext`, this.labContent);
    descNode = cc.find(`lvNextContent/descNext`, this.labContent);
    if (!dConfig) {
      // 满级了
      lvNode.active = false;
      descNode.active = false;
    } else {
      this.itemLabInfo(lvNode, descNode, nextLv);
    }
  },

  itemLabInfo(lvNode, descNode, lv) {
    let s = '';
    if (lv > mbgGame.player.getLabLv()) {
      const dConfig = mbgGame.config[`lab${lv}`];
      const stageIDs = dConfig.stageIDs;
      for (let i = 0; i < stageIDs.length; i++) {
        const stageID = stageIDs[i];
        const chapterID = defines.getChapterID(stageID);
        const dChapter = mbgGame.config.chapter[chapterID];
        const isLastStage = stageID === dChapter.stageID[dChapter.stageID.length - 1];
        const chapterIdx = chapterID % 1000;
        const worldIdx = Math.floor(chapterID / 1000);
        const stageIdx = stageID % 100;
        const worldName = mbgGame.getString(`title_stage${worldIdx}`);
        const ok = mbgGame.player.getCurWorldMaxLv(worldIdx) > stageIdx;
        const chapterNum = mbgGame.getString("chapter", {
          c: cnnm.toCn(chapterIdx),
        });
        let desc = `通关${worldName}${chapterNum}`;
        if (!isLastStage) {
          desc += `第${stageIdx}关`;
        }
        if (ok) {
          desc = `<color=#00ff00>${desc}</color>`;
        } else {
          desc = `<color=#ffffff>${desc}</color>`;
        }
        s += `${desc}<br />`;
      }
    }
    mbgGame.setLabel(lvNode, lv > mbgGame.player.getLabLv() ? `研究所下一等级: ${lv}` : `研究所当前等级: ${lv}`);
    mbgGame.setLabel(descNode, s + mbgGame.getString(`labdesc${lv}`, {
      lv: `<color=#00FF00>${mbgGame.player.getBonuslv()}级</color>`,
    }));
  },

});
