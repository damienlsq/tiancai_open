// 定时器变化支付串

/*
时间样式：
leftTime: 剩余时间: X
jobTime: %{s}<img src="timerBlue" />


*/

cc.Class({
  extends: cc.Component,

  initMe(data) {
    let com = this.node.getComponent(cc.Label);
    if (!com) {
      com = this.node.getComponent(cc.RichText);
    }
    if (!com) return;
    // 只支持label或RichText
    this.timeCom = com;

    data = data || {};
    this.m_data = data;
    if (this.m_data.duration) {
      this.m_data.endTime = moment().unix() + this.m_data.duration;
    }
    this.updateStr();
    if (!this._isStart) {
      // 允许重复initMe,但不要开多个定时器
      this.schedule(this.updateStr, data.interval || 1, cc.macro.REPEAT_FOREVER, data.firstStart || data.interval || 1);
      this._isStart = true;
    }
  },

  updateStr() {
    if (this.m_data.endTime) {
      const now = moment().unix();
      const timediff = this.m_data.endTime - now;

      if (timediff <= 0) {
        this.timeCom.string = this.m_data.endStr || '';
      } else if (this.m_data.strKey) {
        let keyOption = {
          t: mbgGame.transTime(timediff),
        };
        if (this.m_data.strKeyOption) {
          keyOption = _.extend(keyOption, this.m_data.strKeyOption);
        }
        this.timeCom.string = mbgGame.getString(this.m_data.strKey, keyOption);
      } else if (this.m_data.strPrefix || this.m_data.strSuffix) {
        this.timeCom.string = `${this.m_data.strPrefix || ''}${mbgGame.transTime(timediff)}${this.m_data.strSuffix || ''}`;
      } else {
        this.timeCom.string = mbgGame.transTime(timediff);
      }
      if (timediff <= 0) {
        // 计时器停止
        this.unschedule(this.updateStr);
        if (this.m_data.endFunc) {
          this.m_data.endFunc();
        }
      }
    } else if (this.m_data.type === 'currency') {
      const val = this.m_data.getValue();
      if (!this.hasOwnProperty('_from')) {
        this._from = this.m_data.from || val;
      }
      this._to = val;
      this.t = 0;
    }
  },
  update(dt) {
    if (!this.m_data) return;
    if (!this.m_data.aniDuration) return;
    if (!this.hasOwnProperty('_to')) return;
    this.t += dt;
    const p = Math.min(this.t / this.m_data.aniDuration, 1);
    const current = Math.ceil(this._from + (p * (this._to - this._from)));
    this.timeCom.string = `${this.m_data.unit || ''}${current}`;

    if (current >= this._to) {
      this._from = this._to;
      delete this._to;
    }
  },
});
