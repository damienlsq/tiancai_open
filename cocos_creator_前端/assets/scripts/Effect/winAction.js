cc.Class({
    extends: cc.Component,

    properties: {},

    // use this for initialization
    onLoad() {
        this.openType = 'popup';
        this.opened = false;
        // this.open();
    },
    setOpenType(type) {
        // popup, up, down, left, right
        this.openType = type;
    },

    open(cb) {
        if (this.opened) return;
        this.cbOpen = cb;
        this.node.stopAllActions();

        this.node.opacity = 0;
        this.scheduleOnce(function () {
            switch (this.openType) {
                case 'popup':
                    {
                        const scale = (this.node.width - 16) / this.node.width;
                        this.node.setScale(scale, scale);
                        this.node.runAction(
                            cc.sequence(cc.scaleTo(0.2, 1, 1).easing(cc.easeBackOut()),
                                cc.callFunc(() => {
                                    if (cb) cb();
                                    this.opened = true;
                                })));
                    } break;
                case 'up':
                    {
                        this.node.setPosition(0, mbgGame.designHeight);
                        this.move(0, 0, cb);
                    } break;
                case 'down':
                    {
                        this.node.setPosition(0, -mbgGame.designHeight);
                        this.move(0, 0, cb);
                    } break;
                case 'left':
                    {
                        this.node.setPosition(-mbgGame.designWidth, 0);
                        this.move(0, 0, cb);
                    } break;
                case 'right':
                    {
                        this.node.setPosition(mbgGame.designWidth, 0);
                        this.move(0, 0, cb);
                    } break;

                default:
                    break;
            }
            this.node.opacity = 255;
        }.bind(this), 0);
    },

    close(cb) {
        if (!this.opened) return;
        this.cbClose = cb;
        this.node.stopAllActions();
        switch (this.openType) {
            case 'popup':
                this.node.runAction(cc.callFunc(() => {
                    if (cb) cb();
                    this.opened = false;
                }));
                break;
            case 'up': {
                this.move(0, mbgGame.designHeight, cb);
            } break;
            case 'down': {
                this.move(0, -mbgGame.designHeight, cb);
            } break;
            case 'left':
                {
                    this.move(-mbgGame.designWidth, 0, cb);
                } break;
            case 'right':
                {
                    this.move(mbgGame.designWidth, 0, cb);
                } break;
            default:
                break;
        }
    },

    move(x, y, cb) {
        this.node.runAction(
            cc.sequence(cc.moveTo(0.2, x, y).easing(cc.easeBackOut()),
                cc.callFunc(() => {
                    this.opened = !this.opened;
                    if (cb) cb();
                })));
    },
});