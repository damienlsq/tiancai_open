const defines = require('warDefines');
const cnnm = require('cn-nm');

/*
 不能写死获取本玩家的数据，因为有可能是回放了别人的战斗
*/

cc.Class({
  extends: cc.Component,

  properties: {
    stageName: cc.Node,
    timeLabel: cc.Label,
    leftNode: cc.Node,
    rightNode: cc.Node,
    skillAnimLeft: cc.Prefab,
    skillAnimRight: cc.Prefab,
    skillLayoutLeft: cc.Node,
    skillLayoutRight: cc.Node,
    debuffTipsLabel: cc.Label,
    debuffIcon: cc.Node,

    bottingBtn: cc.Node,
    emoteBtn: cc.Node,
    emoteBox: cc.Node,
    emoteTemple: cc.Node,
    rightEmote: cc.Node,
    leftEmote: cc.Node,
    exitBtn: cc.Node,
    speedBtn: cc.Node,
  },
  onLoad() {
    defines.resetTrackTag();
    // this.startCPSTimer();
    emitter.on(this, "UseSkillEvent", this.onUseSkill);
    emitter.on(this, "SetBotting", this.onSetBotting);
    this.debuffTipsLabel.node.active = false;
    this.debuffIcon.active = false;
    this.emoteBox.active = false;
    this.rightEmote.active = false;
    this.leftEmote.active = false;
    this.stageName.active = false;

    // 初始化emote
    this.emoteTemple.m_emoteId = 1;
    this.emoteTemple.getComponent(cc.RichText).string = mbgGame.getString('emote_1');
    for (let i = 0; i < mbgGame.emotesKeyList.length - 1; i++) {
      const node = cc.instantiate(this.emoteTemple);
      node.getComponent(cc.RichText).string = mbgGame.getString(`emote_${i + 2}`);
      this.emoteBox.addChild(node);
      node.m_emoteId = i + 2;
    }
  },
  onDestroy() {
    defines.resetTrackTag();
    emitter.off(this, "UseSkillEvent");
    emitter.off(this, "SetBotting");
  },
  initMe(worldIdx, stageIdx) {
    this.worldIdx = worldIdx;
    this.replaySpeedIdx = 0;

    // 文字未弄好时屏蔽emote功能
    this.emoteBtn.active = false;

    if (this.warCom().isPVE()) {
      // pve没有表情
      this.emoteBtn.active = false;
      this.setStageName(stageIdx);
    }
    this.speedBtn.active = false;
    this.exitBtn.active = false;
    if (this.warCom().isReplayMode()) {
      this.exitBtn.active = true;
      this.speedBtn.active = true;
      // 回放没有表情
      this.emoteBtn.active = false;
      this.bottingBtn.active = false;
    } else {
      this.bottingBtn.active = mbgGame.player.isBottingUnlocked();
    }
  },
  setStageName(stageIdx) {
    if (this.worldIdx === 5) {
      this.stageName.active = false;
      return;
    }
    const stageID = defines.getStageID(this.worldIdx, stageIdx, -1);
    // mbgGame.log("setStageName1", this.worldIdx, stageIdx, stageID);
    const dStageConfig = mbgGame.config.allstageinfo[stageID];

    const stagename = mbgGame.getString(`stagename${stageID}`);
    // 试炼data没有stageIdx，所以出错
    const storyname = mbgGame.getString(`title_stage${this.worldIdx}`);
    let sTitle;
    if (defines.StoryWorlds.indexOf(this.worldIdx) !== -1) {
      const chapterID = defines.getChapterID(stageID);
      const chapterIdx = chapterID % 1000;
      const chapter = mbgGame.getString("chapter", {
        c: cnnm.toCn(chapterIdx),
      });
      sTitle = `${storyname} ${chapter} `;
      sTitle += mbgGame.getString(`mname${defines.getMTplID(dStageConfig.bI)}`);
    } else if (this.worldIdx === 9) {
      const lv = +(`${stageIdx}`.substr(-3));
      const level = mbgGame.getString('level', { lv });
      sTitle = `${storyname} ${stagename} ${level}`;
    } else if (this.worldIdx === 5) {
      sTitle = '';
    } else {
      sTitle = `${storyname} ${stagename}`;
    }
    if (sTitle) {
      this.stageName.active = true;
      mbgGame.setLabel(this.stageName, sTitle);
    } else {
      this.stageName.active = false;
    }
  },
  updateHealDebuff(lefttime) {
    if (!this.debuffTipsLabel.node.active) {
      this.debuffTipsLabel.node.active = true;
      this.debuffIcon.active = true;
    }
    const ratio = Math.max(0, lefttime / mbgGame.config.constTable.HealDebuffTime);
    this.debuffTipsLabel.string = `${Math.round(ratio * 100)}%`;
  },
  onExitReplay() {
    this.sendStopFighting();
  },
  onStopFighting() {
    if (this.warCom().isReplayMode() || this.warCom().worldIdx === 5) {
      return;
    }
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("stoppvp"),
      () => {
        this.sendStopFighting();
      });
  },
  onChangeReplaySpeed() {
    const itemBtn = this.speedBtn.getComponent("itemBtn");
    const speedList = [1, 2, 4];
    this.replaySpeedIdx += 1;
    this.replaySpeedIdx %= speedList.length;
    const x = speedList[this.replaySpeedIdx];
    mbgGame.replaySpeed = x;
    itemBtn.setBtnLabel(`${x}x`);
    mbgGame.warCtrl.setReplaySpeed(x);
  },
  sendStopFighting() {
    this.warCom().stopWar();
  },
  updateFighterInfo(fighterNode, dInfo) {
    const iconNode = fighterNode.getChildByName('icon');
    const totemNode = fighterNode.getChildByName('totem');
    if (dInfo.icon) {
      // 有icon优先显示icon
      totemNode.active = false;
      iconNode.active = true;
      if (+dInfo.icon.substring(5) <= 15) {
        mbgGame.resManager.setAutoAtlasFrame(iconNode.getComponent(cc.Sprite), 'labIcon', dInfo.icon);
      } else {
        mbgGame.resManager.setImageFrame(iconNode.getComponent(cc.Sprite), 'images', dInfo.icon);
      }
    } else {
      totemNode.active = true;
      iconNode.active = false;
      mbgGame.managerUi.addIconFlag(totemNode, dInfo.totem);
    }

    fighterNode.getChildByName('name').getComponent(cc.Label).string = dInfo.name || "";
    const scoreNode = fighterNode.getChildByName('score');
    if (dInfo.score != null) {
      scoreNode.active = true;
      scoreNode.getChildByName('score').getComponent(cc.Label).string = dInfo.score || 0;
    } else {
      scoreNode.active = false;
    }
  },
  onTeamXPSChanged(team, type, xps, iElapsedTime) {
    if (type === "DPS") {
      const node = team === defines.TEAM_LEFT ? this.leftNode : this.rightNode;
      node.getChildByName('dps').getChildByName('dpsLabel').getComponent(cc.Label).string = Math.ceil(xps);
    }
    /*
    else if (type === "CPS") {
      if (team === defines.TEAM_LEFT) {
        // 改成cpm
        const cpm = Math.ceil(xps * 60);
        this.cpsLabel.string = mbgGame.smartNum(cpm);
        mbgGame.player.setCPM(this.worldIdx, mbgGame.player.getCurWorldLv(this.worldIdx), cpm);
        if (!this.cpsLabel.node.parent.active) {
          this.cpsLabel.node.parent.active = true;
        }
      }
    } else if (type === "CPH") {
      if (team === defines.TEAM_LEFT) {
        const cph = Math.ceil(xps * 60 * 60); // 换算
        // mbgGame.log("cph", cph);
        // 缓存
        if (iElapsedTime > (1000 * 60 * 10)) {
          this.m_CPH = cph;
          // 统计有10分钟了，可以写入个人信息了
          // 启动定时器：每15分钟发cph到服务器保存一下
          if (!this.m_CPHSave) {
            this.m_CPHSave = true;
            this.onSaveCPH();
            this.unschedule(this.onSaveCPH);
            this.schedule(this.onSaveCPH, 15 * 60, cc.macro.REPEAT_FOREVER, 0.1);
          }
        }
      }
    }
    */
  },
  updateBattleTop(dInfo, isDefender) {
    mbgGame.log("[updateBattleTop]", dInfo);
    if (isDefender) {
      // 防守方 信息要左右镜像
      dInfo = {
        left: dInfo.right,
        right: dInfo.left,
      };
    }
    this.updateFighterInfo(this.leftNode, dInfo.left);
    this.updateFighterInfo(this.rightNode, dInfo.right);
  },
  showTimer() {
    mbgGame.log('showTimer', this.worldIdx);
    this.timeLabel.string = "";
    this.onUpdateWarLeftTime();
    this.unschedule(this.onUpdateWarLeftTime);
    this.schedule(this.onUpdateWarLeftTime, 1);
  },
  closeTimer() {
    this.unschedule(this.onUpdateWarLeftTime);
    this.timeLabel.string = "";
    this.timeLabel.node.active = false;
  },
  warCom() {
    return mbgGame.warMgr.getWarCom(this.worldIdx);
  },
  onUpdateWarLeftTime() {
    const lefttime = Math.max(0, this.warCom().m_WarDuration - this.warCom().getElapsedTime());
    if (lefttime <= 0) {
      this.unschedule(this.onUpdateWarLeftTime);
      return;
    }
    this.timeLabel.node.active = true;
    this.timeLabel.string = mbgGame.formatDuration(lefttime);
    if (!this.warCom().isPVE() && lefttime <= mbgGame.config.constTable.HealDebuffTime) {
      this.updateHealDebuff(lefttime);
    }
    defines.addTrackTag('倒计时', lefttime);
  },

  // 通用统计 CPS 或 DPS
  startCPSTimer() {
    this.unschedule(this.onCPSUpdate);
    this.schedule(this.onCPSUpdate, 3, cc.macro.REPEAT_FOREVER);
  },
  onCPSUpdate() {
    this.updateXPS(defines.TEAM_LEFT, "CPS");
    this.updateXPS(defines.TEAM_RIGHT, "CPS");
  },
  cleanXPSList(team, type) {
    if (!this.m_XPSList) {
      return;
    }
    if (!this.m_XPSList[team]) {
      return;
    }
    if (!this.m_XPSList[team][type]) {
      return;
    }
    this.m_XPSList[team][type] = [];
  },
  addXPS(team, type, val) {
    if (typeof (val) !== "number") {
      mbgGame.error("addXPS, not number", team, val);
      return;
    }
    if (!this.m_XPSList) {
      this.m_XPSList = {};
    }
    if (!this.m_XPSList[team]) {
      this.m_XPSList[team] = {};
    }
    if (!this.m_XPSList[team][type]) {
      this.m_XPSList[team][type] = [];
    }
    const lst = this.m_XPSList[team][type];
    lst.push({
      t: moment().valueOf(), // ms
      val: Math.abs(val),
    });
  },
  loadCPM() {
    /*
    let cpm = mbgGame.player.getCPM(this.worldIdx, mbgGame.player.getCurWorldLv(this.worldIdx));
    cpm = parseInt(cpm);
    if (cpm > 0) {
      this.cpsLabel.string = `${mbgGame.smartNum(cpm)}`;
    } else {
      this.cpsLabel.string = `0`;
    }
    this.cleanXPSList(defines.TEAM_LEFT, "CPS");
    this.cleanXPSList(defines.TEAM_LEFT, "CPH");
    */
  },

  updateXPS(team, type) {
    if (!this.m_XPSList || !this.m_XPSList[team] || !this.m_XPSList[team][type]) {
      return;
    }
    const iNowTime = moment().valueOf();
    const lst = this.m_XPSList[team][type];
    let duration = 20;
    if (type === "CPH") {
      duration = 60 * 15; // 15分钟
    } else if (type === "CPS") {
      duration = 120;
    }
    while (lst && lst.length !== 0 && (iNowTime - lst[0].t > duration * 1000)) {
      lst.shift();
    }
    if (!lst || lst.length === 0) {
      return;
    }
    const iBeginTime = lst[0].t;
    let val = 0;
    for (let i = 0; i < lst.length; i++) {
      const data = lst[i];
      if (!data || !_.isNumber(data.val)) {
        mbgGame.log("[dps] error", JSON.stringify(data));
      }
      val += data.val;
    }
    const iElapsedTime = iNowTime - iBeginTime;
    let xps;
    if (iElapsedTime === 0) {
      xps = val / duration;
    } else {
      xps = val / Math.max(1, (iElapsedTime * 0.001)); // 至少1秒
    }
    xps = Math.abs(xps);
    this.onTeamXPSChanged(team, type, xps, iElapsedTime);
  },
  // 技能动画管理
  onUseSkill(fighter) {
    const charaID = fighter.charaID();
    if (charaID > 15) {
      // 仅支持英雄放技能
      return;
    }
    this.pushUseSkillAnim(charaID, fighter.getActiveSkillID(), fighter.getStandTeam());
  },
  getIdlePosByTeam(team) {
    if (!this.m_IdlePos) {
      this.m_IdlePos = {};
    }
    if (this.m_IdlePos[team] == null) {
      this.m_IdlePos[team] = 1; // 0 / 1
    }
    const i = this.m_IdlePos[team];
    this.m_IdlePos[team] = i === 0 ? 1 : 0;
    return i;
  },
  getAnimNode(team, i) {
    if (!this.m_AniNodeByTeam) {
      this.m_AniNodeByTeam = {};
    }
    if (!this.m_AniNodeByTeam[team]) {
      this.m_AniNodeByTeam[team] = {};
    }
    if (this.m_AniNodeByTeam[team][i]) {
      return this.m_AniNodeByTeam[team][i];
    }
    const pre = team === defines.TEAM_LEFT ? this.skillAnimLeft : this.skillAnimRight;
    const layout = team === defines.TEAM_LEFT ? this.skillLayoutLeft : this.skillLayoutRight;
    const node = cc.instantiate(pre);
    layout.addChild(node);
    this.m_AniNodeByTeam[team][i] = node;
    node.y = -i * 100;
    return node;
  },
  pushUseSkillAnim(charaID, skillID, team) {
    const idx = this.getIdlePosByTeam(team);
    const node = this.getAnimNode(team, idx);
    mbgGame.log("onUseSkill", charaID, skillID, team, idx);
    const com = node.getComponent("skillAnim");
    com.playAnim({
      charaID,
      skillID,
      team,
    }, () => {
      if (idx === 1) {
        this.m_IdlePos[team] = 1;
      }
    });
  },
  onToggleBotting() {
    const auto = this.warCom().isBotting() ? 0 : 1;
    this.warCom().callBSWarFunc("setBotting", {
      auto,
    });
  },
  onSetBotting(auto) {
    if (auto) {
      mbgGame.resManager.setAutoAtlasFrame(this.bottingBtn, 'uiIcon', 'progressSkillLeftAuto');
      this.bottingBtn.getChildByName('flash').active = true;
      defines.addTrackTag('自动');
      defines.removeTrackTag('手动');
    } else {
      mbgGame.resManager.setAutoAtlasFrame(this.bottingBtn, 'uiIcon', 'progressSkillLeftManual');
      this.bottingBtn.getChildByName('flash').active = false;
      defines.addTrackTag('手动');
      defines.removeTrackTag('自动');
    }
    if (!this.warCom()) {
      return;
    }
    this.warCom().setBotting(auto);
  },
  onToggleEmote() {
    this.emoteBox.active = !this.emoteBox.active;
  },
  onEmoteSelect(event) {
    this.emoteBox.active = false;

    const btn = event.target;
    // m_emoteId 1～n
    let m_emoteId = btn.m_emoteId;
    if (!m_emoteId) {
      // 激活了richtext事件
      m_emoteId = btn.parent.m_emoteId;
    }
    const self = this;
    self.leftEmote.active = true;
    self.leftEmote.getChildByName('label').getComponent(cc.RichText).string = mbgGame.getString(`emote_${m_emoteId}`);
    self.unschedule(self.hideLeftEmote);
    self.scheduleOnce(self.hideLeftEmote, 3);
    this.warCom().callBSWarFunc("sendEmote", {
      id: m_emoteId,
    });
  },
  hideLeftEmote() {
    this.leftEmote.active = false;
  },
  hideEmote() {
    this.rightEmote.active = false;
  },
  doEmote(id) {
    // mbgGame.log('onEmoteSelect', mbgGame.getString(`emote_${id}`));
    this.rightEmote.active = true;
    this.rightEmote.getChildByName('label').getComponent(cc.RichText).string = mbgGame.getString(`emote_${id}`);
    this.unschedule(this.hideEmote);
    this.scheduleOnce(this.hideEmote, 3);
  },
});