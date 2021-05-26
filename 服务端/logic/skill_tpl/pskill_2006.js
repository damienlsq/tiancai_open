
module.exports = { // 攻击有%{b}%几率降低目标%{a}%暴击，持续%{c}秒。
    Type: "被动",
    Actions: {
        1: {
            行为: "加状态",
            编号: 2006,
            回合(who, tobj, skobj, dam) {
                return who.getSkillParam("c", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1],
            概率(who, tobj, skobj, dam) {
                return 0.01 * who.getSkillParam("b", skobj);
            },
        }],
    },
    Conds: {},
};