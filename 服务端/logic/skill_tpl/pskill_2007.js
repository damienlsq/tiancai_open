module.exports = {// 受到的治疗效果增加%{a}%。
    Type: "被动",
    Range: "自己",
    Attr: {
        IncrHeal: [
            (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: {},
};