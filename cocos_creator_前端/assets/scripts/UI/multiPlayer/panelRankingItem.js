cc.Class({
    extends: cc.Component,

    properties: {
        bg: cc.Sprite,
        ranking: cc.Label,
        flag: cc.Node,
        playerName: cc.Label,
        integral: cc.Label,
        spriteCircle: cc.Sprite,
    },

    initMe(dData) {
        this.ranking.string = dData.rank <= 3 ? '' : dData.rank;
        this.playerName.string = dData.name;
        this.integral.string = dData.score;
        mbgGame.managerUi.addIconFlag(this.flag, dData.totem);

        this.playerName.node.color = cc.Color.WHITE;
        this.integral.node.color = cc.Color.WHITE;
        this.bg.node.opacity = 255;
        mbgGame.resManager.setImageFrame(this.bg, 'images', `rankingFrame${dData.rank > 3 ? 4 : dData.rank}`);
        if (dData.rank <= 3) {
            mbgGame.resManager.setImageFrame(this.spriteCircle, 'images', `rankingIconNumber${dData.rank}`);
        } else {
            this.spriteCircle.node.active = false;
        }
    },
});