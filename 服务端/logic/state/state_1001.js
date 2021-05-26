module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        ReduceHeal: [
            function(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};