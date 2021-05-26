const facWinBase = require('facWinBase');

cc.Class({
  extends: facWinBase,

  properties: {
    jobName: cc.RichText,
    jobDesc: cc.RichText,
    jobAward: cc.RichText,
    jobTime: cc.RichText,

    charasContent: cc.Node,

    confirmBtn: cc.Node,
  },

  getOrCreateHead(charaID) {
    if (!this.m_CharaHeads) {
      this.m_CharaHeads = {};
    }
    if (!this.m_CharaHeads[charaID]) {
      const icon = mbgGame.managerUi.getIconCharacter();
      const contentName = `charaContent${Math.ceil(charaID / 5)}`;
      const contentNode = this.charasContent.getChildByName(contentName);
      const content = contentNode.getChildByName('content');
      content.addChild(icon);
      const iconCom = icon.getComponent("iconCharacter");
      this.m_CharaHeads[charaID] = iconCom;
    }
    return this.m_CharaHeads[charaID];
  },
  refreshWorkers() {
    for (let charaID = 1; charaID <= 15; charaID++) {
      const iconCom = this.getOrCreateHead(charaID);

      iconCom.initMe({
        charaID,
        lv: mbgGame.player.getCharaLv(charaID),
      });
      if (!mbgGame.player.hasChara(charaID)) {
        iconCom.setStatus('unLock');
      } else if (mbgGame.player.isCharaWorking(charaID)) {
        iconCom.setStatus('inUse');
        iconCom.showFacState();
      } else {
        iconCom.setStatus();
        if (this.isRead()) {
          iconCom.addCornorMark(`face${mbgGame.player.getBookHappyLvl(charaID, this.m_curJobID, 1)}`);
        }
        iconCom.addButton(this, 'panelLabJobDetail', 'onSelectWorker');
      }
    }
  },

  onSelectWorker(event) {
    if (!event.target || !event.target.isValid) return;
    const com = event.target.getComponent('iconCharacter');
    if (this._lastSelectWorker) {
      if (this._lastSelectWorker === com) {
        this._lastSelectWorker.setSelected(false);
        this.refreshConfirmBtn();
        delete this._lastSelectWorker;
        return;
      }
      this._lastSelectWorker.setSelected(false);
    }
    com.setSelected(true);
    const charaID = com.m_CharaID;
    this._lastSelectWorker = com;

    if (this.isRead()) {
      const dBookConfig = mbgGame.config.books[this.m_curJobID];
      const pages = mbgGame.player.getReadPages(charaID, this.m_curJobID);
      let times = Math.floor(pages / dBookConfig.pages);
      if (times > 3) times = 3;
      if (times < 0) times = 0;
    }
    this.refreshConfirmBtn(charaID);
  },

  onAddBaseWin(idx, facID) {
    this.m_FacID = facID;
    this.m_curJobID = idx;
    if (this.isCol()) {
      this.node._winBase.setTitle(mbgGame.getString('title_labworkingroom'));
      this.node._winTooltips = mbgGame.getString('tooltips_workDesc');
      const dTasks = mbgGame.player.getCurTasks();
      const task = dTasks[this.m_curJobID];
      const dTaskConfig = mbgGame.config.tasks[task.id];
      const costTime = 60 * dTaskConfig.t;
      this.jobName.string = mbgGame.getString(`taskname${task.id}`);
      this.jobDesc.string = mbgGame.getString(`taskdesc${task.id}`);
      this.jobTime.string = moment.duration(costTime, 'second').humanize();
      const dLabConfig = mbgGame.config[`lab${mbgGame.player.getLabLv()}`];
      // mbgGame.log('dLabConfig', dLabConfig, mbgGame.smartNum(Math.round(dLabConfig.labCoinsK * dTaskConfig.t)));
      if (dTaskConfig.type === 'coins') {
        this.jobAward.string = `<img src="logo_coins" />${mbgGame.smartNum(Math.round(dLabConfig.labCoinsK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'mat') {
        this.jobAward.string = `<img src="logo_mat" />${mbgGame.smartNum(Math.round(dLabConfig.labMatK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'diamonds') {
        this.jobAward.string = `<img src="logo_diamonds" />${mbgGame.smartNum(Math.round(dLabConfig.labDiamondsK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'sta') {
        this.jobAward.string = `<img src="logo_sta" />${mbgGame.smartNum(Math.round(dLabConfig.labStaK * dTaskConfig.t))}`;
      }
    } else if (this.isRead()) {
      this.node._winBase.setTitle(mbgGame.getString('title_labreadingroom'));
      this.node._winTooltips = mbgGame.getString('tooltips_readDesc');
      this.jobName.string = mbgGame.getString(`bookname${this.m_curJobID}`);
      /*
      const com = this.jobDesc.node.addComponent('effectPrinter');
      com.print(mbgGame.getString(`bookdesc${this.m_curJobID}`));
      */
      this.jobDesc.string = mbgGame.getString(`bookdesc${this.m_curJobID}`);
      this.jobTime.node.active = false;
      this.jobAward.node.active = false;
    } else if (this.isGym()) {
      this.m_FacID = facID;
      this.node._winBase.setTitle(mbgGame.getString('title_labgameroom'));
      this.node._winTooltips = mbgGame.getString('tooltips_gymDesc');
      this.jobName.string = mbgGame.getString(`facname${facID}`);
      this.jobDesc.string = mbgGame.getString(`facdesc${facID}`);
      this.jobTime.node.active = false;
      this.jobAward.node.active = false;
    }
    this.refreshWorkers();
    this.refreshConfirmBtn();
  },

  refreshConfirmBtn(charaID) {
    let avoidMsg;

    if (!charaID) {
      this.confirmBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('close'));
      return;
    }

    if (!this.getFreeFacID()) {
      avoidMsg = mbgGame.getString('facLack');
    }
    if (charaID >= 15 && mbgGame.player.isCharaWorking(charaID)) {
      avoidMsg = mbgGame.getString('facBusy', {
        c: mbgGame.player.getCharaName(charaID),
      });
    }

    if (avoidMsg) {
      this.confirmBtn.getComponent('itemBtn').setStatus(false, avoidMsg);
    }
    this.confirmBtn.getComponent('itemBtn').setBtnLabel(mbgGame.getString('start'));
  },

  onConfirm() {
    if (!this._lastSelectWorker) {
      // 关闭界面
      emitter.emit('closeMe');
      return;
    }
    const facID = this.m_FacID || this.getFreeFacID();

    // 找一个没工作的工位
    if (!this._lastSelectWorker) return;

    const charaID = this._lastSelectWorker.getId();
    let addData = { bookID: this.m_curJobID };
    if (this.isCol()) {
      addData = { idx: this.m_curJobID };
    } else if (this.isRead()) {
      addData = { bookID: this.m_curJobID };
    } else if (this.isGym()) {
      addData = null;
    }
    if (!facID) {
      // 没可用设施
      emitter.emit('closeMe');
      return;
    }

    mbgGame.panelLab.addCharaToFac(facID, charaID, addData, () => {
      emitter.emit('closeMe');
    });
  },
});