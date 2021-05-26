console.log("[restarted]", new Date());
const walkSync = require('walk-sync');
const XLSX = require('xlsx');
const rf = require("fs");
const redis = require('redis');
const mysql = require('mysql');
const koa = require('koa');
const _ = require("underscore");
const co = require('co');
const coRedis = require('co-redis');
const router = require('koa-router')();
const coMysql = require('./co_mysql');
const trans = require('./trans');
const config_tc = require('./config_tc');
const config_dk = require('./config_dk');


const logInfo = (...args) => {
  console.log(...args);
};
const logError = (...args) => {
  console.error(...args);
};


function* initMysqlConnect(dDBConfig) {
  const connection = mysql.createConnection({
    host: dDBConfig.host,
    port: dDBConfig.port,
    user: dDBConfig.user,
    password: dDBConfig.password,
    database: dDBConfig.database,
    connectTimeout: 0,
    useConnectionPooling: true,
  });
  const db = coMysql(connection);
  connection.on('error', (err) => {
    logError(err);
  });
  yield db.connect();
  return db;
}

function* initRedisConnect(dDBConfig) {
  const password = dDBConfig.password;
  let db = redis.createClient(dDBConfig.port, dDBConfig.host, {});
  db.on("error", (error) => {
    logError(error);
  });
  db = coRedis(db);
  yield db.auth(password);
  db.on("subscribe", (channel, count) => {
    logInfo('[REDIS  event:subscribe, channel:', channel, ", count:", count);
  });
  db.on("message", (channel, message) => {
    logInfo(`[REDIS] event:message, channel ${channel}: ${message}`);
    if (db.onChannelMsg) {
      db.onChannelMsg(message, channel);
    }
  });
  if (dDBConfig.select) {
    db.select(dDBConfig.select);
  }
  if (dDBConfig.onReady) {
    yield dDBConfig.onReady();
  } else {
    logInfo('[no onReady function]');
  }
  return db;
}


const LocalConfigDict = {
  tc: config_tc,
  dk: config_dk,
};



const DaobiaoState = {
  // project: state
};


const Progress = {
  // project: progress
};


const initDBConnection = function* (localConfig) {
  /*
  仅供参考
  var mysqlDBConfig = {
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "123456",
      "charset": "utf8",
      "debug": false,
      "database": "mbgbills"
  };*/
  logInfo("[csv2db] begin initMysqlConnect");
  const dbMysql = yield initMysqlConnect(localConfig.mysqlDBConfig);
  logInfo("[csv2db] initMysqlConnect ok");

  logInfo("[csv2db] begin initRedisConnect");
  const dbRedis = yield initRedisConnect(localConfig.redisDBConfig);
  logInfo("[csv2db] initRedisConnect ok");
  return {
    dbMysql,
    dbRedis,
  };
};

const setProgressDesc = (dbRedis, project, type, desc) => {
  return dbRedis.hset("daobiaolog", `${project}_${type}`, desc);
};

const setProgress = (dbRedis, project, type, progress) => {
  Progress[project] = progress;
  return dbRedis.hset("daobiao", `${project}_${type}`, Progress[project]);
};

const addProgress = (dbRedis, project, type, progress) => {
  Progress[project] += progress;
  return setProgress(dbRedis, project, type, Progress[project]);
};

const setReport = (dbRedis, project, type, report) => {
  return dbRedis.hset("daobiaoreport", `${project}_${type}`, report);
};
function* cleanOldConfig(dbDict, project, type, report) {
  const dbMysql = dbDict.dbMysql;
  const dbRedis = dbDict.dbRedis;
  yield setProgressDesc(dbRedis, project, type, `正在清旧数据表`);
  if (type === "config") {
    const res = yield dbMysql.query(`DELETE FROM ${project}_config WHERE category like '数据表%' `);
    if (res && res.affectedRows) {
      logInfo(`[query clean ${project}_config sql result] res: ok`);
    } else {
      report += "清空config旧数据出错\n";
      logError(`[query clean ${project}_config sql result] res: err`);
      logError(res);
    }
  }
  if (type === "i18n") {
    const res = yield dbMysql.query(`DELETE FROM ${project}_i18n WHERE category like '数据表%' `);
    if (res && res.affectedRows) {
      logInfo(`[query clean ${project}_i18n sql result] res: ok`);
    } else {
      report += "清空i18n旧数据出错\n";
      logError(`[query clean ${project}_i18n sql result] res: err`);
      logError(res);
    }
  }
  return report;
}

