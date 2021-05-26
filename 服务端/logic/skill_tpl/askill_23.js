module.exports = {
    Type: "主动",
    Actions: {
        1: {
            行为: "设置技能目标",
            目标: "多个敌方",
            排序: "HP百分比降序",
            数量: 1,
        },
        10: {
            行为: "播放受击效果",
        },
        2: {
            行为: "选择目标",
            目标: "已锁定目标",
        },
        3: {
            行为: "攻击",
            noEffect: true,
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        4: {
            行为: "加能量",
            值(who, tobj, skobj, dam) {
                return Math.ceil(skobj.getItemEffectVal());
            },
        },
        5: {
            行为: "跳字",
            msg: (who, tobj, skobj, dam, dOption) => {
                return `+${dOption.energyAdd}`;
            },
            n: 'energy',
        },
    },
    Events: {
        发动技能: [{
            行为: [1, 10],
        }],
        执行技能效果: [{
            行为: [2, 3],
        }],
        技能命中: [{
            行为: [4, 5],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断: ["目标已死", "==", true],
        },
    },
};