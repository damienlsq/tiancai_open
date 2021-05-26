const facWinBase = require('facWinBase');

cc.Class({
  extends: facWinBase,

  properties: {
    tableViewNode: cc.Node,
  },

  onLoad() {
    // 保存模版
    this.itemJobTemplate = cc.instantiate(this.tableViewNode.getComponent('mbgView').content.children[0]);
    this.tableViewNode.getComponent('mbgView').content.removeAllChildren();
  },
  onAddBaseWin() {
    this.listenLabData();
    // mbgGame.log("facID", facID, mbgGame.player.isFacHasChara(facID), mbgGame.player.getCharaIDByFacID(facID));
    if (this.isCol()) {
      this.node._winTooltips = mbgGame.getString('tooltips_workDesc');
      this.node._winBase.setTitle(mbgGame.getString('title_labworkingroom'));
    } else if (this.isRead()) {
      this.node._winTooltips = mbgGame.getString('tooltips_readDesc');
      this.node._winBase.setTitle(mbgGame.getString('facnameRead'));
      this.node._winBase.setTitle(mbgGame.getString('title_labreadingroom'));
    } else {
      this.node._winBase.setTitle(mbgGame.getString('title_labgameroom'));
    }
    this.refreshJobs();
  },
  showTasksList() {
    const dTasks = mbgGame.player.getCurTasks();
    let tasks = _.keys(dTasks);
    tasks = _.sortBy(tasks, (id) => {
      let i = id;
      if (dTasks[id].f) {
        i -= 1000;
      }
      return i;
    });
    const self = this;
    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    this.mbgViewCom.initTableView({
      items: tasks,
      newCellObject(table, idx) {
        const id = table.getDataItem(idx);
        const node = cc.instantiate(self.itemJobTemplate);
        node.m_idx = +id;
        node.getComponent('itemJob').initTask(id);
        return node;
      },
    });
    // this.hideRedundantTasks(this.renderList.length);
  },
  showBooksList() {
    // 书没有好坏，按是否有人读排序
    let books = mbgGame.player.getOwnedBookList();
    books = _.sortBy(books, (id) => {
      let i = id;
      if (mbgGame.player.getFacIDByBookID(id)) {
        i -= 1000;
      }
      return i;
    });

    const self = this;
    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    this.mbgViewCom.initTableView({
      items: books,
      newCellObject(table, idx) {
        const id = table.getDataItem(idx);
        const node = cc.instantiate(self.itemJobTemplate);
        node.m_idx = id;
        const facID = mbgGame.player.getFacIDByBookID(id);
        node.getComponent('itemJob').initBook(id, facID);
        return node;
      },
    });
  },
  refreshJobs() {
    if (this.isCol()) {
      this.showTasksList();
    } else if (this.isRead()) {
      this.showBooksList();
    }
  },

  onJobClick(event) {
    if (!event.target || !event.target.isValid) return;
    const idx = event.target.parent.m_idx;
    let facID;
    if (this.isCol()) {
      const dTask = mbgGame.player.getCurTasks();
      const task = dTask[idx];

      if (task.f) {
        facID = task.f;
      }
    } else if (this.isRead()) {
      facID = mbgGame.player.getFacIDByBookID(idx);
    }

    if (facID) {
      const leftTime = mbgGame.player.getFacLeftWorkTime(facID);
      // 说明这本书有人读
      if (leftTime <= 0) {
        this.onFinish(idx);
        return;
      }
      mbgGame.resManager.loadPrefab('jobInfo', (prefab) => {
        const node = cc.instantiate(prefab);
        mbgGame.managerUi.addSmallWin(node, 'jobInfo', idx, facID);
      });
      return;
    }

    this.openJobDetail(idx);
  },

  openJobDetail(idx) {
    mbgGame.resManager.loadPrefab('panelLabJobDetail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addFullWin(node, 'panelLabJobDetail', idx, this.m_FacID);
    });
  },

});