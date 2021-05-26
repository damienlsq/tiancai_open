module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        Def: [
            0,
            (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        ],
    },
    Events: {},
    Conds: [],
};
