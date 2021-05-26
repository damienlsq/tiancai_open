const w_defines = require('../w_defines');

module.exports = { // 攻击有%{a}%几率驱散目标身上的所有增益效果。
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "删状态",
            类型: w_defines.StateType.Buff,
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("a", skobj);
            },
        }],
    },
    Conds: {},
};