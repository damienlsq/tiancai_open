cc.Class({
  extends: cc.Component,
  properties: {
    bg: cc.Sprite,
    icon: cc.Sprite,
    n: cc.RichText,
    selected: cc.Node,
  },
  onLoad() {

  },
  setCtrl(ctrl) {
    this.m_Ctrl = ctrl;
  },
  setLv(lv) {
    this.m_lv = lv;
  },
  setSubIdx(idx) {
    this.m_sttIdx = idx;
  },
  setSelected(b) {
    this.selected.active = b;
  },
  setBg(name) {
    mbgGame.resManager.setAutoAtlasFrame(this.bg, 'itemsIcon', name);
  },
  setIcon(name, scale) {
    scale = scale || 1.0;
    mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', name);
    this.icon.node.setScale(scale);
  },
  setN(n, maxN) {
    this.m_n = n;
    this.n.string = mbgGame.getOutlineStr(`<color=${n === maxN ? '#ffffff' : '#00ff00'}>${n + 1}</color>`, '#1F3455', 2);
  },
  setStar(s) {
    this.m_s = s;
  },
  N() {
    return this.m_n;
  },
  star() {
    return this.m_s;
  },
  onSelectTalent() {
    this.m_Ctrl.onSelectTalent(this);
  },
});