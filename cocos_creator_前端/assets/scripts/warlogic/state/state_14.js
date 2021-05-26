module.exports = {
    AddType: "叠加",
    Duration: "刷新",
    Heartbeat: 1,
    Actions: {
        1: {
            行为: "中毒扣血",
            值(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        心跳: [{
            行为: 1,
        }],
    },
    Conds: [],
};