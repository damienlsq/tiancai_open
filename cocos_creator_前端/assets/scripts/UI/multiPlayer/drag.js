const STATUS_BEGIN = 1;
const STATUS_DRAG = 2;

cc.Class({
  extends: cc.Component,

  properties: {
  },
  onLoad() {
    // 先移除原来登记的button，不要混着用，太混乱
    this.node.removeComponent(cc.Button);
    this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchBegin, this);
    this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  },

  initMe({
    fn_getTargetPos = null,
    fn_createDragNode = null,
    fn_matchRange = null,
    fn_dragEnd = null,
    fn_onClick = null,
    fn_checkCanTouch = null,
    fn_onSpecialClick = null,
  }) {
    this.fn_getTargetPos = fn_getTargetPos;
    this.fn_createDragNode = fn_createDragNode;
    this.fn_matchRange = fn_matchRange;
    this.fn_dragEnd = fn_dragEnd;
    this.fn_onClick = fn_onClick;
    this.fn_checkCanTouch = fn_checkCanTouch;
    this.fn_onSpecialClick = fn_onSpecialClick;
  },

  onTouchBegin(event) {
    // mbgGame.log('onTouchBegin', event.getEventCode());
    if (this.fn_checkCanTouch) {
      if (!this.fn_checkCanTouch()) {
        return;
      }
    }
    if (this._touchStatus === STATUS_DRAG) {
      // 还未开始就结束了
      this.dragEnd();
    }
    delete this._dragNode;
    this._touchBeginTime = moment().unix();
    this._touchStatus = STATUS_BEGIN;
    this._beginEvent = event;
    // 如果3秒内保持不动，就进入拖动模式
    this.scheduleOnce(this.onDrag, 0.5);

    this.node.runAction(cc.sequence(
      // cc.moveTo(0.2, new cc.Vec2(0, 0)).easing(cc.easeExponentialInOut())
      cc.scaleTo(0.1, 0.9, 0.9).easing(cc.easeExponentialInOut()),
      cc.scaleTo(0.1, 1, 1).easing(cc.easeExponentialInOut())));
  },

  onDrag() {
    // mbgGame.log('onDrag');
    // 进入drag 模式
    this.node.opacity = 50;
    this._touchStatus = STATUS_DRAG;

    // 复制一个对象出来用于拖动
    if (this.fn_createDragNode) {
      this._dragNode = this.fn_createDragNode();
      this._dragNode.setPosition(-800, -800);
      let pos;
      if (this._beginEvent) {
        pos = this._dragNode.parent.convertToNodeSpaceAR(this._beginEvent.getLocation());
      }
      if (pos && pos.x && pos.y) {
        this._dragNode.setPosition(pos);
      }
    }
  },

  dragEnd() {
    this.node.opacity = 255;
    if (this._dragNode) {
      this._dragNode.destroy();
    }
    delete this._dragNode;
    if (this.fn_dragEnd) {
      this.fn_dragEnd();
    }
  },

  onTouchMove(event) {
    // mbgGame.log('onTouchMove');
    if (this.fn_checkCanTouch) {
      if (!this.fn_checkCanTouch()) {
        return;
      }
    }
    if (this._touchStatus !== STATUS_DRAG) {
      // 如果没有进入drag模式，就不能move，然后又有移动
      if (event.getDeltaX() > 5 || event.getDeltaY() > 5) {
        // 取消dragNode判定
        this.unschedule(this.onDrag);
        delete this._touchStatus;
        return;
      }
      return;
    }
    if (!this._dragNode) return;
    const pos = this._dragNode.parent.convertToNodeSpaceAR(event.getLocation());
    let x = this._dragNode.x;
    let y = this._dragNode.y;
    if (pos.y > -400 && pos.y < 350) y = pos.y;
    if (pos.x > -280 && pos.x < 280) x = pos.x;
    this._dragNode.setPosition(x, y);
  },

  // 当手指在目标节点区域内离开屏幕时
  onTouchEnd() {
    // mbgGame.log('onTouchEnd', this._touchStatus);
    if (!this._touchStatus) {
      // 这里没有封装好的，特殊使用，只使用预上阵，装备
      if (this.fn_onSpecialClick) {
        this.fn_onSpecialClick();
      }
    }
    if (this._touchStatus === STATUS_BEGIN) {
      // 还未开始就结束了
      this.unschedule(this.onDrag);
      // 执行点击模式
      if (this.fn_onClick) {
        this.fn_onClick();
      }
    }
    if (this._touchStatus === STATUS_DRAG) {
      // 还未开始就结束了
      this.dragEnd();
    }
    delete this._touchStatus;
  },

  // 当手指在目标节点区域内离开屏幕时
  onTouchCancel(event) {
    // mbgGame.log('onTouchCancel', this._touchStatus);
    if (this.fn_checkCanTouch) {
      if (!this.fn_checkCanTouch()) {
        return;
      }
    }
    const code = event.getEventCode();
    if (code === 0) return; // 一点下去
    if (this._touchStatus === STATUS_BEGIN) {
      // 还未开始就结束了
      this.unschedule(this.onDrag);
    }
    if (this._touchStatus === STATUS_DRAG) {
      this.checkEndPos(event.getLocation());
      this.dragEnd();
    }
    delete this._touchStatus;
  },

  checkEndPos(eventPos) {
    if (!this.fn_getTargetPos) {
      return;
    }
    const targetPos = this.fn_getTargetPos();
    let inRange = false;
    let inRangeI = -1;
    const eventRect = new cc.Rect(eventPos.x - 25, eventPos.y - 25, 50, 50);
    for (let i = 0; i < targetPos.length; i++) {
      // inRange = cc.rectContainsRect(targetPos[i], eventRect);
      inRange = targetPos[i].containsRect(eventRect);
      if (inRange) {
        inRangeI = i;
        break;
      }
    }
    // mbgGame.log('checkEndPos', eventRect, inRangeI, targetPos);
    if (inRangeI !== -1) {
      if (this.fn_matchRange) {
        this.fn_matchRange(inRangeI);
      }
    }
  },
});