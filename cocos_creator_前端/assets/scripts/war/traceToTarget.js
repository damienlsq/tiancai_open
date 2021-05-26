cc.Class({
  extends: cc.Component,

  properties: {
  },

  // use this for initialization
  onLoad() {
    this.cleanVars();
  },
  // called every frame, uncomment this function to activate update callback
  update(dt) {
    if (this.finish || !this.tracing) {
      return;
    }
    this.t += dt;
    let percent = this.t / this.traceTime;
    if (percent >= 1) percent = 1;
    this.updatePos(percent);
    if (percent >= 1) {
      // 到达目标
      this.stopTrace();
      return;
    }
  },
  updatePos(percent) {
    if (this.parabolic) {
      this.parabolicInterpolate(percent);
    } else {
      this.lineInterpolate(percent);
      this.updateRotation();
    }
  },
  easeIn(t, b, c) {
    return (c * Math.pow(t, 3)) + b;
  },
  easeOut(t, b, c) {
    return (c * (Math.pow(t - 1, 3) + 1)) + b;
  },
  // 抛物线插值
  parabolicInterpolate(percent) {
    const tp = this.endPos;
    const p = this.startPos;
    const maxh = 250;
    const y = percent <= 0.5 ?
      this.easeOut(percent * 2, p.y, maxh) :
      this.easeIn((percent - 0.5) * 2, p.y + maxh, tp.y - p.y - maxh);
    // mbgGame.log("y", y, "percent", percent, p.y, tp.y);
    const oldPos = this.node.getPosition();
    const newPos = cc.v2(p.x + (tp.sub(p).x * percent), y);
    this.node.setPosition(newPos);
    // 计算角度;
    const atan = Math.atan2(newPos.y - oldPos.y, newPos.x - oldPos.x);
    const rotation = atan * 180 / Math.PI;
    this.node.angle = rotation;
  },
  // 直线插值
  lineInterpolate(percent) {
    const tp = this.endPos;
    const p = this.startPos;
    const sub = tp.sub(p);
    const mag = sub.mag();
    if (mag <= 0) {
      return;
    }
    const dir = sub.normalize();
    const dis = mag * percent;
    this.node.setPosition(p.add(dir.mul(dis)));
  },
  updateRotation() {
    if (!this.canRotate) {
      return;
    }
    const endPos = this.endPos;
    // 计算角度;
    const atan = Math.atan2(endPos.y - this.node.getPosition().y, endPos.x - this.node.getPosition().x);
    const rotation = atan * 180 / Math.PI;
    this.node.angle = rotation;
    // mbgGame.log("[rotate]", this.name, "myPos", this.node.getPosition(), "flyPos", fly.getPosition(), "tgtPos", tgtPos);
    //  mbgGame.log("x", tgtPos.x - fly.getPosition().x, "y", tgtPos.y - fly.getPosition().y, "atan", atan, "angle", fly.angle);
  },
  cleanVars() {
    this.traceTime = 0; // 多少秒内要到达目标位置
    this.endPos = null;
    this.startPos = null;
    this.enabled = false;
    this.tracing = false;
    this.traceOffset = null;
    this.canRotate = false;
    this.finish = true;
    this.t = 0;
  },
  startTrace(dOption) {
    this.cleanVars();
    if (dOption.target) {
      dOption.targetPos = dOption.target.node.getPosition();
    }
    if (!dOption.targetPos) {
      return;
    }
    let targetPos = dOption.targetPos;
    this.traceTime = dOption.duration;
    if (dOption.offset) {
      this.traceOffset = dOption.offset;
      targetPos = targetPos.add(dOption.offset);
    }
    this.canRotate = dOption.canRotate || false;
    this.parabolic = dOption.parabolic;
    this.finish = false;
    this.enabled = true;
    this.tracing = true;

    this.endPos = cc.v3(targetPos.x, targetPos.y, 0);
    this.startPos = this.node.getPosition();
  },
  stopTrace() {
    if (this.finish) {
      return;
    }
    this.cleanVars();
    emitter.emit("stopTrace", this);
  },
  pauseTrace() {
    this.tracing = false;
  },
  resumeTrace() {
    this.tracing = true;
  },
});