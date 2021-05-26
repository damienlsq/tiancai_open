module.exports = {
    Type: "被动",
    Actions: {
        1: {
            行为: "触发被动",
        },
        2: {
            行为: "选择目标",
            目标: "自己",
        },
        3: {
            行为: "删状态",
            编号: 2020,
        },
        4: {
            行为: "加状态",
            编号: 2020,
            时长: 0,
        },
    },
    Attr: {},
    Events: {
        死亡: [{
            行为: [1, 2, 3, 4],
            条件: 1,
        }],
    },
    Conds: {
        1: {
            判断(dOption) {
                const who = this.m_Owner;
                const tobj = dOption.tobj;
                return tobj && who.team() === tobj.team();
            },
        },
    },
};