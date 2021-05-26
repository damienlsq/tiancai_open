// XPS 通用的基于时间戳的统计代码

let XPSList = null;

function addXPS(name, val) {
  if (typeof (val) !== "number") {
    return;
  }
  if (!XPSList) {
    XPSList = {};
  }
  if (!XPSList[name]) {
    XPSList[name] = [];
  }
  const lst = XPSList[name];
  lst.push({
    t: moment().valueOf(), // ms
    val,
  });
}

function cleanXPSList(name) {
  if (!XPSList) {
    return;
  }
  if (!XPSList[name]) {
    return;
  }
  delete XPSList[name];
}


//  duration 统计时间范围 单位秒 (最近的x秒)
function updateXPS(name, duration) {
  if (!XPSList || !XPSList[name]) {
    return 0;
  }
  const iNowTime = moment().valueOf();
  const lst = XPSList[name];
  duration = duration || 20;
  while (lst && lst.length !== 0 && (iNowTime - lst[0].t > duration * 1000)) {
    lst.shift();
  }
  if (!lst || lst.length === 0) {
    return 0;
  }
  const iBeginTime = lst[0].t;
  let val = 0;
  for (let i = 0; i < lst.length; i++) {
    const data = lst[i];
    val += data.val;
  }
  const iElapsedTime = iNowTime - iBeginTime;
  let xps;
  if (iElapsedTime === 0) {
    xps = val / duration;
  } else {
    xps = val / Math.max(1, (iElapsedTime * 0.001)); // 至少1秒
  }
  xps = Math.round(xps);
  return xps;
}

function logKBPS(name, xps) {
  mbgGame.logger.info(`[stat] [${name}] ${(xps * 0.001).toFixed(1)} KB/s`);
}


// 累计统计

let AccumList = null;

// 增加累计值
function addAccumVal(name, val) {
  if (!AccumList) {
    AccumList = {
      // name: [old, current]
    };
  }
  if (!AccumList[name]) {
    AccumList[name] = [0, 0];
  }
  AccumList[name][1] += val;
}

// 获取累计值
function getAccumVal(name) {
  return (AccumList && AccumList[name] && AccumList[name][1]) || 0;
}

// 获取上一个累计值
function getOldAccumVal(name) {
  return (AccumList && AccumList[name] && AccumList[name][0]) || 0;
}

function formatFunc_KB(v) {
  return `${(v / 1000).toFixed(1)}KB`;
}

function logAccumVal(name, formatFunc) {
  if (formatFunc === "KB") {
    formatFunc = formatFunc_KB;
  }
  if (!AccumList || !AccumList[name]) {
    return 0;
  }
  const cur = getAccumVal(name);
  const old = getOldAccumVal(name);
  let msg = `[stat] [${name}] ${formatFunc(cur)}`;
  if (cur - old !== 0) {
    msg += ` (${cur - old > 0 ? '+' : '-'}${formatFunc(cur - old)})`;
  }
  AccumList[name][0] = AccumList[name][1];
  mbgGame.logger.info(msg);
  return cur;
}


module.exports = {
  addXPS,
  cleanXPSList,
  updateXPS,
  logKBPS,
  addAccumVal,
  getAccumVal,
  getOldAccumVal,
  logAccumVal,
};