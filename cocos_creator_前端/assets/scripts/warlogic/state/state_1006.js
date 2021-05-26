module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "选择目标",
            目标: "自己",
        },
        2: {
            行为: "对白",
            i18n: "cursetrigger",
        },
        3: {
            行为: "扣血",
            值: (who, tobj, skobj, dam) => {
                return who.getSkillParam("a", skobj);
            },
        },
    },
    Attr: {},
    Events: {
        用主技后: [{
            行为: [1, 2, 3],
        }],
    },
    Conds: {},
};