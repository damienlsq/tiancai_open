
module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {},
    Attr: {
        DA: [
            (who, tobj, skobj, dam) => {
                const tobjs = who.m_War.getDeadUnitsByTeam(who.team());
                const count = (tobjs && tobjs.length) || 0;
                // who.wlog("state 2020", count, who.getSkillParam("a", skobj));
                return who.getSkillParam("a", skobj) * count;
            },
            0,
        ],
    },
    Events: {},
    Conds: [],
};