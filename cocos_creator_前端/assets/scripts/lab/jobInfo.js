const facWinBase = require('facWinBase');
const labdefines = require('labdefines');

cc.Class({
  extends: facWinBase,

  properties: {
    jobName: cc.Node,
    floorCharaPos: cc.Node,
    jobExtra: cc.Node,
    btnRight: cc.Node,
    btnLeft: cc.Node,
  },

  onAddBaseWin(idx, facID) {
    this.m_idx = idx;
    this.m_FacID = facID;
    const charaID = mbgGame.player.getCharaIDByFacID(facID);

    let extraStr = '';
    if (charaID <= 15) {
      this.setCharaSpine(charaID, [
        { action: 'normal', weight: 100 },
      ]);
    } else {
      this.setCharaSpine(charaID);
    }
    mbgGame.setLabel(this.jobExtra, '');
    const com = this.m_floorCharacter.getComponent("floorCharacter");
    const msg = mbgGame.player.getFacTalk(charaID, charaID > 15);
    // mbgGame.log('say:', msg);
    if (msg) {
      com.say(msg, 99999);
    }
    const leftTime = mbgGame.player.getFacLeftWorkTime(facID);

    if (this.isCol()) {
      const dTask = mbgGame.player.getCurTasks();
      const task = dTask[idx];
      const curFacType = labdefines.FacID2Type[task.f];
      const cost = this.calFastDiamonds(curFacType, leftTime);
      this.btnRight.getComponent('itemBtn').setBtnLabel(`快速完成<br />${mbgGame.getString('unitPrice', {
        price: cost,
        unit: 'logo_diamonds',
      })}`);
      mbgGame.setLabel(this.jobName, mbgGame.getString(`taskname${task.id}`));
      this.btnLeft.getComponent('itemBtn').setBtnLabel(mbgGame.getString('facHalt'));

      const dTaskConfig = mbgGame.config.tasks[task.id];
      const dLabConfig = mbgGame.config[`lab${mbgGame.player.getLabLv()}`];
      // mbgGame.log('dLabConfig', dLabConfig, mbgGame.smartNum(Math.round(dLabConfig.labCoinsK * dTaskConfig.t)));
      let reward;
      if (dTaskConfig.type === 'coins') {
        reward = `<img src="logo_coins" />${mbgGame.smartNum(Math.round(dLabConfig.labCoinsK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'mat') {
        reward = `<img src="logo_mat" />${mbgGame.smartNum(Math.round(dLabConfig.labMatK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'diamonds') {
        reward = `<img src="logo_diamonds" />${mbgGame.smartNum(Math.round(dLabConfig.labDiamondsK * dTaskConfig.t))}`;
      } else if (dTaskConfig.type === 'sta') {
        reward = `<img src="logo_sta" />${mbgGame.smartNum(Math.round(dLabConfig.labStaK * dTaskConfig.t))}`;
      }
      const timeCom = this.jobExtra.addComponent('effectTimerString');
      timeCom.initMe({
        duration: leftTime,
        interval: 1,
        strKey: 'taskDesc',
        strKeyOption: {
          reward,
        },
      });
      /*
      const leftLabel = this.btnLeft.getComponent('itemBtn').getLabelNode();
      if (leftLabel) {
        const timeCom = leftLabel.addComponent('effectTimerString');

        timeCom.initMe({
          duration: leftTime,
          interval: 1,
          strPrefix: `${mbgGame.getString('facHalt')}<br />`,
        });
      }
      */
    } else if (this.isRead()) {
      const bname = mbgGame.getString(`bookname${idx}`);
      /*
      if (mbgGame.channel_id !== 'test') {
        mbgGame.setLabel(this.jobName, bname);
        mbgGame.setLabel(this.jobExtra, '');
        this.btnRight.active = false;
        this.btnLeft.getComponent('itemBtn').setBtnLabel(mbgGame.getString('facHalt'));
        return;
      }*/
      mbgGame.setLabel(this.jobName, '');
      const cname = mbgGame.player.getCharaName(charaID);
      const exps = mbgGame.player.getNowReadExp(facID, charaID);
      let t;
      if (exps.times <= 1) {
        t = `${exps.nowPages}页`;
      } else {
        t = `${exps.times}次${exps.nowPages}页`;
      }
      extraStr = mbgGame.getString('readDesc', {
        cname,
        bname,
        totalTime: t,
        totalExp: mbgGame.smartNum(exps.lastExp),
        nowExp: mbgGame.smartNum(exps.getExp),
      });
      this.btnRight.active = true;
      this.btnRight.getComponent('itemBtn').setBtnLabel(mbgGame.getString('readGet'));
      this.btnLeft.getComponent('itemBtn').setBtnLabel(mbgGame.getString('facHalt'));
      mbgGame.setLabel(this.jobExtra, extraStr);
    } else if (this.isGym()) {
      mbgGame.setLabel(this.jobName, mbgGame.getString(`facname${facID}`));
      /*
      if (mbgGame.channel_id !== 'test') {
        mbgGame.setLabel(this.jobExtra, '');
        this.btnRight.active = false;
        this.btnLeft.getComponent('itemBtn').setBtnLabel(mbgGame.getString('facHalt'));
        return;
      }*/
      // 每次进入都先判断结算一下
      this.btnRight.active = true;
      this.btnRight.getComponent('itemBtn').setBtnLabel(mbgGame.getString('gymGet'));
      this.btnLeft.getComponent('itemBtn').setBtnLabel(mbgGame.getString('facHalt'));
      const cname = mbgGame.player.getCharaName(charaID);
      const reward = mbgGame.player.calcGymReward(charaID, facID);
      let rewardStr = '';
      let rewardStr2 = '';
      if (charaID <= 15) {
        rewardStr = `<img src="logo_mat" />${mbgGame.smartNum(reward.mat)}`;
        rewardStr2 = `<img src="logo_mat" />${mbgGame.smartNum(reward.tValue)}`;
      } else if (reward.coins) {
        rewardStr = `<img src="logo_coins" />${mbgGame.smartNum(reward.coins)}`;
        rewardStr2 = `<img src="logo_coins" />${mbgGame.smartNum(reward.tValue)}`;
      }
      extraStr = mbgGame.getString('gymDesc', {
        cname,
        totalTime: mbgGame.transTime(reward.sP),
        totalReward: rewardStr2,
        nowReward: rewardStr,
      });
      mbgGame.setLabel(this.jobExtra, extraStr);
    }
  },

  onHalt() {
    const idx = this.m_idx;
    // halt之前判断是不是已经完成了
    const facID = this.getFacID(idx);
    const leftTime = mbgGame.player.getFacLeftWorkTime(facID);
    if (leftTime <= 0) {
      return;
    }
    const charaID = mbgGame.player.getCharaIDByFacID(facID);
    // 取消本地推送
    mbgGame.player.removeFacFinishPush(charaID, facID);
    if (this.isCol()) {
      mbgGame.managerUi.createConfirmDialog(
        mbgGame.getString('halttask', {
          chara: mbgGame.player.getCharaName(charaID),
        }),
        () => {
          emitter.emit('closeMe');
          mbgGame.panelLab.removeCharaFromFac(facID, charaID, false);
        });
    } else if (this.isRead() || this.isGym()) {
      // 应该发finish
      emitter.emit('closeMe');
      this.onFinish(idx);
    }
  },

  calFastDiamonds(facType, seconds) {
    const hours = seconds / 3600;
    let costDiamonds = Math.ceil(mbgGame.config.constTable.FastRatio[facType] * hours);
    costDiamonds = Math.min(costDiamonds, mbgGame.config.constTable.FastMaxDiamonds);
    return costDiamonds;
  },

  onGetExp() {
    const facID = this.m_FacID;
    const charaID = mbgGame.player.getCharaIDByFacID(facID);

    mbgGame.netCtrl.sendMsg('lab.finish', {
      facID,
      isFinish: false, // 结束与未结束
    }, (data) => {
      if (data.code === "ok") {
        // mbgGame.log('lab.finish', data);
        const floorCom = mbgGame.panelLab.getFacFloorCom(facID);
        if (data.ret && data.ret.remove) {
          floorCom.characterLeft(charaID, facID);
          delete data.remove;
        }
        floorCom.refreshFloor();
        if (data && data.ret && data.ret.result) {
          data.ret.result.isLab = true;
          mbgGame.managerUi.openWinResult(data.ret.result);
        }
      }
    });
  },

  onFastFinish() {
    if (this.isRead() || this.isGym()) {
      this.onGetExp();
      emitter.emit('closeMe');
      return;
    }
    const idx = this.m_idx;
    const facID = this.getFacID(idx);
    const leftTime = mbgGame.player.getFacLeftWorkTime(facID);
    const curFacType = labdefines.FacID2Type[facID];
    const costDiamonds = this.calFastDiamonds(curFacType, leftTime);
    let keyName;
    if (this.isCol()) {
      keyName = 'fasttask';
    } else {
      return;
    }
    mbgGame.managerUi.createConfirmDialog(
      mbgGame.getString(keyName, {
        n: costDiamonds,
      }),
      () => {
        this.onFinish(idx, true);
        emitter.emit('closeMe');
      });
  },

});