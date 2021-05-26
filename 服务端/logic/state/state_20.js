module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    AddRound1: 1,
    Actions: {},
    Attr: {
        BeAtkW: [

            function(who, tobj, skobj, dam) {
                return -who.getSkillParam("d", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};