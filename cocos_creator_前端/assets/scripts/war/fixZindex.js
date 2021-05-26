cc.Class({
    extends: cc.Component,

    properties: {},

    // use this for initialization
    onLoad() { },
    fix() {
        this.node.zIndex = mbgGame.designHeight - this.node.getPosition().y;
    },
    setFix(set) {
        this.node.off('position-changed', this.fix, this);
        if (set) {
            this.node.on('position-changed', this.fix, this);
        }
        this.fix();
    },
});