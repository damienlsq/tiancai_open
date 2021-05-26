cc.Class({
    extends: cc.Component,

    properties: {
        spine: sp.Skeleton,
        skipButton: cc.Node,
    },

    // use this for initialization
    onLoad() {
        this.spine.setCompleteListener(this.startGame.bind(this));
        this.scheduleOnce(function () {
            this.skipButton.active = true;
        }, 16);
    },

    startGame() {
        mbgGame.log("startGame");
        // this.spine.setCompleteListener(null);
        cc.director.loadScene('game', () => {
            // mbgGame.log("game loaded callback");
            mbgGame.gameScene.enterGame();
        });
    },

});