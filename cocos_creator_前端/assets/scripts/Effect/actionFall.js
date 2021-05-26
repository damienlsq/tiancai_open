// 引力模拟

cc.Class({
    extends: cc.Component,

    properties: {
        horizontalLine: 0,
        // 引力模拟参数

        gravity: cc.Vec2,
        velocity: cc.Vec2,
        bounce: cc.Vec2,
        stopThreshold: 0, // 停止阀值
    },

    // use this for initialization
    onLoad() {

    },
    init() {
        this.stoped = false;
    },
    // called every frame, uncomment this function to activate update callback
    update(dt) {
        // 引力模拟
        if (this.stoped === false) {
            this.velocity.addSelf(this.gravity.mul(dt)); // 加速
            this.node.x = this.node.x + this.velocity.x;
            this.node.y = this.node.y + this.velocity.y;
            // 到达反弹地面
            if (this.node.y < this.horizontalLine) {
                this.node.y = this.horizontalLine;
                // 反弹
                this.velocity.y *= this.bounce.y;
                this.velocity.x *= this.bounce.x;
                this.velocity.y = Math.abs(this.velocity.y);
                // 判断停止阀值
                if (Math.abs(this.velocity.y) < this.stopThreshold) {
                    this.velocity.y = 0;
                    this.stoped = true;
                }
            }

            // 两边边缘反弹
            if (this.node.x - (this.node.width / 2) < -mbgGame.designWidth / 2) { // 左边
                this.velocity.x = Math.abs(this.velocity.x);
                this.velocity.x *= this.bounce.x;
                this.node.x = (-mbgGame.designWidth / 2) + (this.node.width / 2);
            }

            if (this.node.x + (this.node.width / 2) > mbgGame.designWidth / 2) { // 右边
                this.velocity.x = -Math.abs(this.velocity.x);
                this.velocity.x *= this.bounce.x;
                this.node.x = (mbgGame.designWidth / 2) - (this.node.width / 2);
            }
        }

        // 掉落停止才修正zIndex，避免不断重复修正
        // this.node.zIndex = mbgGame.designHeight - this.node.getPosition().y;
    },
});