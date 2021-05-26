module.exports = {
    Type: "主动",
    Range: "自己",
    Actions: {
        1: {
            行为: "设置技能目标",
            目标: "多个敌方",
            排序: "乱序",
            数量: 1,
        },
        2: {
            行为: "选择目标",
            目标: "已锁定目标",
        },
        3: {
            行为: "打断主动技能",
        },
        4: {
            行为: "攻击",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        5: {
            行为: "加状态",
            编号: 2,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Events: {
        发动技能: [{
            行为: [1],
        }],
        执行技能效果: [{
            行为: [2, 3, 4, 5],
        }],
    },
    Conds: {},
};