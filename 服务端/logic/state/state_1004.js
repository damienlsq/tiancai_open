module.exports = {
    AddType: "叠加",
    Duration: "刷新",
    Actions: {},
    Attr: {
        DR: [
            function(who, tobj, skobj, dam) {
                return who.getSkillParam("b", skobj);
            },
            0,
        ],
    },
    Events: {},
    Conds: {},
};