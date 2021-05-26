module.exports = {
    AddType: "刷新",
    Duration: "刷新",
    Actions: {
        1: {
            行为: "删除状态临时值",
        },
    },
    Attr: {},
    Conds: {
        1: {
            判断(dOption) {
                return dOption.reason !== "normal"; // 技能自己删除状态
            },
        },
    },
    Events: {
        状态结束: [{
            行为: 1,
            条件: 1,
        }],
    },
};