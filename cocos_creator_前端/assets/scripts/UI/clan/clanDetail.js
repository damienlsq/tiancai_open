const mbgGame = require("mbgGame");

cc.Class({
  extends: cc.Component,

  properties: {
    clanName: cc.Label,
    clanDesc: cc.Label,
    clanMode: cc.RichText,
    clanScore: cc.RichText,
    clanNeed: cc.RichText,
    clanCount: cc.RichText,
    kick: cc.Node,
    promote: cc.Node,
    demote: cc.Node,
    exit: cc.Node,
    btnSetup: cc.Node,
    btnDND: cc.Node,
    container: cc.Node,
    flag: cc.Node,
    btnClose: cc.Node,
    btnDNDSelect: cc.Node,
  },

  onLoad() {
    // 保存模版
    this.memberInfoTemplate = cc.instantiate(this.container.children[0]);
    this.container.removeAllChildren();

    this.node._winTitle = mbgGame.getString('title_clanDetail');

    this.kick.active = false;
    this.promote.active = false;
    this.demote.active = false;
    this.btnSetup.active = false;
    this.btnDND.active = false;
    this.exit.active = false;
    this.btnClose.active = false;

    this.myJob = -1; // 查看其它联盟的时候，就是-1
    emitter.on(this, 'clickMemberInfo', this.clickMember);
  },

  onDestroy() {
    emitter.off(this, 'clickMemberInfo');
  },

  // 点击了相对应的成员，权限检查
  clickMember(id) {
    if (this.myJob === -1) return -1;
    this.id = id;
    const targetMember = this.detailData.members[id];
    // mbgGame.log('clickMember', this.myJob, id, targetMember);
    if (!targetMember) return 0;
    this.targetMember = targetMember;

    if (this.myJob === 0 || this.myName === targetMember.name) {
      this.kick.active = false;
      this.promote.active = false;
      this.demote.active = false;
    } else if (targetMember.job === 0) {
      this.kick.active = true;
      this.promote.active = true;
      this.demote.active = false;
    } else if (this.myJob < targetMember.job) {
      this.kick.active = true;
      this.promote.active = true;
      this.demote.active = true;
    }

    if (targetMember.job === 0) {
      this.demote.active = false; // 不能降低了
    }
    if (targetMember.job === 1) {
      this.promote.active = false; // 不能提升了
    }
    return 0; // 需要mask
  },

  print(id) {
    const node = cc.instantiate(this.memberInfoTemplate);
    this.container.addChild(node);

    const com = node.getComponent("memberInfo");
    com.initMe(this, id);
  },

  refreshMe() {
    this.container.removeAllChildren();

    if (!this.detailData) return;
    // mbgGame.log('this.detailData', this.detailData);

    mbgGame.managerUi.addIconFlag(this.flag, this.detailData.flag);
    this.clanName.string = this.detailData.name || '';
    this.clanDesc.string = this.detailData.desc;
    this.clanMode.string = mbgGame.getString(`clanMode${this.detailData.mode || 0}`);
    if (this.clanScore && this.detailData.tScore !== null) {
      this.clanScore.string = `${this.detailData.tScore || 0} <img src="logo_score" />`;
    }
    this.clanCount.string = `${this.detailData.members.length} / ${mbgGame.config.constTable.clanMemberMax}`;
    this.clanNeed.string = `${this.detailData.score || '0'} <img src="logo_score" />`;
    const now = moment().unix();
    this.detailData.members = _.sortBy(this.detailData.members, (x) => {
      if (x.lt === 1) return now;
      return x.lt;
    });

    for (let i = 0; i < this.detailData.members.length; i++) {
      this.print(i);
      if (this.detailData.members[i].isMe) {
        this.myJob = this.detailData.members[i].job;
        this.myName = this.detailData.members[i].name;
      }
    }

    if (this.myJob === -1) {
      this.btnClose.active = true;
      if (!mbgGame.hasClan) {
        //  退出按钮为申请
        this.btnClose.getComponent('itemBtn').setBtnLabel(mbgGame.getString('clanApply'));
        if (this.detailData.done) {
          this.btnClose.getComponent('itemBtn').setStatus(false, '你已经申请过了，请稍等片刻再发送加入该联盟的请求！');
        }
      } else {
        this.btnClose.getComponent('itemBtn').setBtnLabel(mbgGame.getString('ok'));
      }
      return;
    }

    this.promote.active = false;
    this.demote.active = false;
    this.kick.active = false;
    if (this.myJob === 1) {
      // 会长功能，只要少于一个人才会显示解散
      if (this.detailData.members.length <= 1) {
        this.exit.getComponent('itemBtn').setBtnLabel(mbgGame.getString('clanDismiss'));
        this.exit.active = true;
      } else {
        this.exit.active = false;
      }
    } else {
      this.exit.getComponent('itemBtn').setBtnLabel(mbgGame.getString('exit'));
      this.exit.active = true;
    }
    if (this.myJob !== 0 && this.myJob <= 2) {
      // 会长或副会长可以修改配置
      this.btnSetup.active = true;
    } else {
      this.btnSetup.active = false;
    }

    if (this.myJob !== -1) {
      const clanBase = mbgGame.getCache('clan.base');
      this.btnDND.active = true;
      let dndShow = true;
      if (clanBase.dnd) dndShow = false;
      this.btnDNDSelect.getComponent('itemBtn').setSelectStatus(dndShow);
    } else {
      this.btnDND.active = false;
    }
  },

  onAddBaseWin(data) {
    if (!data) return;
    this.detailData = data;
    this.refreshMe();
  },

  clickSetup() {
    mbgGame.resManager.loadPrefab('clanModify', (prefab) => {
      const node = cc.instantiate(prefab);
      mbgGame.managerUi.addNormalWin(node, 'clanCreate', this.detailData);
      this.node._winBase.closeMe();
    });
  },

  clickDND() {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      op: 'dnd',
    }, () => {
      // mbgGame.log("clanOp", data);
      const clanBase = mbgGame.getCache('clan.base');
      clanBase.dnd = !clanBase.dnd;
      if (this.node && this.node.isValid) {
        this.refreshMe();
      }
    });
  },

  doKick() {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      id: this.targetMember.name,
      op: 'kick',
    }, (data) => {
      // mbgGame.log("clanOp", data);
      if (data.status === 0) {
        // 踢人需谨慎，所以踢完关闭窗口，不让他方便的很快踢
        if (this.node && this.node.isValid) {
          this.node._winBase.closeMe();
        }
      }
    });
  },
  clickKick() {
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("operateConfirm"),
      this.doKick.bind(this));
  },

  doPromote(isConfirm) {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      id: this.targetMember.name,
      op: 'promote',
      isConfirm,
    }, (data) => {
      // mbgGame.log("clanOp", data);
      if (data.status !== -1) {
        emitter.emit("clanMemberUpdate", data.status);
        this.detailData.members[this.id] = data.status;
        this.clickMember(this.id);
        if (data.status.job === 1) {
          // 如果目标已经变成会长，关闭界面
          if (this.node && this.node.isValid) {
            this.node._winBase.closeMe();
          }
        }
      }
    });
  },

  clickPromote() {
    if (this.targetMember.job === 2) {
      // 转让会长
      mbgGame.managerUi.createConfirmDialog(
        mbgGame.getString("clanPromoteAsk", {
          name: this.targetMember.name,
        }), () => {
          this.doPromote(1);
        });
      return;
    }
    this.doPromote();
  },

  clickDemote() {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      id: this.targetMember.name,
      op: 'demote',
    }, (data) => {
      // mbgGame.log("clanOp", data);
      if (data.status !== -1) {
        emitter.emit("clanMemberUpdate", data.status);
        this.detailData.members[this.id] = data.status;
        this.clickMember(this.id);
      }
    });
  },

  doExit() {
    mbgGame.netCtrl.sendMsg("clan.clanOp", {
      op: 'exit',
    }, (data) => {
      // mbgGame.log("clanOp", data);
      if (data.status === 0) {
        emitter.emit('closeMe');
        delete mbgGame.hasClan;
        mbgGame.removeCache('clan.base');
        mbgGame.removeCache('clan.clanEvents');
        emitter.emit('refreshClan');
        mbgGame.player.setLocalItem('clanExitTime', `${moment().unix()}`);
      }
    });
  },
  clickExit() {
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString("operateConfirm"),
      this.doExit.bind(this));
  },

  doApply() {
    // 一定要设置呢称才能申请
    if (!mbgGame.userInfo.nickname) {
      mbgGame.managerUi.changeNickName();
      return;
    }
    const t = mbgGame.player.getLocalItem('clanExitTime') || 0;
    if (+t + mbgGame.config.constTable.clanJoinAgain >= moment().unix()) {
      mbgGame.managerUi.floatMessage('你刚离开联盟，1小时内不能重新加入联盟');
      return;
    }
    // 申请过一次就不能再申请相同联盟了
    // this.btnApply.getComponent('itemBtn').setStatus(false);
    mbgGame.netCtrl.sendMsg("clan.applyClan", {
      uuid: this.detailData.uuid,
    }, (data) => {
      // mbgGame.log("clickApply", data);
      // 只要申请过，就不能再点了
      const list = mbgGame.getCache('clan.searchClan');
      const c = _.find(list, { uuid: this.detailData.uuid });
      if (c) {
        c.done = true;
      }
      if (data.status === 2) {
        // 直接加入成功了
        mbgGame.hasClan = true;
        mbgGame.player.removeLocalItem('clanExitTime');
        emitter.emit('refreshClan');
      }
      emitter.emit('closeMe');
    });
  },

  onClose() {
    if (!mbgGame.hasClan) {
      this.doApply();
      return;
    }
    emitter.emit('closeMe');
  },
});