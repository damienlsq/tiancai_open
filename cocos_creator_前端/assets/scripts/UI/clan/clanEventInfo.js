const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    frameBg: cc.Sprite,
    frameWidget: cc.Widget,
    msg: cc.RichText,
    time: cc.Label,
    who: cc.RichText,
    icon: cc.Sprite,
    // 审批
    approve: cc.Node,
    reject: cc.Node,

    // 友谊战
    friendWarTitle: cc.Node,
    friendWar: cc.Node,
    friendWarReplay: cc.Node,
    warLabel: cc.Label,
    challenger: cc.RichText,
    arrowLeft: cc.Sprite,
    arrowRight: cc.Sprite,
    challengingLabel: cc.Label,
    leftResult: cc.Sprite,
    rightResult: cc.Sprite,

    // 求助
    helpBtn: cc.Node,
    blessBtn: cc.Node,
    info: cc.RichText,
    blessInfo: cc.RichText,

    // 分享回放
    replyBtn: cc.Node,

    // 物品框
    itemNode: cc.Node,
  },
  onLoad() {
    emitter.on(this, "updateClanEventInfo", this.initMe);
  },
  onDestroy() {
    // mbgGame.log('event onDestroy', this.id);
    delete this.id;
    emitter.off(this, "updateClanEventInfo");
  },

  initMe(id) {
    if (this.id && this.id !== id) return; // 刷新的
    this.id = id;
    const events = mbgGame.getCache('clan.clanEvents');
    if (!events) return;
    const data = events[id];
    this.m_Data = data;
    // mbgGame.log('eventInfo', data);

    // 区分左右的信息框
    if (data.mode === 0 || data.mode === 5 || data.mode === 6) {
      if (data.name !== mbgGame.userInfo.nickname) {
        this.frameWidget.isAlignRight = false;
        this.frameWidget.isAlignLeft = true;
        this.frameWidget.left = 20;
      } else {
        this.frameWidget.isAlignRight = true;
        this.frameWidget.isAlignLeft = false;
        this.frameWidget.right = 20;
        if (this.frameBg) {
          mbgGame.resManager.setAutoAtlasFrame(this.frameBg, 'labIcon', 'frameClanDialog1');
        }
      }
    }

    if (this.msg) {
      this.msg.string = data.msg || '';
      if (this.msg.string.indexOf(mbgGame.userInfo.nickname) !== -1) {
        this.msg.string = this.msg.string.replace(mbgGame.userInfo.nickname, `<color=#FFC704>${mbgGame.userInfo.nickname}</c>`);
      }
    }

    if (this.who) {
      // this.who.string = data.name || '';
      this.who.string = mbgGame.getString("clanMyName", {
        fontColor: data.name === mbgGame.userInfo.nickname ? "#FFC704" : "#FFFFFF",
        clanMyName: data.name || '',
      });
    }
    if (this.time) {
      if (data.t) {
        this.time.string = mbgGame.formatTime(data.t);
      } else {
        this.time.string = '';
      }
    }
    if (data.mode === 0) {
      if (this.icon && data.icon != null) {
        mbgGame.managerUi.setPlayerTotem(this.icon, data.icon);
      }
    }

    if (data.mode === 3) {
      this.friendWarType = data.type;
      mbgGame.setLabel(this.friendWarTitle, mbgGame.getString(`friendwar${this.friendWarType}`));
      if (data.name === mbgGame.userInfo.nickname) {
        this.friendWar.getComponent('itemBtn').setStatus(false);
      } else {
        this.friendWar.getComponent('itemBtn').setStatus(true);
      }
      if (data.status === 0) {
        this.challenger.string = mbgGame.getString("waitingChanllenger");
      } else {
        // 正在打或已结束
        this.friendWar.active = false;
        this.challengingLabel.node.active = true;
        this.challenger.string = mbgGame.getString("clanMyName", {
          fontColor: data.challenger === mbgGame.userInfo.nickname ? "#FFC704" : "#FFFFFF",
          clanMyName: data.challenger || '',
        });
      }
      if (data.wUUID) {
        // 已经结束，看回放
        this.friendWar.active = false;
        this.friendWarReplay.active = true;
        this.challengingLabel.node.active = false;
        this.leftResult.node.active = true;
        this.rightResult.node.active = true;
        if (data.isDraw) {
          mbgGame.resManager.setImageFrame(this.arrowLeft, 'images', 'arrow_left_gray');
          mbgGame.resManager.setImageFrame(this.arrowRight, 'images', 'arrow_right_gray');
          mbgGame.resManager.setImageFrame(this.leftResult, 'images', 'draw');
          mbgGame.resManager.setImageFrame(this.rightResult, 'images', 'draw');
        } else if (data.winner !== data.name) {
          mbgGame.resManager.setImageFrame(this.arrowLeft, 'images', 'arrow_left_gray');
          mbgGame.resManager.setImageFrame(this.leftResult, 'images', 'lose');
          mbgGame.resManager.setImageFrame(this.rightResult, 'images', 'win');
        } else {
          mbgGame.resManager.setImageFrame(this.arrowRight, 'images', 'arrow_right_gray');
        }
      } else {
        this.friendWarReplay.active = false;
      }
    }

    if (data.mode === 4) {
      // 求助
      mbgGame.resManager.setAutoAtlasFrame(this.icon, 'uiBase', `icon_chest${data.idx === 1 ? 1 : 4}`);

      if (this.msg !== null && data.msg) {
        this.msg.string = data.msg;
      } else {
        this.msg.string = mbgGame.getString('clanRequestInfo');
      }

      if (mbgGame.userInfo.nickname === data.name) {
        this.helpBtn.getComponent('itemBtn').setStatus(false);
      }
      if (data.logsR && data.logsR[mbgGame.userInfo.nickname]) {
        this.helpBtn.getComponent('itemBtn').setStatus(false);
      }
      if (data.curR >= mbgGame.config.constTable.clanRequestTimes) {
        this.helpBtn.getComponent('itemBtn').setStatus(false, '来慢了，已经不需要帮助啦');
      }
      if (data.curB >= mbgGame.config.constTable.clanBlessTimes) {
        this.blessBtn.getComponent('itemBtn').setStatus(false, '来慢了，已经收满祝福啦');
      }
      if (data.logsB && data.logsB[mbgGame.userInfo.nickname]) {
        this.blessBtn.getComponent('itemBtn').setStatus(false);
      }
      if (data.logsB) {
        this.blessInfo.node.active = true;
        this.blessInfo.string = mbgGame.getString('clanBlessInfo', {
          helper: _.keys(data.logsB).join(mbgGame.getString('comma')),
        });
        if (this.blessInfo.string.indexOf(mbgGame.userInfo.nickname) !== -1) {
          this.blessInfo.string = this.blessInfo.string.replace(mbgGame.userInfo.nickname, `<color=#FFC704>${mbgGame.userInfo.nickname}</c>`);
        }
      } else {
        this.blessInfo.node.active = false;
        this.blessInfo.string = '';
      }
    }

    if (data.mode === 5) {
      // 回放
      /*       if (data.msg) {
              this.msg.string = `<color=#BAC5E5>${data.msg}</c>`;
            } else {
              this.msg.string = `<color=#BAC5E5>${mbgGame.getString('clanShareWar')}</c>`;
            } */
      if (data.warInfo && data.warInfo.info) {
        // this.info.string = `<color=#00FF42>${mbgGame.getString('videoReplay')}${data.warInfo.info}</c>`;
        this.msg.string = mbgGame.getString('clanShareWarInfo', {
          msg: data.msg || mbgGame.getString('clanShareWar'),
          info: data.warInfo.info,
        });
      }
    }

    if (data.mode === 6) {
      // 道具分享
      const name = mbgGame.getString(`itemname${data.itemData.i}`);
      const itemName = mbgGame.getString(`iname${data.itemData.q}`, {
        name: `【<img src="star${data.itemData.s}" />${name}】`,
      });

      this.msg.string = mbgGame.getString('clanShareItemInfo', {
        msg: data.msg || mbgGame.getString('clanShareItem'),
        itemName,
      });
    }
  },

  onReplay() {
    mbgGame.player.doReplay(this.m_Data.wUUID, "clan");
  },
  openItemInfo() {
    const dData = {
      itemData: this.m_Data.itemData,
      style: 'award',
    };
    mbgGame.managerUi.openItemInfo(dData, true);
  },

  doApprove(op) {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      op,
      id: this.id,
    }, (data) => {
      // 信息可能已经删除
      if (data.status !== 0) {
        const events = mbgGame.getCache('clan.clanEvents');
        if (events) {
          delete events[this.id];
        }
        if (this.node && this.node.isValid) {
          this.node.destroy();
        }
      }
    });
  },
  clickApprove() {
    this.doApprove('approve');
  },
  clickReject() {
    this.doApprove('reject');
  },
  clickHelp() {
    const lefttimes = mbgGame.player.getDayLeftTimes('helpClan');
    mbgGame.log("lefttimes", lefttimes);
    if (lefttimes <= 0) {
      mbgGame.managerUi.floatMessage('今天帮助次数已用完');
    }
    this.doApprove('help');
  },
  clickBless() {
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("clanBlessAsk", {
        price: mbgGame.config.constTable.clanBlessPrice,
      }), this.doApprove.bind(this, 'bless'));
  },
  clickFriendWarAccept() {
    // 需要先开启竞技场
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
        mbgGame.log("clickFriendWarAccept schemeIdx", schemeIdx);
        // 设置友谊赛用什么阵型
        mbgGame.netCtrl.sendMsg("frdwar.setScheme", {
          s: schemeIdx,
        }, (data) => {
          if (data.code === "err") {
            mbgGame.errMsg(data.err);
          } else {
            emitter.emit('closeMe');
            // 设置成功，继续原先的逻辑
            this.clickFriendWarAccept2();
          }
        });
      },
    });
  },
  clickFriendWarAccept2() {
    if (this.isClanFriendWarBegin) return;
    this.isClanFriendWarBegin = true;
    const self = this;
    mbgGame.netCtrl.sendMsg("frdwar.startClanFight", {
      id: this.id,
      type: this.friendWarType,
    }, () => {
      // mbgGame.log("clickFriendWarAccept", data);
      delete self.isClanFriendWarBegin;
    });
  },

});
