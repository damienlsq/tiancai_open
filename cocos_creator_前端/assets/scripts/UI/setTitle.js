cc.Class({
    extends: cc.Component,

    properties: {
        anchorNode: {
            default: null,
            type: cc.Node,
            displayName: "依靠Node",
            tooltip: "拉入对应的node,就能放title到该node的最顶",
        },
        titleKey: {
            default: "",
            displayName: "i18nKey",
            tooltip: "对应后台的i18nKey",
        },
        needClose: {
            default: true,
            displayName: "关闭按钮",
            tooltip: "是否需要关闭按钮",
        },
        channel: {
            default: "",
            displayName: "信息墙频道",
        },
    },

    // use this for initialization
    onLoad() {
        if (mbgGame.loading) {
            this.uiTitle = cc.instantiate(mbgGame.loading.uiTitle);
        } else {
            this.uiTitle = cc.instantiate(mbgGame.managerUi.uiTitle);
        }
        this.node.name = "uiTitle";
        this.anchorNode.addChild(this.uiTitle);
        this.uiTitle.opacity = 255;

        this.initMe({
            hostNode: this.node,
            titleKey: this.titleKey,
            needClose: this.needClose,
            channel: this.channel,
        });
        // 这两个东西程序要调用  不要删
        this.titleLabel = this.uiTitle.getComponent("uiTitle").titleStr;
        this.nodeClose = this.uiTitle.getComponent("uiTitle").closeBtn;

        // 因为有一些界面是alignOnce的自适应界面，所以需要延时一点才能正常计算位置
        this.scheduleOnce(this.resizeMe.bind(this), 0);
    },

    resizeMe() {
        if (!this.uiTitle || !this.anchorNode) return;
        let x = 0;
        const y = ((1 - this.anchorNode.anchorY) * this.anchorNode.height);
        mbgGame.log('resizeMe', this.anchorNode.anchorY, this.anchorNode.height, y);
        if (this.node.anchorX === 0) {
            x = this.node.width / 2;
        }
        this.uiTitle.setPosition(x, y);
        this.uiTitle.width = this.anchorNode.width;
        const node = this.uiTitle.getChildByName('icons');
        node.x = (this.uiTitle.width / 2) - (node.width / 2) + ((this.uiTitle.height - node.height) / 2);
        this.uiTitle.opacity = 255;
    },

    initMe(data) {
        const setData = {};
        // mbgGame.log("setTitle initMe", data);
        if (data.hostNode) {
            setData.hostNode = data.hostNode;
        }

        if (data.titleKey) {
            setData.titleStr = mbgGame.getString(data.titleKey);
        }
        if (data.titleStr) {
            setData.titleStr = data.titleStr;
        }
        setData.needClose = this.needClose;
        if (data.needClose) {
            setData.needClose = data.needClose;
        }
        if (data.channel) {
            setData.channel = data.channel;
        }
        if (data.closeMe) {
            setData.closeMe = data.closeMe;
        }
        if (!this.uiTitle) {
            mbgGame.error("需要在addChild后面执行setTitle的initMe");
        }
        this.uiTitle.getComponent("uiTitle").initMe(setData);
    },
});