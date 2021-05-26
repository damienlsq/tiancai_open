const mbgGame = require("mbgGame");


cc.Class({
  extends: cc.Component,

  properties: {
    memberName: cc.Label,
    jobTitle: cc.Label,
    time: cc.Label,
    score: cc.RichText,
    selected: cc.Node,
  },
  onLoad() {
    emitter.on(this, "clanMemberUpdate", this.refreshMe);
    this.selected.active = false;
  },
  onDestroy() {
    emitter.off(this, "clanMemberUpdate");
  },
  refreshMe(data) {
    if (data) {
      if (data.name !== this.node._memberData.name) return;
      this.node._memberData = data;
    }
    this.memberName.string = this.node._memberData.name;
    this.jobTitle.string = mbgGame.getString(`clanJob${this.node._memberData.job || 0}`);
    if (this.node._memberData.lt === 1) {
      this.time.string = mbgGame.getString('online');
    } else if (this.node._memberData.lt === 0) {
      this.time.string = ''; // 时间未知，通常在刚加入的时候才会未知
    } else {
      // 显示离线时间
      this.time.string = moment(+this.node._memberData.lt * 1000).fromNow();
    }
    this.score.string = `${this.node._memberData.mS || 0} <img src="logo_score" />`;
  },

  initMe(panelCom, id) {
    this.id = id;
    // mbgGame.log("memberData:", id, panelCom.detailData);
    this.node._memberData = panelCom.detailData.members[id];
    this.refreshMe();
  },

  clickMe() {
    if (this.node.parent.m_lastClick) {
      this.node.parent.m_lastClick.active = false;
    }
    this.node.parent.m_lastClick = this.selected;
    this.selected.active = true;
    emitter.emit('clickMemberInfo', this.id);
  },
});