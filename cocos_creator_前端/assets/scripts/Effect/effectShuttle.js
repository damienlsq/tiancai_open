// 往返效果
let ActionType = cc.Enum({
    easeBackInOut: 0,
    easeBackIn: 1,
    easeBackOut: 2,
    easeSineInOut: 3,
    easeSineIn: 4,
    easeSineOut: 5,
});

cc.Class({
    extends: cc.Component,

    properties: {
        endPosition: cc.Vec2,
        usingTime: 1, // 动画使用时间
        actionExtend: { default: 0, type: ActionType },
        actionBack: { default: 0, type: ActionType },
    },

    // use this for initialization
    onLoad() {
        // 初始位置
        this.extend = true;
        this.actionFinish = true;
    },

    start() {
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
    runEffect() {
        if (this.actionFinish) {
            this.actionFinish = false;
            let setFinish = cc.callFunc(() => { this.setActionFinish(true) });
            let action;
            if (this.extend) {
                this.starPosition = this.node.getPosition();
                const go = cc.moveTo(this.usingTime, this.endPosition);
                go.easing(this.getActionType(this.actionExtend));
                const setZ = cc.callFunc(() => { this.setZIndex(1) });
                action = cc.sequence(setZ, go, setFinish);
            }
            else {
                const go = cc.moveTo(this.usingTime, this.starPosition);
                go.easing(this.getActionType(this.actionBack));
                const setZ = cc.callFunc(() => { this.setZIndex(0) });
                action = cc.sequence(go, setZ, setFinish);
            }
            this.node.runAction(action);
            this.extend = !this.extend;
        }
    },

    runEffectOption(extend) {
        if (this.actionFinish) {
            this.actionFinish = false;
            let setFinish = cc.callFunc(() => { this.setActionFinish(true) });
            let action;
            if (extend) {
                this.starPosition = this.node.getPosition();
                const go = cc.moveTo(this.usingTime, this.endPosition);
                go.easing(this.getActionType(this.actionExtend));
                const setZ = cc.callFunc(() => { this.setZIndex(1) });
                action = cc.sequence(setZ, go, setFinish);
            }
            else {
                const go = cc.moveTo(this.usingTime, this.starPosition);
                go.easing(this.getActionType(this.actionBack));
                const setZ = cc.callFunc(() => { this.setZIndex(0) });
                action = cc.sequence(go, setZ, setFinish);
            }
            this.node.runAction(action);
        }
    },

    setZIndex(z) {
        this.node.zIndex = z;
    },

    setActionFinish(val) {
        this.actionFinish = val;
    },

    getActionType(actionType) {
        switch (actionType) {
            case ActionType.easeBackInOut: {
                return cc.easeBackInOut();
            }
            case ActionType.easeBackIn: {
                return cc.easeBackIn();
            }
            case ActionType.easeBackOut: {
                return cc.easeBackOut();
            }
            case ActionType.easeSineInOut: {
                return cc.easeSineInOut();
            }
            case ActionType.easeSineIn: {
                return cc.easeSineIn();
            }
            case ActionType.easeSineOut: {
                return cc.easeSineOut();
            }
        }
    },
});
