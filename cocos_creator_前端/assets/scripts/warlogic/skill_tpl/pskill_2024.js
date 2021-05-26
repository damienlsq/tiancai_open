module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "全局自动杀怪",
            间隔(who, tobj, skobj, dam) {
                return who.getSkillParam("a", skobj);
            },
        },
        2: {
            行为: "停止全局自动杀怪",
        },
    },
    Attr: {},
    Events: {
        发动技能: [{
            行为: [1],
        }],
        技能结束: [{
            行为: [2],
        }],
    },
};