cc.Class({
    extends: cc.Component,

    properties: {
        object: cc.Node,
        intervalWidth: 0,
        intervalHeight: 0,
        fixWidth: false,
        fixHeight: false,
        fixOnload: false,
        fixOnsizechanged: false,
    },

    // use this for initialization
    onLoad() {
        const self = this;
        this.originalWidth = this.object.width;
        this.originalHeight = this.object.height;
        if (this.fixOnsizechanged) {
            if (this.object) {
                this.object.on('size-changed', () => {
                    self.fixSize();
                });
            }
        }
        if (this.fixOnLoad) {
            self.fixSize();
        }
    },
    calSize() {
        const width = this.object.width + this.intervalWidth;
        const height = this.object.height + this.intervalHeight;
        return cc.size(width, height);
    },
    fixSize(time) {
        // mbgGame.log('fixSize    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        const size = this.calSize();
        if (time) {
            this.node.runAction(cc.scaleTo(time, size.width / this.node.width, size.height / this.node.height));
        } else {
            if (this.fixWidth) {
                this.node.width = size.width;
            }
            if (this.fixHeight) {
                this.node.height = size.height;
            }
        }
    },
});