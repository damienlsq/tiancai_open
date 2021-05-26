/*
    这个文件负责处理excel表到sql语句的转换
*/
const _ = require("underscore");
const CSV = require('./csv');


function transCol(v) { /* , colName*/
    try {
        if (typeof (v) === "number") {
            return v;
        }
        if (typeof (v) === "string") {
            let v2 = Number(v);
            if (!isNaN(v2)) {
                return v2;
            }
            if (v.indexOf('_') !== -1 && v.indexOf('[') === -1 && v.indexOf('{') === -1) {
                return v;
            }
            // 不是数字，可能是[]或{}
            eval(`v2=${v};`);
            return v2;
        }
        return v;
    } catch (e) {
        let v2;
        if (v[0] === "[" && v[v.length - 1] === "]") {
            // 列表，手动转换
            v = v.substr(1, v.length - 2);
            v2 = v.split(",");
            v2 = _.map(v2, (s) => {
                return s.trim();
            });
            return v2;
        }
    }
    return v;
}

function isI18nCol(colName) {
    if (colName.indexOf("平台") !== -1 || colName.indexOf("中文") !== -1 || colName.indexOf("英文") !== -1 || colName.indexOf("日文") !== -1) {
        return true;
    }
    return false;
}

function getConfigParam(dCSVConfig, name) {
    if (dCSVConfig.config && dCSVConfig.config[name] != null) {
        return dCSVConfig.config[name];
    }
    return dCSVConfig[name];
}

function getI18nParam(dCSVConfig, name) {
    if (dCSVConfig.i18n && dCSVConfig.i18n[name] != null) {
        return dCSVConfig.i18n[name];
    }
    return dCSVConfig[name];
}


function transOneRow(localConfig, dCSVConfig, iRowID, dRow, type, sFile) {
    const dInfo = {};
    let dI18n = null;
    let desc = "";
    const key = getConfigParam(dCSVConfig, "key");
    // 遍历每一列做处理
    for (const colName in dRow) {
        if (!colName) {
            continue;
        }
        if (colName === key) {
            if (dCSVConfig.includeID) {
                dInfo.ID = iRowID;
            }
            continue;
        }
        let memName;
        const v = dRow[colName];
        // console.log("[isI18nCol]", colName, isI18nCol(colName));
        if (type === "i18n") {
            if (!isI18nCol(colName)) {
                continue;
            }
            // 是i18n数据
            if (!dI18n) {
                dI18n = {};
            }
            const hasPrefix = colName.indexOf("-") !== -1;
            if (hasPrefix) { // 名字-中文
                const arr = colName.split("-");
                const prefix = dCSVConfig.i18n.prefix[arr[0]];
                memName = localConfig.ColNameTable[arr[1]];
                if (!dI18n[prefix]) {
                    dI18n[prefix] = {};
                }
                dI18n[prefix][memName] = v;
            } else { // 名字
                memName = localConfig.ColNameTable[colName]; // zh en ja
                if (!dI18n.default) {
                    dI18n.default = {};
                }
                if (memName !== "platform") {
                    dI18n.default[memName] = v;
                }
            }
            if (memName === "platform") {
                dI18n.platform = v || 0;
            }
        } else if (type === "config") {
            if (isI18nCol(colName)) {
                continue;
            }
            memName = localConfig.ColNameTable[colName];
            if (memName === "platform") {
                dInfo.platform = v || 0;
                continue;
            }
            if (!memName) {
                // 未配置 中文->英文 转换
                if (!(localConfig.ignoreColTable[colName] || colName.endsWith("(ignore)"))) {
                    console.log("[no such col]", colName, sFile);
                    // console.log("sData:", sData);
                    // saveFileToDisk("/home/pm2deploy/bugfile.csv", "", sData);
                    // process.exit();
                }
                continue;
            }
            if (memName === "desc") {
                if (v) {
                    desc = v;
                }
                continue;
            }
            dInfo[memName] = transCol(v, colName); // 根据colName转换下v，然后放进dInfo
        }
    }
    return {
        dInfo,
        dI18n,
        desc,
    };
}


