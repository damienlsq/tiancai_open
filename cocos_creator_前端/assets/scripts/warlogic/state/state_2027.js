module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        MaxHp: [
            0,
            function(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        ],
    },
    Events: {},
    Conds: [],
};