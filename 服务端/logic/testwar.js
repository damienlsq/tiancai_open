
const moment = require('moment');
const _ = require('underscore');
const md5 = require("md5");
const utils = require('../gameserver/utils');
const mbgGame = {};
global._ = _;
global.moment = moment;
global.mbgGame = mbgGame;

mbgGame.config = require('./config');
mbgGame.config.client = {};

const checkconfig = require('../checkconfig');

checkconfig();

const dWarData = require('./w');
const opList = require('./opList');

const CWar = require('./w_war');
const defines = require('./w_defines');
const CTestListener = require('./test_listener');

defines.initDefaultVal();

class Test {
    constructor() {
        this.m_WarIDCount = 0;
        this.m_WarObjCount = 0;
        this.m_WarObjDict = {}; // {wID:oWar}
    }
    updateWar() {
        while (!this.m_War.isWarEnd()) {
            this.m_War.simulate();
        }
    }
    createListener() {
        return new CTestListener();
    }
    getNewWarObjID() {
        if (this.m_WarIDCount > 10000) {
            // 超过1W，开始复用被回收的ID
            if (this.m_RecycleIDs && this.m_RecycleIDs.length > 0) {
                const wID = this.m_RecycleIDs.shift();
                return wID;
            }
        }
        if (!this.m_WarIDCount) {
            this.m_WarIDCount = 0;
        }
        this.m_WarIDCount += 1;
        return this.m_WarIDCount;
    }
    createWar(uuid, dData) {
        const listener = this.createListener(dData.lt);
        const oWar = new CWar();
        oWar.enableLog();
        oWar.setUUID(uuid);
        oWar.setCreateTime();
        if (dData.seed) {
            oWar.setSeed(dData.seed);
        } else {
            // GS没设置种子，那么自己生成，并写进warData里
            dData.seed = oWar.getSeed();
        }
        if (!dData.replay && dData.record) {
            oWar.wlog("record begin", dData.worldIdx);
            oWar.setRecordEnabled(true);
            oWar.m_WarAllData = utils.deepClone(dData);
        }
        // oWar.wlog("dData.replay:", dData.replay);
        if (dData.replay) {
            const dReplayData = utils.deepClone(dData);
            delete dReplayData.result;
            delete dReplayData.opList;
            delete dReplayData.replay;
            //  const sData = JSON.stringify(dReplayData);
            // oWar.wlog("md5 of replay warData:", md5(sData));
            // oWar.wlog(sData);
            // fs.writeFile("wreplay.js", `const dData = JSON.parse(\`${JSON.stringify(dReplayData)}\`); module.exports = dData;`);
            // oWar.wlog("replay opList", dData.opList, "result", dData.result);
            oWar.setReplayModeEnabled(true);
            oWar.setReplayResult(dData.result);
            oWar.setClientOpList(dData.opList);
            // oWar.wlog(`setClientOpList:`, dData.opList);
        }
        oWar.setShortID(dData.shortid);
        oWar.registerListener(listener);
        listener.setWar(oWar);
        oWar.setWorldIdx(dData.worldIdx);
        if (mbgGame.devMode) {
            // oWar.setDebug(true);
        }
        this.autoSetWarAttr(oWar, dData);
        const wID = this.getNewWarObjID();
        oWar.setWarID(wID);
        if (dData.team) {
            if (dData.team.left) {
                oWar.initTeam(defines.TEAM_LEFT, dData.team.left, dData.item && dData.item[defines.TEAM_LEFT]);
            }
            if (dData.team.right) {
                oWar.initTeam(defines.TEAM_RIGHT, dData.team.right, dData.item && dData.item[defines.TEAM_RIGHT]);
            }
        }
        // 执行到这里还没报错，引用这个oWar
        this.m_WarObjDict[wID] = oWar;
        this.m_WarObjCount += 1;
        oWar.setSendWarEvent(dData.send);
        this.m_War = oWar;
        return oWar;
    }
    // GS要求设置一些oWar的属性
    autoSetWarAttr(oWar, dData) {
        if (dData.stageIdx) {
            oWar.setStageIdx(dData.stageIdx);
        }
        if (dData.stageID) {
            oWar.setStageID(dData.stageID);
        }
        if (dData.ft) {
            oWar.setForceEndTime(dData.ft);
        }
        // 战斗场景的背景
        if (dData.bg) {
            oWar.setBg(dData.bg);
        }
        if (dData.cinfo) {
            oWar.setInfoForClient(dData.cinfo);
        }
        if (dData.targetUUID) {
            oWar.setTargetUUID(dData.targetUUID);
        }
        if (dData.botting) {
            // oWar.wlog("autoSetWarAttr", dData.botting);
            for (let i = 0; i < defines.bothTeams.length; i++) {
                const iTeam = defines.bothTeams[i];
                const charaIDs = dData.botting[iTeam];
                oWar.setBottingConfig(iTeam, {
                    charaIDs,
                    auto: iTeam === defines.TEAM_LEFT ? dData.auto : 1,
                });
            }
            // oWar.wlog("oWar.m_Botting", oWar.m_Botting);
        }
    }
    beginWar(dData) {
        const oWar = this.m_WarObjDict[dData.wID];
        if (!oWar) {
            this.logError("beginWar, no oWar, wID:", dData.wID);
            return;
        }
        this.autoSetWarAttr(oWar, dData);

        if (dData.team) {
            if (dData.team.left) {
                oWar.m_WarAllData.team.left = utils.deepClone(dData.team.left);
                oWar.initTeam(defines.TEAM_LEFT, dData.team.left);
            }
            if (dData.team.right) {
                oWar.m_WarAllData.team.right = utils.deepClone(dData.team.right);
                oWar.cleanTeam(defines.TEAM_RIGHT);
                oWar.initTeam(defines.TEAM_RIGHT, dData.team.right);
            }
        }
        if (oWar.isPVP()) {
            if (dData.realtime) {
                const [host, FSId, cid] = dData.defenderFwdPair;
                oWar.beginRealTimePVP(host, FSId, cid);
            }
        }
        if (oWar.worldIdx() === 0) {
            oWar.setCreateTime(moment().valueOf());
        }
        oWar.startSimulate();
        oWar.onBegin();
    }
}

dWarData.replay = true;
dWarData.opList = opList;

let first = true;
let dHp = {};

function check(unit) {
    if (first) {
        dHp[unit.objID()] = unit.hp();
    } else if (dHp[unit.objID()] !== unit.hp()) {
        console.log("err!!", dHp[unit.objID()], unit.hp());
    }
}


for (let i = 0; i < 1000; i++) {
    const test = new Test();
    const oWar = test.createWar('uu', utils.deepClone(dWarData));
    test.beginWar({ wID: 1 });
    test.updateWar();
    oWar.eachUnitDo(check);
    first = false;
    if (i % 1000 === 0) console.log(i);
}