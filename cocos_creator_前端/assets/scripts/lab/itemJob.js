cc.Class({
  extends: cc.Component,

  properties: {
    jobWorker: cc.Node,
    jobDefault: cc.Node,
    jobName: cc.RichText,
    jobSubTitle: cc.RichText,
    jobAward: cc.RichText,
    jobNeedTime: cc.RichText,
    btnNode: cc.Node,
  },

  onLoad() {
    emitter.on(this, "labdata", this.onLabDataUpdated);
  },

  onDestroy() {
    emitter.off(this, "labdata");
  },

  onLabDataUpdated() {
    if (this._taskIdx) {
      this.initTask(this._taskIdx);
    } else if (this._bookID) {
      this.initBook(this._bookID, this._facID);
    }
  },

  initTask(idx) {
    const dTasks = mbgGame.player.getCurTasks();
    const task = dTasks[idx];
    if (!task) return;
    const taskID = task.id;
    const dTaskConfig = mbgGame.config.tasks[taskID];
    this._taskIdx = idx;

    const costTime = 60 * dTaskConfig.t;
    this.btnNode.getComponent('itemBtn').btnLabel = mbgGame.getString('enter');
    if (task.f) {
      // 已经有人做了
      const charaID = mbgGame.player.getCharaIDByFacID(task.f);
      const node = mbgGame.managerUi.getIconCharacter();
      this.jobWorker.addChild(node);
      const com = node.getComponent('iconCharacter');
      com.initMe({
        charaID,
      });
      this.jobDefault.active = false;
      const passTime = mbgGame.player.getFacPassWorkTime(task.f);
      const leftTime = mbgGame.player.getFacLeftWorkTime(task.f);
      if (passTime < 15 * 60) {
        this.jobNeedTime.string = mbgGame.getString('facjobtime', { s: moment.duration(costTime, 'second').humanize(true) });
      } else {
        this.jobNeedTime.string = mbgGame.getString('facjobtime', { s: moment.duration(leftTime, 'second').humanize(true) });
      }
      if (leftTime <= 0) {
        this.btnNode.getComponent('itemBtn').btnLabel = mbgGame.getString('done');
        this.jobNeedTime.string = '';
      }
    } else {
      this.jobNeedTime.string = moment.duration(costTime, 'second').humanize();
      this.jobDefault.active = true;
      this.jobWorker.active = false;
    }

    this.jobName.string = mbgGame.getString(`taskname${taskID}`);
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
    this.jobSubTitle.node.active = false;
  },

  logBook(charaID, bookID, facID) {
    const dBookConfig = mbgGame.config.books[bookID];
    const dFac = mbgGame.player.getFacDataByFacID(facID);

    const nowtime = moment().unix();

    let readPageFromBegin = nowtime - dFac.trT;
    if (readPageFromBegin > dFac.d) {
      // 不能超过最大可读页数
      readPageFromBegin = dFac.d;
    }
    // 当前结算页数
    const nowReadPages = readPageFromBegin - dFac.sP;
    const lastPages = mbgGame.player.getReadPages(charaID, bookID);
    const lastExp = mbgGame.player.calcReadExp(charaID, bookID, lastPages, dFac.lv);
    const nowExp = mbgGame.player.calcReadExp(charaID, bookID, lastPages + nowReadPages, dFac.lv);

    const getExp = Math.max(0, nowExp - lastExp);

    mbgGame.log(`
    角色ID: ${charaID} 书ID:${bookID}  页数${dBookConfig.pages}
    本次可读次数:${mbgGame.player.getReadPagesLimit(charaID, bookID)}
    上次记录页数:${mbgGame.player.getReadPages(charaID, bookID)}
    上次记录点页数:${dFac.sP} 读书开始到现在已读 ${readPageFromBegin}
    开始时间:${moment(dFac.trT * 1000).format('YY-MM-DD HH:mm:ss')}
    结束时间:${moment((dFac.trT + dFac.d) * 1000).format('YY-MM-DD HH:mm:ss')}
    上次经验点 ${lastExp} 本次经验点 ${nowExp}
    获得经验: ${getExp}
    `);
  },

  initBook(bookID, facID) {
    this._bookID = bookID;
    this._facID = facID;
    this.jobNeedTime.node.active = false;
    this.btnNode.getComponent('itemBtn').btnLabel = mbgGame.getString('enter');
    if (facID) {
      // 已经有人做了
      const charaID = mbgGame.player.getCharaIDByFacID(facID);
      const node = mbgGame.managerUi.getIconCharacter();
      this.jobWorker.addChild(node);
      const com = node.getComponent('iconCharacter');
      com.initMe({
        charaID,
      });
      com.addCornorMark(`sbook${bookID}`);
      this.jobSubTitle.node.active = false;
      this.jobDefault.active = false;
      const getExp = mbgGame.player.getNowReadExp(facID, charaID).getExp;
      this.jobAward.string = `<img src="logo_exp" />${getExp}`;

      // this.logBook(charaID, bookID, facID);
      if (mbgGame.player.getFacLeftWorkTime(facID)) {
        /*
        let timeCom = this.jobAward.node.getComponent('effectTimerString');
        if (!timeCom) {
          timeCom = this.jobAward.node.addComponent('effectTimerString');
        }
        timeCom.initMe({
          type: 'currency',
          interval: 30,
          firstStart: 30,
          aniDuration: 1.0,
          from: nowExp,
          unit: '<img src="logo_exp" />',
          getValue: () => {
            return mbgGame.player.getNowReadExp(facID, charaID).getExp;
          },
        });
        */
      } else {
        this.btnNode.getComponent('itemBtn').btnLabel = mbgGame.getString('done');
      }
    } else {
      this.jobDefault.active = true;
      this.jobWorker.active = false;
      this.jobAward.string = '';
      const desc = mbgGame.getString(`bookdesc${bookID}`);
      this.jobSubTitle.string = `${desc.substring(0, 35)} ...`;
      // this.jobAward.node.removeComponent('effectTimerString');
      mbgGame.resManager.setAutoAtlasFrame(cc.find('logo', this.jobDefault), 'labIcon', `book${bookID}`);
    }
    this.jobName.string = mbgGame.getString(`bookname${bookID}`);
  },
});