function* makeAll(localConfig, dbDict, project, type, FileName2CSV) {
  const dbMysql = dbDict.dbMysql;
  const dbRedis = dbDict.dbRedis;
  let report = "";
  const fileNum = (_.keys(FileName2CSV)).length;
  report = yield cleanOldConfig(dbDict, project, type, report);
  yield addProgress(dbRedis, project, type, 1);
  yield setProgressDesc(dbRedis, project, type, `开始转换 ${fileNum}`);
  const progressPerFile = Math.floor((100 - Progress[project]) / fileNum);
  let idx = 0;
  for (const sFile in FileName2CSV) {
    idx += 1;
    const dSql = trans.buildSqlByCSV(localConfig, sFile, FileName2CSV[sFile], type);
    if (typeof (dSql) === "string") { // 出错了
      const err = dSql;
      report += `${err}`;
      report += '\n';
      logInfo("[buildSqlByCSV] failed, file=", sFile);
      continue;
    }
    if (dSql.configSql && type === "config") {
      try {
        const res = yield dbMysql.query(dSql.configSql);
        if (res && res.affectedRows) {
          // report += `成功导表: ${sFile} [config]\n`;
          logInfo("[query configSql result] res: ok, file:", sFile);
        } else {
          report += `写入mysql出错: ${sFile} [config]`;
          report += '\n';
          logError("[query configSql result] res: err", sFile);
        }
      } catch (e) {
        report += `写入mysql出错: ${sFile} [config]`;
        report += '\n';
        logInfo("[err] file:", sFile);
        logInfo("[err]", e);
        logInfo("[sql]", dSql.configSql);
      }
    }
    if (dSql.i18nSql && type === "i18n") {
      try {
        const res = yield dbMysql.query(dSql.i18nSql);
        if (res && res.affectedRows) {
          // report += `成功导表: ${sFile} [i18n]\n`;
          logInfo("[query i18nSql result] res: ok");
        } else {
          report += `写入mysql出错: ${sFile} [i18n]`;
          report += '\n';
          logError("[query i18nSql result] res: err", sFile);
        }
      } catch (e) {
        report += `写入mysql出错:${sFile}[i18n]`;
        report += '\n';
        logInfo("[err] file:", sFile);
        logInfo("[err]", e);
        logInfo("[sql]", dSql.i18nSql);
      }
    }
    yield addProgress(dbRedis, project, type, progressPerFile);
    yield setProgressDesc(dbRedis, project, type, `已导表:${sFile} ${idx}/${fileNum}`);
  }
  // 更新版本号
  if (type === "config") {
    let sql = `INSERT INTO ${project}_config (\`key\`, \`value\`) VALUES \n`;
    sql += "('config_version', 1)\n";
    sql += "ON DUPLICATE KEY UPDATE `value` = `value`+ 1;";
    yield dbMysql.query(sql);
  }
  if (type === "i18n") {
    let sql = `INSERT INTO ${project}_config (\`key\`, \`value\`) VALUES \n`;
    sql += "('i18n_version', 1)\n";
    sql += "ON DUPLICATE KEY UPDATE `value` = `value`+ 1;";
    yield dbMysql.query(sql);
  }
  logInfo("[report]", report);
  yield setReport(dbRedis, project, type, report);
  yield setProgress(dbRedis, project, type, 100);
  yield setProgressDesc(dbRedis, project, type, `导表成功`);
  logInfo("[csv2db] finish", new Date());
  DaobiaoState[project] = 0;
}

function getName(filename) {
  // 嗯嗯/哈哈.xlsx
  // filename里面包含相对目录路径 要去掉
  const name = filename.substr(0, filename.length - 5);
  return name.substr(name.lastIndexOf('/') + 1);
}

function localCsv2Config(localConfig, dbDict, project, type) {
  const xlsxDir = localConfig.xlsxDir;
  const paths = walkSync(xlsxDir);
  logInfo("localCsv2Config 1");
  co(function* () {
    const FileName2CSV = {};
    for (let i = 0; i < paths.length; i++) {
      const filename = paths[i];
      if (filename.indexOf(".xlsx") === -1) {
        continue;
      }
      logInfo("load", filename);
      const name = getName(filename);
      if (name.startsWith("~$")) {
        logInfo("skip", filename);
        continue;
      }
      const filepath = xlsxDir + filename;
      const workbook = XLSX.readFile(filepath);
      const firstSheetName = workbook.SheetNames[0];
      logInfo("first_sheet_name", firstSheetName);
      const ws = workbook.Sheets[firstSheetName];
      logInfo("ws size", ws.length);
      const csvData = XLSX.utils.sheet_to_csv(ws);
      // logInfo("csvData", csvData);

      FileName2CSV[name] = csvData;
    }
    yield makeAll(localConfig, dbDict, project, type, FileName2CSV);
  }).catch((err) => {
    logInfo("[localCsv2Config failed] err:", err);
    logError("[localCsv2Config failed] err:", err);
    process.exit();
  });
  logInfo("localCsv2Config 2");
}


router
  .get('/csv2db', function* () {
    const res = this.response;
    const req = this.request;
    const type = req.query.type;
    const project = req.query.project;
    logInfo("[csv2db] type=", type, "project=", project, new Date());
    if (type !== "i18n" && type !== "config") {
      logError("[csv2db] wrong type", type);
      res.body = "error";
      return;
    }
    if (DaobiaoState[project]) {
      res.body = "ok";
      return;
    }
    const localConfig = LocalConfigDict[project];
    if (!localConfig) {
      logError("[csv2db] no localConfig", project);
      res.body = "error";
      return;
    }
    DaobiaoState[project] = 1;
    const dbDict = yield initDBConnection(localConfig);
    logInfo("[csv2db] initDBConnection ok");
    Progress[project] = 0;
    yield addProgress(dbDict.dbRedis, project, type, 1);
    logInfo("[csv2db] begin download");
    setTimeout(() => {
      localCsv2Config(localConfig, dbDict, project, type);
    }, 0);
    res.body = "ok";
  });

function createWebServer(port) {
  const app = koa();
  app.on('error', (err) => {
    logError('[Server.Error] ', err);
    process.exit();
  });
  app.use(router.routes());
  app.use(router.allowedMethods());
  logInfo("begin listen");
  app.listen(port);
}

createWebServer(12000);