module.exports = {
    Type: "被动",
    Heartbeat(who, tobj, skobj, dam) {
        return who.getSkillParam("a", skobj);
    },
    Actions: {
        1: {
            行为: "免费技能",
        },
    },
    Attr: {},
    Events: {
        心跳: [{
            行为: [1],
        }],
    },
};