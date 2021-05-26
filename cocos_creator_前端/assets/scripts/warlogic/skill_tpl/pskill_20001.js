module.exports = {
    // 捣乱
    Type: "被动",
    Range: "自己",
    Actions: {
        1: {
            行为: "二连击",
            值(who, tobj, skobj, dam) {
                let a = who.getSkillParam("a", skobj);
                const b = who.getSkillParam("b", skobj);
                if (tobj && (tobj.hp() / tobj.maxHp()) < (b * 0.01)) {
                    a *= 2;
                }
                return a;
            },
        },
    },
    Events: {
        普攻命中: [{
            行为: [1],
        }],
    },
    Conds: {},
};