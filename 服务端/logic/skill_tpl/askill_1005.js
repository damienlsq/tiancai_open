
module.exports = {
    Type: "主动",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "加状态",
            编号: 1005,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        执行技能效果: [{
            行为: [1, 2],
        }],
    },
};