
module.exports = { // 使用技能时有%{b}%几率不消耗能量。
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "不扣能量",
        },
    },
    Attr: {},
    Events: {
        扣能量前: [{
            行为: [1, 2],
            概率(who, tobj, skobj, dam) {
                const p = 0.01 * who.getSkillParam("b", skobj);
                // who.wlog("2005.p", p);
                return p;
            },
        }],
    },
    Conds: {},
};