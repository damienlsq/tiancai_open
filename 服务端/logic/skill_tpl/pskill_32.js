module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "选择目标",
            目标: "多个我方",
            排序: "HP百分比降序",
            数量: 1,
        },
        3: {
            行为: "治疗",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        暴击: [{
            行为: [1, 2, 3],
        }],
    },
};