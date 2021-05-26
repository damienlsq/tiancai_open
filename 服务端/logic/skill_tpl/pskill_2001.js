// 2000开头都是道具的技能
module.exports = { // 攻击有%{b}%几率降低对方%{a}%防御，持续%{c}秒。
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "加状态",
            编号: 2001,
            时长(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};