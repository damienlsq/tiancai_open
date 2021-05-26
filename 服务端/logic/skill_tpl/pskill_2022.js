module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "二连击",
            值: (who, tobj, skobj, dam) => {
                return who.maxHp() * who.getSkillParam("b", skobj) * 0.01;
            },
        },
    },
    Attr: {},
    Events: {
        普攻命中: [{
            行为: [1],
        }],
    },
    Conds: {
    },
};