module.exports = {
    AddType: "叠加",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        心跳: [{
            行为: [1, 2],
        }],
    },
    Conds: [],
};