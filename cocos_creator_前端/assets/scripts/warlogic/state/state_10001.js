module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "设置临时值",
            变量: "flag10001",
            值: 1,
        },
        2: {
            行为: "设置临时值",
            变量: "flag10001",
            值: 0,
        },
        3: {
            行为: "结束状态",
        },
        4: {
            行为: "选择目标",
            目标: "我方全体",
        },
        5: {
            行为: "攻击",
            值(who, tobj, skobj, dam) {
                const causer = skobj.causer();
                const maxHp = causer.getAttr("MaxHp");
                const a = causer.getItemEffectVal();
                const hp = Math.round(maxHp * a * 0.01);
                // who.wlog("state 10001", causer.name(), maxHp, a);
                return hp;
            },
        },
    },
    Attr: {},
    Events: {
        激活状态: [{
            行为: 1,
        }],
        用主技后: [{
            行为: [2, 3],
        }],
        状态结束: [{
            行为: [4, 5],
            条件: [1, 2],
        }],
    },
    Conds: {
        1: {
            判断: ["flag10001", ">", 0],
        },
        2: {
            判断(dOption) {
                return !dOption.force; // 直接删除的话不触发效果
            },
        },
    },
};