cc.Class({
  extends: cc.Component,

  properties: {
    tableViewNode: cc.Node,
  },

  // use this for initialization
  onLoad() {
    this.node._winTitle = mbgGame.getString('title_fightlog');

    // 保存模版
    this.itemPVPLogTemplate = cc.instantiate(this.tableViewNode.getComponent('mbgView').content.children[0]);
    this.tableViewNode.getComponent('mbgView').content.removeAllChildren();

    // pool池
    this.myPool = new cc.NodePool();
  },
  onAddBaseWin() {
    this.refreshMe();
  },
  setShowNoItemsTips(b) {
    if (b) {
      if (!this.m_NoItemsTips) {
        const node = new cc.Node();
        const com = node.addComponent(cc.RichText);
        com.handleTouchEvent = false;
        this.tableViewNode.addChild(node);
        com.fontSize = 24;
        com.string = mbgGame.getString('nopvplogs');
        const w = node.addComponent(cc.Widget);
        w.top = 16;
        w.isAlignTop = true;
        this.m_NoItemsTips = node;
      }
    } else if (this.m_NoItemsTips) {
      this.m_NoItemsTips.destroy();
      delete this.m_NoItemsTips;
    }
  },
  refreshMe() {
    const data = mbgGame.getCache('arena.record', 60);
    if (!data) {
      mbgGame.checkNetCache('arena.record', this.refreshMe.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    let records = data.news;
    records = _.map(records, (dRecord) => {
      dRecord = JSON.parse(dRecord);
      return dRecord;
    });
    if (records.length > 0) {
      this.setShowNoItemsTips(false);
    } else {
      this.setShowNoItemsTips(true);
    }
    // mbgGame.log("records", records);
    const self = this;
    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    this.mbgViewCom.initTableView({
      items: records,
      removeCell(table, cell) {
        // 缓存pvplog
        if (!cell || !cell.isValid) return;
        const node = cell.children[0];
        if (!node || !node.isValid) return;
        self.myPool.put(node);
      },
      newCellObject(table, idx) {
        let node = self.myPool.get();
        if (!node) {
          node = cc.instantiate(self.itemPVPLogTemplate);
        }
        node.getComponent('itemPVPLog').initMe(table.getDataItem(idx));
        return node;
      },
    });
  },
});