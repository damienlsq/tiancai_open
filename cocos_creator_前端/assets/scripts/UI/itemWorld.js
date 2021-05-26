const mbgGame = require('mbgGame');
const defines = require('warDefines');

cc.Class({
    extends: cc.Component,

    properties: {
        title: cc.Label,
        numLabel: cc.Label,
        bg: cc.Sprite,
    },
    onClick() {
        mbgGame.panelStory.onShowWorld(this.m_worldIdx);
    },
});