function transAllRow(localConfig, dCSVConfig, lstCsvData, lstdata, lstI18n, dAllInJson, dAllInDesc, type, sFile) {
    let category = "数据表";
    const sType = 3;
    let dTree = { /* treeKey: dData */ };
    for (let i = 0; i < lstCsvData.length; i++) {
        const dRow = lstCsvData[i]; // 表的单行数据，字典结构
        let key;
        if (type === "config") {
            key = getConfigParam(dCSVConfig, "key");
        } else {
            key = getI18nParam(dCSVConfig, "key");
        }
        let iRowID = dRow[key]; // 唯一标识该行的key
        if (!iRowID || iRowID === "") {
            // 没有设key的行，无视
            continue;
        }
        if (typeof (iRowID) === "string") {
            iRowID = iRowID.trim();
        }
        const dResult = transOneRow(localConfig, dCSVConfig, iRowID, dRow, type, sFile);
        let dInfo = dResult.dInfo; // 经过转换后的该行的数据字典
        const dI18n = dResult.dI18n;
        const desc = dResult.desc;

        if (type === "config") {
            if (getConfigParam(dCSVConfig, "category")) {
                category = getConfigParam(dCSVConfig, "category");
            }
            const prefix = getConfigParam(dCSVConfig, "prefix");
            let platform = getConfigParam(dCSVConfig, "platform");
            let _type = getConfigParam(dCSVConfig, "type");
            const _key = prefix + iRowID; // 统一给key加一个前缀

            if (platform === 3) {
                platform = dInfo.platform || 0;
            }
            if (_type === "json") {
                if (dInfo.Val != null) {
                    dInfo = dInfo.Val; // 单值类型的表
                }
                dAllInJson[_key] = dInfo;
                if (desc) {
                    dAllInDesc[_key] = desc;
                }
            } else if (_type === "tree") {
                const treeKey = getConfigParam(dCSVConfig, "treeKey");
                const treePrefix = getConfigParam(dCSVConfig, "treePrefix");
                const name = localConfig.ColNameTable[treeKey];
                const k = treePrefix + dInfo[name];
                if (!dTree[k]) {
                    dTree[k] = {};
                }
                dTree[k][_key] = dInfo;
            } else {
                lstdata.push(`('${_key}','${JSON.stringify(dInfo)}','${desc}',${sType},${platform},'${category}')`);
            }
        } else if (type === "i18n") {
            if (getI18nParam(dCSVConfig, "category")) {
                category = getI18nParam(dCSVConfig, "category");
            }
            if (!_.isEmpty(dCSVConfig.i18n) && dI18n) {
                let platform = getI18nParam(dCSVConfig, "platform");
                const prefixes = dCSVConfig.i18n.prefix;
                if (platform === 3) {
                    platform = dI18n.platform || 0;
                }
                if (typeof (prefixes) === "string") {
                    const prefix = prefixes;
                    if (dI18n.default.zh || dI18n.default.en || dI18n.default.jp) {
                        lstI18n.push(`('${prefix + iRowID}','${dI18n.default.zh || ""}','${dI18n.default.en || ""}','${dI18n.default.jp || ""}', ${platform},'${category}')`);
                    }
                } else {
                    try {
                        for (const sCN in prefixes) {
                            const prefix = prefixes[sCN];
                            let _platform = platform;
                            if (localConfig.ColName2Plaform[sCN] != null) {
                                _platform = localConfig.ColName2Plaform[sCN];
                            }
                            const dI18nPrefix = dI18n[prefix];
                            if (dI18nPrefix.zh || dI18nPrefix.en || dI18nPrefix.jp) {
                                lstI18n.push(`('${prefix + iRowID}','${dI18nPrefix.zh || ""}','${dI18nPrefix.en || ""}','${dI18nPrefix.jp || ""}', ${_platform},'${category}')`);
                            }
                        }
                    } catch (e) {
                        console.log("[err] dI18n:", JSON.stringify(dI18n), "csv:", sFile);
                        console.log(e);
                        process.exit();
                    }
                }
            }
        }
    }
    if (dCSVConfig.type === "tree") {
        const platform = getConfigParam(dCSVConfig, "platform");
        for (const k in dTree) {
            const dData = dTree[k];
            lstdata.push(`('${k}','${JSON.stringify(dData)}','${''}',${sType},${platform},'${category}')`);
        }
    }
}

