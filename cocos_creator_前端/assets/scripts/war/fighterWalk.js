const defines = require('warDefines');
const fighterBase = require('fighterBase');

/*
    剧情或战斗的进场、离场逻辑代码

    和fighterRush的区别：rush是战斗过程中的移动逻辑

*/

const disOutOfWin = 350;

cc.Class({
    extends: fighterBase,
    properties: {
    },
    onLoad() {
    },
    stopMove() {
        this.node.stopAllActions();
    },
    moveToStandPos(usingtime) {
        this.node.stopAllActions();
        this.FSM().setState('walk');
        this.node.stopAllActions();
        this.node.runAction(cc.sequence(cc.moveTo(usingtime != null ? usingtime : 1, this.fighter().getPos()),
            cc.callFunc(() => {
                this.FSM().setState('stand');
            })));
    },
    enterScene(dir, walkTime, flashIn) {
        if (!flashIn && walkTime > 0) {
            if ( this.node.getPosition().sub(this.fighter().getPos()).mag() < 1) {
                this.FSM().setState('stand');
                return 0;
            }
            if (dir == null) {
                dir = this.fighter().getStandTeam() === defines.TEAM_RIGHT ? '左' : '右';
            }
            // 进场动画
            this.node.stopAllActions();
            const pos = this.fighter().getPos();
            this.node.setPosition(
                dir === "右" ? pos.x - disOutOfWin : pos.x + disOutOfWin,
                pos.y);
            if (dir === "左") {
                this.fighter().turnLeft();
            } else {
                this.fighter().turnRight();
            }
            this.moveToStandPos(walkTime);
            this.FSM().setState('walk');
            return walkTime;
        }
        if (flashIn && this.node.getPosition().sub(this.fighter().getPos()).mag() > 5) {
            this.fighter().spineCtrl().node.active = false;
            this.playFlashAni();
            this.node.runAction(cc.sequence(cc.delayTime(1.0), cc.callFunc(() => {
                this.fighter().spineCtrl().node.active = true;
            })));
        }
        this.FSM().setState('stand');
        this.node.setPosition(this.fighter().getPos());
        return 0;
    },
    playFlashAni() {
        const obj = new cc.Node();
        obj.addComponent("sp.Skeleton");
        const com = obj.addComponent("spineObject");
        this.node.addChild(obj);
        obj.setScale(this.fighter().getScale());
        obj.y = -30;
        com.onSpineLoad = function () {
            com.playAnimationAndDestroy('animation');
        };
        com.loadSpine("flashchara");
    },
    leaveScene(dir, walkTime, flashOut) {
        if (flashOut) {
            this.playFlashAni();
            this.node.runAction(cc.sequence(cc.delayTime(1.0), cc.callFunc(() => {
                this.node.setPosition(cc.v2(2000, 0));
            })));
            return;
        }
        this.FSM().setState('walk');
        if (walkTime == null) {
            walkTime = 2;
        }
        if (dir == null) {
            dir = this.dir === 0 ? '左' : '右';
        }
        const cx = this.node.x;
        let tx = 0;
        if (dir === '左') {
            this.fighter().turnLeft();
            tx = this.fighter().getPos().x - disOutOfWin;
        } else { // 右
            this.fighter().turnRight();
            tx = this.fighter().getPos().x + disOutOfWin;
        }
        const dis = Math.abs(tx - cx);
        const t = walkTime * dis / 600;
        this.node.runAction(cc.moveTo(t,
            new cc.Vec2(tx, this.fighter().getPos().y)));
    },
});