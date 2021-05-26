const defines = require('warDefines');

cc.Class({
    extends: cc.Component,
    properties: {
        bg: cc.Sprite,
        chara: cc.Sprite,
        skillName: cc.Sprite,
    },
    onLoad() {

    },
    // 记住初始位置
    saveInitState() {
        if (this.m_Saved) {
            return;
        }
        this.m_SavedData = {};
        this.m_SavedData.node = {
            pos: this.node.getPosition(),
        };
        this.m_SavedData.bg = {
            pos: this.bg.node.getPosition(),
            opacity: this.bg.node.opacity,
            scale: this.bg.node.scale,
        };
        this.m_SavedData.chara = {
            pos: this.chara.node.getPosition(),
            opacity: this.chara.node.opacity,
            scale: this.chara.node.scale,
        };
        this.m_SavedData.skillName = {
            pos: this.skillName.node.getPosition(),
            opacity: this.skillName.node.opacity,
            scale: this.skillName.node.scale,
        };
        this.m_Saved = true;
    },
    resetInitState() {
        this.node.stopAllActions();
        this.bg.node.stopAllActions();
        this.chara.node.stopAllActions();
        this.skillName.node.stopAllActions();
        this.node.setPosition(this.m_SavedData.node.pos);
        let dData = this.m_SavedData.bg;
        this.bg.node.setPosition(dData.pos);
        this.bg.node.opacity = dData.opacity;
        this.bg.node.setScale(dData.scale);
        dData = this.m_SavedData.chara;
        this.chara.node.setPosition(dData.pos);
        this.chara.node.opacity = dData.opacity;
        this.chara.node.setScale(dData.scale);
        dData = this.m_SavedData.skillName;
        this.skillName.node.setPosition(dData.pos);
        this.skillName.node.opacity = dData.opacity;
        this.skillName.node.setScale(dData.scale);
    },
    /*
    data = {
        charaID:
        skillID:
        team : left: 1 / right: 2
    */
    playAnim(data, cb) {
        this.saveInitState();
        this.resetInitState();
        const spd = mbgGame.replaySpeed;
        const idx = data.team === defines.TEAM_LEFT ? 0 : 1;
        mbgGame.resManager.setImageFrame(this.chara, 'images', `skillchara_${data.charaID}_${idx}`);
        mbgGame.resManager.setImageFrame(this.skillName, 'images', `skillname${data.skillID}_${idx}`);
        // 按右边的算
        const offsets = {
            bg: cc.v2(500, 0), // 右边
            chara: cc.v2(100, 0), // 右边
            skillName: cc.v2(-75, -75), // 左上角
        }
        if (data.team === defines.TEAM_RIGHT) {
            for (const k in offsets) {
                offsets[k].x *= -1;
            }
        }
        this.bg.node.opacity = 30;
        this.bg.node.x += -offsets.bg.x;
        this.bg.node.y += -offsets.bg.y;
        this.bg.node.runAction(cc.moveBy(0.4 / spd, offsets.bg).easing(cc.easeExponentialOut()));
        this.bg.node.runAction(cc.scaleTo(0.2 / spd, 1.5, 1.0));
        this.bg.node.runAction(cc.fadeIn(0.2 / spd));

        this.chara.node.opacity = 30;
        this.chara.node.x += -offsets.chara.x;
        this.chara.node.y += -offsets.chara.y;
        this.chara.node.runAction(cc.sequence(
            cc.delayTime(0.15 / spd),
            cc.moveBy(0.2 / spd, offsets.chara).easing(cc.easeExponentialOut())));
        this.chara.node.runAction(cc.fadeIn(0.2 / spd));

        this.skillName.node.opacity = 30;
        this.skillName.node.x += -offsets.skillName.x;
        this.skillName.node.y += -offsets.skillName.y;
        this.skillName.node.runAction(cc.sequence(
            cc.delayTime(0.1 / spd),
            cc.moveBy(0.2 / spd, offsets.skillName).easing(cc.easeExponentialOut())));
        this.skillName.node.runAction(cc.fadeIn(0.2 / spd));

        this.node.runAction(cc.sequence(
            cc.delayTime(0.4 / spd),
            cc.moveBy(1.2 / spd, cc.v2(data.team === defines.TEAM_RIGHT ? -15 : 15, 0)),
            cc.moveBy(0.3 / spd, cc.v2(data.team === defines.TEAM_RIGHT ? 500 : -500, 0)),
            cc.callFunc(cb)));
    },
});