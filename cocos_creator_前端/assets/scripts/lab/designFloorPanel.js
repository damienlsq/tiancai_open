const facFloorBase = require('facFloorBase');

cc.Class({
  extends: facFloorBase,
  properties: {
    design3: cc.Node,
    design2: cc.Node,
    design1: cc.Node,
  },
  getCurProgress() {
    let totalLvl = 0;
    for (let charaID = 1; charaID <= 15; charaID++) {
      const hasChara = mbgGame.player.hasChara(charaID);
      if (!hasChara) {
        totalLvl += 0;
        continue;
      }
      totalLvl += mbgGame.player.getCharaLv(charaID) || 0;
    }
    return totalLvl; // 15个角色，都升到满级为满进度
  },
  getBlockProgress() {
    return 50; // 15个角色，都升到满级(1500)为满进度，分开30份，每份就是50
  },
  onLoad() {
    this.initCommon();
  },
  refreshFloor() {
    // 根据进度，显示设计图
    // 目前，大图 16块， 小图 7 + 7 块 一共30份
    const block = this.getBlockProgress();
    const cur = this.getCurProgress();
    const lvl = Math.floor(cur / block);

    const design3_order = [
      'design3_16', 'design3_12', 'design3_11', 'design3_15',
      'design3_07', 'design3_10', 'design3_06', 'design3_03',
      'design3_05', 'design3_09', 'design3_02', 'design3_01',
      'design3_08', 'design3_14', 'design3_13', 'design3_04',
    ];
    for (let i = 0; i < design3_order.length; i++) {
      const node = cc.find(`full/${design3_order[i]}`, this.design3);
      node.active = lvl >= i + 1;
    }
    const design2_order = [
      'design2_05', 'design2_07', 'design2_01', 'design2_04',
      'design2_02', 'design2_03', 'design2_06',
    ];
    for (let i = 0; i < design2_order.length; i++) {
      const node = cc.find(`full/${design2_order[i]}`, this.design2);
      node.active = lvl >= i + 1 + 16;
    }
    const design1_order = [
      'design1_05', 'design1_07', 'design1_01', 'design1_04',
      'design1_02', 'design1_03', 'design1_06',
    ];
    for (let i = 0; i < design1_order.length; i++) {
      const node = cc.find(`full/${design1_order[i]}`, this.design1);
      node.active = lvl >= i + 1 + 23;
    }
  },
  getSceneName() {
    return 'design';
  },
});