module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "增加临时值",
            变量: "luck",
            值: 1,
            状态: 1010,
        },
        3: {
            行为: "选择目标",
            目标: "自己",
        },
        4: {
            行为: "删状态",
            编号: 1010,
            reason: "normal",
        },
        5: {
            行为: "加状态",
            编号: 1010,
            时长: 0,
            图标: (who, tobj, skobj, dam) => {
                const luck = skobj.getTempByState(1010, "luck") || 0;
                return `buff_lucky${luck}`;
            },
        },
        101: {
            行为: "删除临时值",
            变量: "luck",
            状态: 1010,
        },
        102: {
            行为: "选择目标",
            目标: "自己",
        },
        103: {
            行为: "复活",
            延迟: 1,
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        105: {
            行为: "触发被动",
        },
        106: {
            行为: "设置临时值",
            变量: "luck",
            值: 0,
            状态: 1010,
        },
    },
    Events: {
        被攻击后: [{
            行为: [106],
            条件: 3,
        }, {
            行为: [1, 2, 3, 4, 5],
            条件: 1,
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
        自己死亡后: [{
            行为: [101, 102, 103, 105, 106],
            条件: 2,
        }],
    },
    Conds: {
        1: {
            判断() {
                return (this.getTempByState(1010, "luck") || 0) < 3;
            },
        },
        2: {
            判断() {
                return (this.getTempByState(1010, "luck") || 0) >= 3;
            },
        },
        3: {
            判断() {
                return (this.getTempByState(1010, "luck") || 0) === 0;
            },
        },
    },
};