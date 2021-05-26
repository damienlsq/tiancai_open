module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "刷新属性",
            属性: "Def",
        },
    },
    Attr: {
        Def: [
            (who, tobj, skobj, dam) => {
                // 每损失%{b}%生命，防御增加%{a}%。
                // 类似逻辑的技能模板：2012
                const b = who.getSkillParam("b", skobj);
                const a = who.getSkillParam("a", skobj);
                const hpPercent = who.hp() / who.maxHp();
                const lostPercent = (1 - hpPercent) * 100;
                const tier = Math.floor(lostPercent / b);
                const defAdd = Math.round(a * tier);
                // who.wlog("state.1008, b", b, "a", a, "hpPercent", hpPercent, "defAdd", defAdd);
                return defAdd;
            },
            0,
        ],
    },
    Events: {
        受伤: [{
            行为: [1],
        }],
    },
    Conds: {},
};