/*
返回：
    {
        configSql: configSql,
        i18nSql: i18nSql
    }
即返回2个sql语句，用于更新一个表在mysq中的数据
*/
function buildSqlByCSV(localConfig, sFile, sData, type) {
    let lstCsvData;
    try {
        lstCsvData = new CSV(sData, {
            header: true,
            // cellDelimiter: ',',
            // lineDelimiter: '\n',

        }).parse();
    } catch (e) {
        console.log(e);
        console.log("[buildSqlByCSV] parse csv failed:", sFile);
        return `转换csv出错:${sFile}`;
    }
    if (!lstCsvData || lstCsvData.length === 0) {
        console.log("no lstCsvData, sData=");
        console.log(sData);
        return `转换csv成功但是列表是空的:${sFile}`;
    }
    // console.log("[file] " + sFile);
    const dCSVConfig = localConfig.CSVConfig[sFile];
    // console.log(JSON.stringify(dCSVConfig));

    if (!dCSVConfig) {
        return `此导表缺少配置:${sFile}`;
    }
    if (type === "config" && !dCSVConfig.config) {
        return `没有config配置:${sFile}`;
    }
    if (type === "i18n" && !dCSVConfig.i18n) {
        return `没有i18n配置:${sFile}`;
    }
    let category = "数据表";
    const sType = 3;
    const lstdata = [];
    const lstI18n = [];
    const dAllInDesc = {};
    const dAllInJson = {}; // 每一行变成这个这个字典的一个kv
    transAllRow(localConfig, dCSVConfig, lstCsvData, lstdata, lstI18n, dAllInJson, dAllInDesc, type, sFile);
    let configSql = "";
    let i18nSql = "";

    if (type === "config") {
        if (getConfigParam(dCSVConfig, "category")) {
            category = getConfigParam(dCSVConfig, "category");
        }
        const _type = getConfigParam(dCSVConfig, "type");
        if (_type === "json") {
            const json = getConfigParam(dCSVConfig, "json");
            const platform = getConfigParam(dCSVConfig, "platform");
            let sDesc = "";
            for (const key in dAllInDesc) {
                sDesc += `${key}: ${dAllInDesc[key]}\n`;
            }
            // console.log(dAllInJson);
            lstdata.push(`('${json}','${JSON.stringify(dAllInJson)}','${sDesc}',${sType},${platform},'${category}')`);
        }
        if (!_.isEmpty(lstdata)) {
            configSql += `INSERT INTO ${localConfig.project}_config` + "(`key`, `value`, `desc`, `type`, `platform`, `category`) VALUES \n";
            configSql += `${lstdata.join(",\n")}\n`;
            configSql += "ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `desc`=VALUES(`desc`), `category`=VALUES(`category`), `platform`=VALUES(`platform`);";
        } else {
            console.log("[err] configSql, no lstdata", sFile);
            console.log("csv len:", lstCsvData && lstCsvData.length);
        }
    } else if (type === "i18n") {
        if (getI18nParam(dCSVConfig, "category")) {
            category = getI18nParam(dCSVConfig, "category");
        }
        if (!_.isEmpty(dCSVConfig.i18n)) {
            if (!_.isEmpty(lstI18n)) {
                i18nSql = `INSERT INTO ${localConfig.project}_i18n` + "(`key`, `zh`, `en`, `ja`, `platform`, `category`) VALUES \n";
                i18nSql += `${lstI18n.join(",\n")}\n`;
                i18nSql += "ON DUPLICATE KEY UPDATE `zh`=VALUES(`zh`), `en`=VALUES(`en`), `ja`=VALUES(`ja`), `platform`=VALUES(`platform`), `category`=VALUES(`category`);";
            } else {
                console.log("[err] i18nSql,  no lstdata", sFile);
                console.log("csv len:", lstI18n && lstI18n.length);
            }
        }
    }
    return {
        configSql,
        i18nSql,
    };
}


module.exports = {
    buildSqlByCSV,
};