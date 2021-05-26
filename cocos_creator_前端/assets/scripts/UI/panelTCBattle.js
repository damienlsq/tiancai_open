cc.Class({
  extends: cc.Component,

  properties: {
    title: cc.Label,
    prefabBattleRecord: cc.Prefab,
  },
  onShowRecord() {
    this.getRecords((records) => {
      this.onCreateRecordPanel(records);
    });
  },
  onCreateRecordPanel(records) {
    const node = cc.instantiate(this.prefabBattleRecord);
    mbgGame.managerUi.addFullWin(node, 'battleRecord');
  },
  // 获取对战记录
  getRecords(callback) {
    mbgGame.netCtrl.sendMsg("battle.record", {}, (data) => {
      mbgGame.log("[battle] getRecords", data);
      if (data.code === "ok") {
        let records = data.data.records;
        records = _.map(records, (s) => {
          return JSON.parse(s);
        });
        callback(records);
      }
    });
  },
});
