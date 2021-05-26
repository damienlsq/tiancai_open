module.exports = {
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "刷新属性",
            属性: "DR",
        },
    },
    Attr: {
        DA: [
            (who, tobj, skobj, dam) => {
                const b = who.getSkillParam("b", skobj);
                const a = who.getSkillParam("a", skobj);
                const hpPercent = who.hp() / who.maxHp();
                const lostPercent = (1 - hpPercent) * 100;
                const tier = Math.floor(lostPercent / b);
                const DRAdd = Math.round(a * tier);
                // who.wlog("state.2012, b", b, "a", a, "hpPercent", hpPercent, "DRAdd", DRAdd);
                return DRAdd;
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