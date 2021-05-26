module.exports = {
    Type: "主动",
    Range: "自己",
    Heartbeat: 1,
    Actions: {
        1: {
            行为: "设置技能时长",
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj);
            },
        },
        2: {
            行为: "选择目标",
            目标: "自己",
        },
        3: {
            行为: "加状态",
            编号: 999,
            时长: (who, tobj, skobj, dam) => {
                return who.getSkillParam("c", skobj);
            },
        },
        4: {
            行为: "设置技能目标",
            目标: "多个敌方",
            排序: "乱序",
            数量: 1,
        },
        5: {
            行为: "选择目标",
            目标: "已锁定目标",
        },
        6: {
            行为: "播放受击效果",
        },
        7: {
            行为: "攻击",
            值: (who, tobj, skobj, dam) => {
                return tobj.maxHp() * who.getSkillParam("a", skobj) * 0.01;
            },
        },
    },
    Events: {
        发动技能: [{
            行为: [1, 2, 3, 4],
        }],
        心跳: [{
            行为: [5, 6, 7],
        }],
    },
    Conds: {},
};