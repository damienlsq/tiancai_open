module.exports = { // 攻击无视敌人%{a}%防御。
    Type: "被动",
    Range: "自己",
    Actions: {},
    Attr: {
        IgnDef: [
            (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: {},
};