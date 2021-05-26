// spineCtrl和spineObject的共同代码放这里
cc.Class({
  extends: cc.Component,
  onLoad() {
  },
  spine() {
    if (!this._spine) {
      this._spine = this.node.getComponent(sp.Skeleton);
    }
    return this._spine;
  },
  setSkin(name) {
    this.spine().setSkin(name);
  },
  setSpineData(skData, skinName) {
    this.m_SpineLoaded = true;
    // 执行完读取数据后
    this.spine().skeletonData = skData;
    this.spine().setToSetupPose();
    if (skinName) {
      this.setSkin(skinName);
    }
    if (this.onSpineLoad) {
      this.onSpineLoad();
      delete this.onSpineLoad;
    }
    if (this.m_cachedAct) {
      this.doAction(this.m_cachedAct[0], this.m_cachedAct[1]);
      delete this.m_cachedAct;
    }
  },
  isSpineLoaded() {
    return this.m_SpineLoaded;
  },
  spineName() {
    return this._spineName;
  },
  loadSpine(spineName) {
    if (!this.spine()) {
      mbgGame.error("[spineBase.loadSpine] no spine, spineName", spineName);
      return;
    }
    this.m_SpineLoaded = false;
    this._spineName = spineName;
    mbgGame.resManager.getSpineData(spineName, this);
  },
  setScale(x, y) {
    this.node.scaleX = x;
    this.node.scaleY = y;
  },
  turnRight() {
    this.node.scaleX = (-1 * Math.abs(this.node.scaleX));
  },
  turnLeft() {
    this.node.scaleX = (1 * Math.abs(this.node.scaleX));
  },
  logError(act, tag) {
    if (this.spineName()) {
      mbgGame.warn("缺少动作:", tag, this.spineName(), act);
    }
  },
  setComplteCB(cb) {
    this.onCompleteCB = cb;
    this.spine().setCompleteListener(this.spineComplete.bind(this));
  },
  spineComplete(track, loopCount) {
    if (this.onCompleteCB) {
      // mbgGame.log("[track %s] complete", track, loopCount, this._name);
      const cb = this.onCompleteCB;
      delete this.onCompleteCB;// 删掉防止出bug，如果需要反复执行cb，就在cb里重新设置
      cb(this.node);
    }
  },
  doSequenceAction(...args) {
    this.stop();
    let ret = this.spine().setAnimation(0, args[0], false);
    if (!ret) {
      this.logError(args[0], 'doSequenceAction1');
    }
    // 中间动作
    for (let i = 1; i < args.length - 1; i++) {
      ret = this.spine().addAnimation(0, args[i], false, 0);
      if (!ret) {
        this.logError(args[i], 'doSequenceAction2');
      }
    }
    ret = this.spine().addAnimation(0, args[args.length - 1], true, 0);
    if (!ret) {
      this.logError(args[args.length - 1], 'doSequenceAction2');
    }
  },
  doOnceAction(first, second, noClear) {
    if (!noClear) {
      this.stop();
    }
    let ret = this.spine().setAnimation(0, first, false);
    if (!ret) {
      this.logError(first, 'doOnceAction1');
      ret = this.spine().setAnimation(0, second, true);
      if (!ret) {
        this.logError(second, 'doOnceAction2');
        return;
      }
      return;
    }
    ret = this.spine().addAnimation(0, second, true, 0);
    if (!ret) {
      this.logError(second, 'doOnceAction3');
    }
  },
  doAction(act, repeat) {
    if (act === 'normal') {
      if (!_.includes(this._spineName, 'chara')) {
        act = 'stand'; // 怪物没有normal动作
      }
    }
    if (!this.isSpineLoaded()) {
      this.m_cachedAct = [act, repeat];
      return 1;
    }
    this.stop();
    return this.setMyAnimation(0, act, repeat);
  },
  doActionNoClear(act, repeat) {
    // this.stop();
    return this.setMyAnimation(0, act, repeat);
  },
  delayRemoveMe(delay) {
    this.node.runAction(cc.sequence(
      cc.delayTime(delay),
      cc.removeSelf()));
  },
});