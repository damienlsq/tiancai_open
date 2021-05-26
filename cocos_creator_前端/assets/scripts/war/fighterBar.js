const fighterBase = require('fighterBase');

/*
    各种ProgressBar放这里
    目前有：
    vip图标(因为需要和血条同时出现同时消失，先放这里)
    HpBar：血条的bar

*/

cc.Class({
    extends: fighterBase,
    properties: {
        layoutNode: cc.Node,
        vipIcon: cc.Node,
        bloodBarPanel: cc.Node,
    },
    onLoad() {
        this.setShow(false);
    },
    setShow(b) {
        this.layoutNode.opacity = b ? 255 : 0;
    },
    setShowVIPIcon(b) {
        this.vipIcon.active = b;
    },
    hideBloodBar(fade) {
        if (!this.bloodBarPanel) {
            return;
        }
        if (!this.bloodBarPanel.opacity) {
            return;
        }
        if (fade) {
            if (!this.m_BloodBarFading) {
                this.bloodBarPanel.stopAllActions();
                this.m_BloodBarFading = true;
                this.bloodBarPanel.runAction(cc.sequence(cc.delayTime(0.5), cc.fadeOut(1)));
            }
        } else {
            this.bloodBarPanel.stopAllActions();
            this.bloodBarPanel.opacity = 0;
        }
    },
    setHpPercent(percent) {
        this.bloodBarPanel.getComponent(cc.ProgressBar).progress = percent;
        if (percent <= 0) {
            this.hideBloodBar(true);
        } else {
            this.showBloodBar();
        }
    },
    showBloodBar() {
        this.bloodBarPanel.stopAllActions();
        if (this.m_BloodBarFading) {
            delete this.m_BloodBarFading;
        }
        this.bloodBarPanel.opacity = 255;
    },
});