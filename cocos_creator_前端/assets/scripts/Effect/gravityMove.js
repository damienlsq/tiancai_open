cc.Class({
  extends: cc.Component,
  properties: {
  },
  onLoad() {
    this.enabled = false;
  },
  setTargetPos(pos, stopCb) {
    this.m_TargetPos = pos;
    this.m_stopCb = stopCb;
  },
  setVelocity(v) {
    this.m_velocity = v;
  },
  setGravity(g) {
    this.m_g = g;
  },
  startMove() {
    this.enabled = true;
  },
  stopMove() {
    this.enabled = false;
    delete this.m_TargetPos;
    delete this.m_velocit;
    if (this.m_stopCb) {
      this.m_stopCb();
    }
    delete this.m_stopCb;
  },
  update(dt) {
    if (!this.enabled) return;
    // 0.5 * g * t^2
    this.m_velocity += this.m_g * dt;
    this.node.y += this.m_velocity * dt;
    if (this.m_g < 0 && this.node.y <= this.m_TargetPos.y) {
      this.stopMove();
    }
    if (this.m_g > 0 && this.node.y >= this.m_TargetPos.y) {
      this.stopMove();
    }
  },
});
