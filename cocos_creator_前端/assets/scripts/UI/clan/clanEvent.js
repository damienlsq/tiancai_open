const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    clanEventBasePre: cc.Prefab,
    clanName: cc.RichText,
    clanCount: cc.Label,
    clantScore: cc.RichText,

    clanFriendBtn: cc.Node,
    clanRealFriendBtn: cc.Node,
    container: cc.Node,

    btnScroll: cc.Node,
    btnScrollLabel: cc.RichText,
    flag: cc.Node,
    editBox: cc.EditBox,

    tableViewNode: cc.Node,

    calcRichText: cc.RichText,

    btnFilter: cc.Node,
  },

  onLoad() {
    mbgGame.clanEvent = this;

    this.listMode = 0;
    this.clanName.string = '';
    this.clanCount.string = '';
    this.clantScore.string = '';
    this.node._winTitle = mbgGame.getString('title_clanDialog');
    emitter.on(this, "clanEventUpdate", this.clanEventUpdate);
    emitter.on(this, "clanEventBase", this.refreshBase);
    emitter.on(this, "removeFriendWarMatch", this.removeFriendWarMatch);
    this._saveContentHeight = this.container.height;
    this._saveContentY = this.container.y;
    this._autoScroll = true;
    this.btnScroll.active = false;
    this.updateTimer = 0;
    this._cacheRichTextHeight = {};
    this.refreshBase();
    const curDay = moment().day();
    if (mbgGame.config.realFriend && (curDay === 0 || curDay === 6)) {
      this.clanFriendBtn.active = false;
      this.clanRealFriendBtn.active = true;
    } else {
      this.clanFriendBtn.active = true;
      this.clanRealFriendBtn.active = false;
    }
  },

  getEventItems() {
    const events = mbgGame.getCache('clan.clanEvents');
    if (!events) {
      return [];
    }
    const items = [];
    _.mapKeys(events, (v, k) => {
      if (this.listMode === 1) {
        // 过滤求助
        if (v.mode === 4) {
          return;
        }
      }
      items.unshift(k);
    });
    return items;
  },

  clanEventUpdate() {
    this.refreshBase();
    // if (data.op === 'quit') {}
    if (!this.mbgViewCom) {
      this.refreshList();
      return;
    }
    this.friendWarStatusCheck();

    // mbgGame.log('clanEventUpdate', this.getEventItems());
    this.mbgViewCom.updateItems(this.getEventItems());
  },

  friendWarStatusCheck(events) {
    if (!events) {
      events = mbgGame.getCache('clan.clanEvents') || {};
    }
    const self = this;
    let nowStatus = -1;
    _.mapKeys(events, (event, eventId) => {
      if (event.mode === 3 && event.name === mbgGame.userInfo.nickname) {
        if (event.status === 0) {
          // 等待中
          self.friendWarEventID = eventId;
          nowStatus = 0;
        } else if (event.status === 1 && !event.wUUID) {
          // 战斗中
          self.friendWarEventID = eventId;
          nowStatus = 1;
        }
      }
    });
    if (nowStatus === 0) {
      emitter.emit("waitFriendWar", true);
      this.clanFriendBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('cancel'));
      this.clanFriendBtn.getComponent('itemBtn').setStatus(true);
    } else if (nowStatus === 1) {
      // 正在战斗中，按钮不能按
      emitter.emit("waitFriendWar", false);
      this.clanFriendBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('cancel'));
      this.clanFriendBtn.getComponent('itemBtn').setStatus(false);
    } else {
      delete self.friendWarEventID;
      emitter.emit("waitFriendWar", false);
      this.clanFriendBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('friendwar2'));
      this.clanFriendBtn.getComponent('itemBtn').setStatus(true);
    }
  },

  showNews() {
    this.btnScroll.active = false;
  },

  clickScrollToBottom() {
  },

  refreshBase() {
    const clanBase = mbgGame.getCache('clan.base');
    if (!clanBase) return;

    if (clanBase.count) {
      this.clanCount.string = mbgGame.getString("clanInfo1", {
        online: clanBase.online,
        count: clanBase.count,
      });
    }
    if (clanBase.flag) {
      mbgGame.managerUi.addIconFlag(this.flag, clanBase.flag);
    }
    if (clanBase.name) {
      this.clanName.string = clanBase.name;
    }
    this.clantScore.string = `<img src="logo_score" /> ${clanBase.tScore || 0}`;
  },

  calcRichtextHeight(id, msg, maxWidth) {
    // 查一次就缓存起来
    if (this._cacheRichTextHeight[id]) return this._cacheRichTextHeight[id];
    this.calcRichText.maxWidth = maxWidth;
    this.calcRichText.string = msg;
    this._cacheRichTextHeight[id] = this.calcRichText.node.height;
    return this._cacheRichTextHeight[id];
  },
  getEventHeight(eventData, id) {
    const space = 20;
    switch (+eventData.mode) {
      case 0: // 聊天
        { // 默认高72 22为默认richtext高度
          const height = this.calcRichtextHeight(id, eventData.msg, 458);
          // mbgGame.log('getEventHeight', height, eventData, 72 - 22 + height + space);
          return 72 - 22 + height + space;
        }
      case 1: // 固定 申请
        return 120 + space;
      case 2: // 固定 系统信息π
        return 40 + space;
      case 3: // 固定 友谊赛
        return 220 + space;
      case 4: // 固定 请求帮助
        return 200 + space;
      case 5: // 战斗分享
        return 150 + space;
      case 6: // 道具分享
        return 120 + space;
      default:
        return 100 + space;
    }
  },

  refreshList(force) {
    const events = mbgGame.getCache('clan.clanEvents', 30 * 60);
    if (!events) {
      mbgGame.checkNetCache('clan.clanEvents', this.refreshList.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    mbgGame.log('clanEvent refreshList', events);
    if (!force) {
      const now = moment().unix();
      if (this._refreshListTime && now - this._refreshListTime < 30) return; // 30秒内不要重复刷新
      this._refreshListTime = now;
    }
    this.friendWarStatusCheck(events);

    this.mbgViewCom = this.tableViewNode.getComponent('mbgView');
    this.mbgViewCom.initTableView({
      items: this.getEventItems(),
      cellObjectSize(table, idx) {
        const arr = mbgGame.getCache('clan.clanEvents');
        if (!arr) return cc.size(628, 100);
        const eventData = arr[table.getDataItem(idx)];
        // 最后的20相当20的间隔
        return cc.size(628, mbgGame.clanEvent.getEventHeight(eventData, table.getDataItem(idx)));
      },
      newCellObject(table, idx) {
        // mbgGame.log('newCellObject', idx, eventData.msg);
        const node = cc.instantiate(mbgGame.clanEvent.clanEventBasePre);
        node.getComponent('clanEventInfoBase').initMe(table.getDataItem(idx));
        return node;
      },
    });
    // this.mbgViewCom.scrollToBottom();
  },

  gotoBottom() {
    this._autoScroll = true;
    // this.sv.scrollToBottom();
  },

  clickSend() {
    const min = 2;
    const max = 1024;
    if (this.editBox.string.length > max || (this.editBox.string.length < min)) {
      mbgGame.managerUi.floatMessage(mbgGame.getString("textLimit", {
        min,
        max,
        count: this.editBox.string.length,
      }));
      return;
    }

    this._autoScroll = true;
    const str = this.editBox.string;
    mbgGame.netCtrl.sendMsg("clan.sendEvent", {
      str,
    });
    this.editBox.string = "";
  },

  removeFriendWarMatch(isForce, cb) {
    if (!this.friendWarEventID) return;
    const self = this;
    // 发送取消
    mbgGame.netCtrl.sendMsg("frdwar.stopClanMatch", {
      id: self.friendWarEventID,
    }, (data) => {
      // mbgGame.log("stopClanMatch", data);
      if (!isForce) {
        // isForce下面，返回信息时，当前界面已经删掉了
        delete self.friendWarEventID;
        emitter.emit("waitFriendWar", false);
        if (data.status === 0) {
          self.clanFriendBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('friendwar2'));
        }
        if (cb) cb();
      }
    });
  },
  // 原始实力的模式
  clickFriendWar_OriginLv() {
    this.friendWar1(2);
  },
  // 固定实力的模式(原真友谊赛)
  clickFriendWar_FixedLv() {
    this.friendWar1(3);
  },
  friendWar1(type) {
    if (this.friendWarEventID) {
      this.removeFriendWarMatch();
      delete this._startFriendWarMatch;
      return;
    }
    // 一定要设置呢称
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName();
      return;
    }
    mbgGame.managerUi.openSchemeTeamEditor({
      wartype: 'pvpwar',
      worldIdx: 99,
      schemeIdx: mbgGame.player.getFriendWarSchemeIdx(),
      finishCB: () => {
        const schemeIdx = mbgGame.player.getSavedSchemeIdx('pvpwar');
        // mbgGame.log("clickFriendWarAccept schemeIdx", schemeIdx);
        // 设置友谊赛用什么阵型
        mbgGame.netCtrl.sendMsg("frdwar.setScheme", {
          s: schemeIdx,
        }, (data) => {
          if (data.code === "err") {
            mbgGame.errMsg(data.err);
          } else {
            emitter.emit('closeMe');
            // 设置成功，继续原先的逻辑
            this.friendWar2(type);
          }
        });
      },
    });
  },
  friendWar2(type) {
    if (this._startFriendWarMatch) return;
    this._startFriendWarMatch = true;
    // mbgGame.log("startClanMatch", type);
    mbgGame.netCtrl.sendMsg("frdwar.startClanMatch", {
      type,
    }, (data) => {
      // mbgGame.log("startClanMatch", data);
      if (data.id !== -1) {
        // 屏蔽玩家操作，需要玩家在线等
        this.friendWarEventID = data.id;
        emitter.emit("waitFriendWar", true);
        this.clanFriendBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('cancel'));
      }
      delete this._startFriendWarMatch;
    });
  },

  clanInfo() {
    const data = mbgGame.getCache('clan.clanInfo');
    if (!data) return;
    mbgGame.resManager.loadPrefab('clanDetail', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'clanDetail', data);
    });
  },

  openClanDetail() {
    const data = mbgGame.getCache('clan.clanInfo', 30);
    if (!data) {
      mbgGame.checkNetCache('clan.clanInfo', this.clanInfo.bind(this));
      return;
    }
    if (!this.isValid) {
      return;
    }
    this.clanInfo();
  },

  onClickFilter() {
    if (!this.listMode) {
      this.listMode = 1;
    } else {
      this.listMode = 0;
    }
    mbgGame.resManager.setImageFrame(this.btnFilter, 'images', `clanChat${this.listMode}`);
    this.refreshList(true);
  },
});
