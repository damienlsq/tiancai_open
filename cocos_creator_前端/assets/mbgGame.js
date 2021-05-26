const _lodash = require('lodash');
const _moment = require('moment');
const _emitter = require('emitter');
const Buffer = require('buffer').Buffer;
const Polyglot = require('polyglot');
const w_gen = require('w_gen');

if (cc.sys.isNative) {
  if (!global._) {
    global._ = _lodash;
  }
  if (!global.moment) {
    global.moment = _moment;
  }
  if (!global.emitter) {
    global.emitter = _emitter;
  }
} else {
  if (!window._) {
    window._ = _lodash;
  }
  if (!window.moment) {
    window.moment = _moment;
  }
  if (!window.emitter) {
    window.emitter = _emitter;
  }
}

const mbgGame = {
  version: '1.0.1', // 客户端version,基本不需要改
  host: '', // 正式服连接
  hostDev: '', // 测服连接
  h5LoginURL: '', // h5版本连接
  mobildLoginURL: '', // 手机登录连接
  port_ws: 30701,
  port_enet: 30702,

  res_url: '', // 远程资源跟路径
  avoid_lang: ['zh'], // 目前开放的语言

  channel_id: 'test',

  state: {},
  setup: {
    lang: cc.sys.language,
    sound: 1,
    music: 1,
  },
  idleWorldIdx: 0,
  callback: {},
  common: {},
  timeVar: {},
  cache: {},
  preloadRes: {},

  userInfo: {
    nickname: '',
    totem: 0,
  },
  restart_cbs: [],

  restart() {
    // mbgGame.log("begin restart");
    if (mbgGame.restart_cbs) {
      mbgGame.restart_cbs.forEach((x) => {
        x.call();
      });
    }
    mbgGame.restart_cbs = [];

    // 需要删掉一堆全局变量
    if (mbgGame.warCtrl) {
      mbgGame.warCtrl.release();
      delete mbgGame.warCtrl;
    }
    delete mbgGame.loading;
    delete mbgGame.managerUi;
    delete mbgGame.resManager;
    delete mbgGame.panelMultiplayer;

    delete mbgGame.panelSquare;
    delete mbgGame.panelLab;
    delete mbgGame.panelStory;
    delete mbgGame.panelClan;
    delete mbgGame.panelShop;
    delete mbgGame.panelCharacters;
    delete mbgGame.warMgr;
    delete mbgGame.topUI;
    delete mbgGame.sceneMenu;
    delete mbgGame.gameScene;
    delete mbgGame.clanEvent;
    delete mbgGame.ploting;
    mbgGame.timeVar = {};
    // 清理缓存
    mbgGame.cache = {};

    mbgGame.removeCache();
    cc.game.restart();
  },
  clientFix() {
    if (mbgGame.isWechatGame()) {
      mbgGame.wechat.getFileList();
      mbgGame.wechat.wechatGameClean();
    }
    if (cc.sys.isNative) {
      const storagePath = `${jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/'}remote-assets`;
      jsb.fileUtils.removeDirectory(storagePath);
    }
    cc.game.restart();
  },
  disconnect() {
    mbgGame.netCtrl.disconnect();
  },
  reconnect(reason) {
    mbgGame.netCtrl.reconnect(reason);
  },
  safeReconnect() {
    if (mbgGame.seamlessReconnect) {
      // mbgGame.log('safeReconnect');
      if (mbgGame.warMgr.hasAnyWar()) {
        if (mbgGame.gameScene) {
          // 5秒后重连
          mbgGame.gameScene.scheduleOnce(mbgGame.safeReconnect.bind(mbgGame), 5);
          return;
        }
      }
      // 尝试断开链接
      this.disconnect();
    }
  },
  isReleaseChannel() {
    return mbgGame.channel_id === 'mbg' || mbgGame.channel_id === 'mbgwanga';
  },
  getSaveUUID() {
    // 优先读取本地uuid
    const uuid = cc.sys.localStorage.getItem('playerid');
    // mbgGame.log("getSaveUUID:", uuid);
    if (uuid && uuid.length) {
      return uuid;
    }
    if (!cc.sys.isNative) {
      return '';
    }
    if (mbgGame.isIOS()) {
      return jsb.reflection.callStaticMethod('NativeOcClass', 'getSaveItem:', 'CT_UUID');
    }
    return '';
  },
  i18n2Polyglot() {
    // 初始化polyglot
    // 抽出tips
    mbgGame.tipsKeyList = [];
    mbgGame.emotesKeyList = [];
    mbgGame.polyglot = new Polyglot({
      allowMissing: true,
    });
    _.keys(mbgGame.i18n).forEach((k) => {
      _.keys(mbgGame.i18n[k]).forEach((l) => {
        const a = {};
        a[l] = {};
        a[l][k] = mbgGame.i18n[k][l];
        mbgGame.polyglot.extend(a);
        if (k.startsWith('tips_')) {
          mbgGame.tipsKeyList.push(k);
        }
        if (k.startsWith('emote_')) {
          mbgGame.emotesKeyList.push(k);
        }
      });
    });
  },
  // 获取一个i18n字符串
  getString(key, options, noWarn) {
    let str = '';
    if (!mbgGame.polyglot) {
      return str;
    }
    let lang = 'zh';
    if (mbgGame.setup && mbgGame.setup.lang) {
      lang = mbgGame.setup.lang;
    }
    if (mbgGame.avoid_lang && !mbgGame.avoid_lang[lang]) {
      // 如果设置了未开放的语言,默认是中文
      lang = 'zh';
    }
    const polyglotKey = `${lang}.${key}`;
    str = mbgGame.polyglot.t(polyglotKey, options);
    if (str === polyglotKey) {
      if (!noWarn) {
        this.warn('i18n lost key', polyglotKey);
      }
      return '';
    }
    // console.log("i18n:", key, str);
    return str;
  },
  getBoldStr(str) {
    return `<b>${str}</b>`;
  },
  setLabel(labelNode, str) {
    if (!labelNode) return null;
    let com = labelNode.getComponent(cc.Label);
    if (!com) {
      com = labelNode.getComponent(cc.RichText);
    }
    com.string = `${str}`;
    // todo 处理cocos的richtext bug
    if (labelNode.getComponent(cc.RichText)) {
      com.string = `<color=#${com.node.color.toHEX('#rrggbb')}>${str}</c>`;
    }
    // todo cocos修复后可以删除这个代码
    return com;
  },
  setSpriteLabel(labelNode, picKey) {
    if (!labelNode) return null;
    let sprite = labelNode.getComponent(cc.Sprite);
    if (!sprite) {
      sprite = labelNode.addComponent(cc.Sprite);
    }
    sprite.type = cc.Sprite.Type.SIMPLE;
    sprite.sizeMode = cc.Sprite.SizeMode.RAW;
    mbgGame.resManager.setImageFrame(labelNode, 'images', `${mbgGame.setup.lang || 'zh'}_${picKey}`);

    return sprite;
  },
  getOutlineStr(str, color, w) {
    return `<outline color=${color || '#000000'} width=${w || 1}}>${str}</outline>`;
  },
  getColorStr(str, sHexColor) {
    return `<color=${sHexColor}>${str}</color>`;
  },
  base64Encode(str) {
    return new Buffer(str, 'utf8').toString('base64');
  },
  base64Decode(str) {
    return new Buffer(str, 'base64').toString('utf8');
  },
  encryptDecrypt(toEncrypt, myKey) {
    let key = ['L', 'O', 'V', 'E', 'Y', 'O', 'U']; // Any chars will work
    if (myKey) {
      key = myKey.split('');
    }
    let output = '';
    for (let i = 0; i < toEncrypt.length; i++) {
      output += String.fromCharCode(toEncrypt.charCodeAt(i) ^ key[i % key.length].charCodeAt(0));
    }
    return output;
  },
  init() {
    try {
      let str = cc.sys.localStorage.getItem('config');
      if (str) {
        mbgGame.config = JSON.parse(str);
        mbgGame.checkConfig();
      }

      // mbgGame.performanceCheck("config", 'i18n');
      str = cc.sys.localStorage.getItem('i18n');
      if (str) {
        mbgGame.i18n = JSON.parse(str);
        this.i18n2Polyglot();
        // mbgGame.performanceCheck("config", 'i18n finish');
      }
      str = cc.sys.localStorage.getItem('setup');
      if (str) {
        mbgGame.setup = JSON.parse(this.base64Decode(str));
      }
      this.setLang(mbgGame.setup.lang);
    } catch (e) {
      mbgGame.log(`load configs error:${e.message}`);
      delete mbgGame.config;
      delete mbgGame.i18n;
    }

    mbgGame.coreVersion = mbgGame.version;
    if (cc.sys.isNative) {
      if (mbgGame.isIOS()) {
        mbgGame.coreVersion = jsb.reflection.callStaticMethod('NativeOcClass', 'getCoreVersion');
      }
      if (mbgGame.isAndroid()) {
        mbgGame.coreVersion = jsb.reflection.callStaticMethod(
          mbgGame.packageName,
          'getCoreVersion',
          '()Ljava/lang/String;',
        );
      }
    }
    mbgGame.log(`channel_id:${mbgGame.channel_id},uuid:${mbgGame.state.uuid}`);
    mbgGame.log(`version:${mbgGame.version},coreVersion:${mbgGame.coreVersion}`);
    mbgGame.log(`network:${cc.sys.getNetworkType()}`);
    // cc.sys.NetworkType.LAN WWAN NONE
    mbgGame.log(`isNative:${cc.sys.isNative}, platorm: ${cc.sys.platform}, os: ${cc.sys.os}`);
  },
  checkConfig() {
    mbgGame.log('checkConfig');
    try {
      for (const k in mbgGame.config) {
        const dData = mbgGame.config[k];
        if (k.indexOf('skill') !== -1) {
          const skillID = Number(k.substr('skill'.length));
          const keys = _.keys(dData);
          for (let i = 0, len = keys.length; i < len; i++) {
            const s = keys[i];
            const val = dData[s];
            if (s === 'CD' || s === 'duration' || s === 'a' || s === 'b' || s === 'c' || s === 'd') {
              // 函数
              if (val) {
                if (mbgGame.isWechatGame()) {
                  dData[`${s}_`] = w_gen[skillID][s];
                } else {
                  try {
                    dData[`${s}_`] = new Function(`return function(d) { return ${val}; }`)();
                  } catch (e) {
                    console.log('[onConfigUpdated]  err, key:', k, 'val:', s);
                    console.log('[onConfigUpdated]  err', e);
                  }
                }
              }
            }
          }
        }
      }
      mbgGame.log('checkConfig ok');
    } catch (e) {
      mbgGame.error('checkconfig failed', e.stack);
    }
  },
  getShortID() {
    const uuid = cc.sys.localStorage.getItem('playerid');
    if (!uuid) {
      return '';
    }

    return uuid.substring(0, 4) + uuid.substring(uuid.length - 4);
  },
  removeLocalData() {
    cc.sys.localStorage.removeItem('playerid');
    // cc.sys.localStorage.removeItem("setup");
    cc.sys.localStorage.removeItem('config');
    cc.sys.localStorage.removeItem('i18n');
    cc.sys.localStorage.removeItem('configMD5');
    cc.sys.localStorage.removeItem('configMD5s');
    cc.sys.localStorage.removeItem('i18nMD5');
    cc.sys.localStorage.removeItem('i18nMD5s');
    cc.sys.localStorage.removeItem('messageLog');
    cc.sys.localStorage.removeItem('lastChannel');
    cc.sys.localStorage.removeItem('cpm');

    this.setSaveUUID('');
    delete mbgGame.state.uuid;
    mbgGame.resManager && mbgGame.resManager.stopMusic();
  },
  formatDuration(duration, format) {
    const m = moment.utc(moment.duration(duration, 'seconds').asMilliseconds());
    if (duration > 86400) {
      if (!format) {
        return `${Math.floor(duration / 86400)}${mbgGame.getString('day')} ${m.format('HH:mm:ss')}`;
      }
    } else if (duration > 3600) {
      format = format || 'HH:mm:ss';
    } else {
      format = format || 'mm:ss';
    }
    return m.format(format, {
      forceLength: true,
      trim: false,
    });
  },
  getServerHost() {
    const host = cc.sys.localStorage.getItem('server');
    if (host && host.length) {
      // 允许尝试一次这个连接
      cc.sys.localStorage.removeItem('server');
      return host;
    }
    if (this.channel_id === 'mbgTest') {
      return mbgGame.hostReleaseTest;
    }
    if (this.channel_id === 'test') {
      return mbgGame.hostDev;
    }
    if (this.channel_id === 'shen') {
      return mbgGame.hostShen;
    }
    return mbgGame.host;
  },
  getVersion() {
    // 返回版本号
    const hotV = cc.sys.localStorage.getItem('hotupdate_version') || 0;
    let v = `v ${this.coreVersion}.${hotV}`;
    if (mbgGame.channel_id === 'test') {
      // 测服显示服务器id
      v += ` s:${mbgGame.serverid}`;
      v += ` b:${mbgGame.BSID}`;
    }
    return v;
  },
  setSaveUUID(uuid) {
    // 优先读取本地uuid
    cc.sys.localStorage.setItem('playerid', uuid);
    mbgGame.state.uuid = uuid;
    // mbgGame.log("setSaveUUID:", cc.sys.localStorage.getItem("playerid"));

    if (!uuid) {
      cc.sys.localStorage.removeItem('mobile');
    } else {
      if (mbgGame.mobileNumber && mbgGame.mobileCode) {
        // 手机登录成功的，就记下手机
        cc.sys.localStorage.setItem('mobile', mbgGame.mobileNumber);
      }
    }

    if (!cc.sys.isNative) {
      return '';
    }
    if (mbgGame.isIOS()) {
      return jsb.reflection.callStaticMethod('NativeOcClass', 'setSaveItem:andContent:', 'CT_UUID', uuid);
    }
    return '';
  },

  getDeviceUUID() {
    let id = '';
    if (!cc.sys.isNative) {
      return id;
    }
    if (mbgGame.isIOS()) {
      id = jsb.reflection.callStaticMethod('NativeOcClass', 'getSaveItem:', 'CT_UUID');
    }
    if (mbgGame.isAndroid()) {
      id = jsb.reflection.callStaticMethod(mbgGame.packageName, 'getDeviceId', '()Ljava/lang/String;');
    }
    return id;
  },

  event_show() {
    if (!mbgGame.gameScene || !mbgGame.gameScene._inGame) return;
    mbgGame.log('EVENT_SHOW： show game');
    mbgGame.showEventTime = moment().unix();

    if (mbgGame.setup.music) {
      cc.audioEngine.resumeAll();
    }
    // 亲测，6s后台15秒内，恢复还能正常收到数据包，超过20秒就会断开连接
    const leftTime = mbgGame.showEventTime - mbgGame.hideEventTime;
    // mbgGame.log("leftTime", leftTime);
    if (leftTime > 7) {
      if (mbgGame.ploting) {
        // 如果正在播剧情，直接重连
        mbgGame.restart();
        return;
      }
      // 已经超过心跳时间，直接重连
      mbgGame.reconnect('leftTime > 7');
    } else {
      mbgGame.gameScene && mbgGame.gameScene.heartBeatCheck();
    }

    // 清除联盟缓存
    mbgGame.removeCache('clan.clanEvents');
    if (mbgGame.clanEvent && mbgGame.sceneMenu.curPageIdx() === mbgGame.PageClan) {
      // 刷新联盟
      mbgGame.clanEvent.refreshList();
    }
  },

  event_hide() {
    if (!mbgGame.gameScene || !mbgGame.gameScene._inGame) return;
    mbgGame.log('EVENT_HIDE： exit game');
    // 由于退出时,ios并不会马上发出数据包,会留待按返回时发送,所以这里发offline包没有意义
    // netCtrl.sendMsg("player.offline",{});
    mbgGame.hideEventTime = moment().unix();

    // 保存聊天信息
    mbgGame.player.saveMsg();
    mbgGame.player.saveCPMData();

    if (mbgGame.setup.music) {
      cc.audioEngine.pauseAll();
    }
    // 进入后台才设置推送
    // mbgGame.player.makeLocalPush();
    // mbgGame.sendAndroidLocalPush();
  },

  setLang(lang) {
    lang = lang || cc.sys.language;
    if (!lang) {
      if (mbgGame.avoid_lang && !mbgGame.avoid_lang[lang]) {
        mbgGame.setup.lang = 'zh'; // 如果设置了未开放的语言,默认是中文
      } else {
        mbgGame.setup.lang = lang;
      }
    }

    if (mbgGame.setup.lang === 'zh') {
      moment.locale('zh-cn');
    } else if (mbgGame.setup.lang === 'tw') {
      moment.locale('zh-tw');
    }
    cc.sys.localStorage.setItem('setup', this.base64Encode(JSON.stringify(mbgGame.setup)));
  },
  getLockDict(module) {
    if (!this.m_LockDicts) {
      this.m_LockDicts = {};
    }
    if (!this.m_LockDicts[module]) {
      this.m_LockDicts[module] = {};
    }
    return this.m_LockDicts[module];
  },
  setLock(module, subtype) {
    const dDict = this.getLockDict(module);
    if (!dDict[subtype]) {
      dDict[subtype] = new Date().getTime();
    }
  },
  clearAllLock() {
    this.m_LockDicts = {};
  },
  clearLock(module, subtype) {
    const dDict = this.getLockDict(module);
    if (!dDict[subtype]) return;
    delete dDict[subtype];
  },
  getLock(module, subtype, dontReconnect) {
    const dDict = this.getLockDict(module);
    if (!dDict[subtype]) return null;
    const now = new Date().getTime();
    if (module === 'net' && !dontReconnect) {
      if (now - dDict[subtype] > 15000) {
        // todo 如果上一次的数据一直没有回复，且超过15秒， 则网络应该出问题了, 可能需要重练
        delete dDict[subtype];
        mbgGame.reconnect(`getLock - ${subtype}`); // 直接断开重连看效果
        return true;
      }
    }
    return dDict[subtype];
  },

  enableLog() {
    if (CC_PREVIEW) return true;
    if (mbgGame.channel_id === 'test' || mbgGame.channel_id === 'mbgTest') {
      return true;
    }
    return false;
  },

  log(...args) {
    if (this.enableLog()) {
      if (cc.sys.isNative) {
        cc.log('MBG', ...args);
      } else {
        console.log(...args);
      }
    }
  },

  warn(...args) {
    if (this.enableLog()) {
      if (cc.sys.isNative) {
        cc.warn('MBG', ...args);
      } else {
        console.warn(...args);
      }
    }
  },

  error(...args) {
    if (this.enableLog()) {
      if (cc.sys.isNative) {
        cc.error('MBG', ...args);
        // const msg = args.join(',');
        // jsb.reflection.callStaticMethod(mbgGame.packageName, "debugAndroid", "(Ljava/lang/String;)V", msg);
      } else {
        console.error(...args);
      }
    }
  },

  errMsg(errCode) {
    const msg = mbgGame.getString(`errcode${errCode}`);
    mbgGame.managerUi.floatMessage(msg);
  },

  drawNodeBound(node) {
    const graphics = node.addComponent(cc.Graphics);
    graphics.lineWidth = 1;
    graphics.strokeColor = cc.Color.RED;
    graphics.rect(0, 0, node.width, node.height);
    graphics.stroke();
  },

  drawNodeWorldBox(re) {
    const node = new cc.Node();
    mbgGame.managerUi.uiLayerWin.addChild(node);
    const graphics = node.addComponent(cc.Graphics);
    graphics.lineWidth = 1;
    graphics.strokeColor = cc.Color.RED;
    graphics.rect(re.x, re.y, re.width, re.height);
    graphics.stroke();
    // console.log('drawNodeWorldBox', mbgGame.managerUi.uiLayerWin.convertToNodeSpaceAR(cc.v2(0, 0)), pos, re);
    node.setPosition(mbgGame.managerUi.uiLayerWin.convertToNodeSpaceAR(cc.v2(0, 0)));
  },

  drawPointBox(pos, length) {
    if (!mbgGame.managerUi.uiLayerWin._nodeDebug) {
      mbgGame.managerUi.uiLayerWin._nodeDebug = new cc.Node();
      mbgGame.managerUi.uiLayerWin.addChild(mbgGame.managerUi.uiLayerWin._nodeDebug);
      mbgGame.managerUi.uiLayerWin._nodeDebug.setContentSize(length, length);
      const graphics = mbgGame.managerUi.uiLayerWin._nodeDebug.addComponent(cc.Graphics);
      graphics.lineWidth = 1;
      graphics.strokeColor = cc.Color.RED;
      graphics.rect(0, 0, length, length);
      graphics.stroke();
    }
    mbgGame.managerUi.uiLayerWin._nodeDebug.setPosition(mbgGame.managerUi.uiLayerWin.convertToNodeSpaceAR(pos));
  },

  drawBox(rect) {
    const node = new cc.Node();
    mbgGame.managerUi.uiLayerWin.addChild(node);
    node.setContentSize(rect.w, rect.h);
    const graphics = node.addComponent(cc.Graphics);
    graphics.lineWidth = 1;
    graphics.strokeColor = cc.Color.RED;
    graphics.rect(rect.x, rect.y, rect.w, rect.h);
    graphics.stroke();
    rect.setPosition(rect.x, rect.y);
  },

  getTips() {
    if (!mbgGame.tipsKeyList) {
      return '';
    }
    return mbgGame.getString(_.sample(mbgGame.tipsKeyList));
  },
  pad(num, size) {
    const s = `000000000${num}`;
    return s.substr(s.length - size);
  },
  pad2(n, width, z) {
    z = z || '0';
    n = `${n}`;
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  },
  // val 单位秒
  transTime(val) {
    const d = Math.floor(Number(val / (60 * 60 * 24)));
    val %= 60 * 60 * 24;
    const h = Math.floor(Number(val / (60 * 60)));
    val %= 60 * 60;
    const m = Math.floor(Number(val / 60));
    val %= 60;
    const s = Math.floor(Number(val));
    let result = '';
    if (d > 0) {
      result += d + this.getString('day');
    }
    if (h > 0) {
      result += h + this.getString('hour');
    }
    if (d < 1 && m !== 0) {
      // 1天内才显示分
      result += m + this.getString('minute');
    }
    if (h < 1 && s !== 0) {
      // 1小时内且不为0才显示秒
      return result + s + this.getString('second');
    }
    return result;
  },
  formatTime(t) {
    const dayBegin = moment({
      hour: 0,
      minute: 0,
      seconds: 0,
    }).unix();
    if (t > dayBegin) {
      // 1天内
      return moment(t * 1000).format('HH:mm');
    }
    return moment(t * 1000).fromNow();
  },
  getChannelID() {
    if (this.isWechatH5()) {
      this.channel_id = 'wechath5'; // 微信h5版本
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.channel_id) {
        mbgGame.channel_id = window.channel_id;
        return;
      }
    }
    if (cc.sys.isNative) {
      if (mbgGame.isIOS()) {
        this.channel_id = jsb.reflection.callStaticMethod('NativeOcClass', 'getChannelID');
      }
      if (mbgGame.isAndroid()) {
        this.channel_id = jsb.reflection.callStaticMethod(this.packageName, 'getChannel', '()Ljava/lang/String;');
      }
    }
    if (mbgGame.isWechatGame()) {
      mbgGame.channel_id = 'wechatgame';
    }
  },

  getRandomInt(min, max) {
    return _.random(min, max);
  },

  getRandomBool() {
    return _.random(0, 100) > 50;
  },

  chooseFromWeight(dataArr, weightkey) {
    let totalWeight = 0;
    if (!dataArr || dataArr.length < 1) {
      return null;
    }
    weightkey = weightkey || 'weight';
    const arr = dataArr.filter((x) => {
      if (x.hasOwnProperty(weightkey) && +x[weightkey] > 0) {
        totalWeight += +x[weightkey];
        return true;
      }
      return false;
    });
    if (arr.length < 1) {
      return null;
    }

    let start = 0;
    let end = 0;
    const rnd = _.random(0, totalWeight - 1);
    for (const n in arr) {
      end = start + +arr[n][weightkey];
      if (rnd >= start && rnd < end) {
        return arr[n];
      }
      start = end;
    }
    return null;
  },

  // 计算大于0的ID数量
  countTeam(charaIDs) {
    let count = 0;
    for (let i = 0; i < charaIDs.length; i++) {
      if (charaIDs[i] > 0) {
        count += 1;
      }
    }
    return count;
  },
  smartByte(n) {
    if (n < 1024) return `${n}`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}K`;
    return `${(n / (1024 * 1024)).toFixed(1)}M`;
  },
  smartNum(n) {
    if (n < 100000) return `${n}`;
    if (n < 1000000) {
      let num = (n / 10000).toFixed(1);
      if (num.charAt(num.length - 1) === '0') {
        num = (n / 10000).toFixed(0);
      }
      return num + this.getString('w');
    }
    if (n < 100000000) {
      return (n / 10000).toFixed(0) + this.getString('w');
    }

    let num = (n / 100000000).toFixed(2);
    if (num.charAt(num.length - 1) === '0') {
      if (num.charAt(num.length - 2) === '0') {
        num = (n / 100000000).toFixed(0);
      } else {
        num = (n / 100000000).toFixed(1);
      }
    }
    return num + this.getString('billion');
  },
  hex2color(hexColor) {
    const hex = hexColor.replace(/^#?/, '0x');
    const c = parseInt(hex);
    const r = c >> 16;
    const g = (65280 & c) >> 8;
    const b = 255 & c;
    return cc.color(r, g, b, 255);
  },
  sendAndroidLocalPush() {
    return;
    if (!cc.sys.isNative) return;
    if (!mbgGame.isAndroid()) return;
    if (mbgGame.logPush) {
      // 安卓下面的本地推送，可以通过转发到服务器，然后由服务器再推
      _.mapKeys(mbgGame.logPush, (t, str) => {
        if (t > 0 && t < 60) return; // 小于1分钟的，就不推了，免得浪费配额
        mbgGame.netCtrl.sendMsg('player.localPush', {
          msg: str,
          time: Math.floor(t),
        });
      });
      delete mbgGame.logPush;
    }
  },
  localPush(t, str) {
    // console.log('localPush', t, str);
    if (!cc.sys.isNative) return;
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'localPush:andInt:', t, str);
      return;
    }
    if (mbgGame.isAndroid()) {
      return;
      // 先把他记录下来
      mbgGame.logPush = mbgGame.logPush || {};
      const lastT = mbgGame.logPush[str];
      mbgGame.logPush[str] = t;
      if (lastT && t === 0) {
        // 还未发送就取消了的推送，直接删除了
        delete mbgGame.logPush[str];
      }
    }
  },
  refresGeo() {
    return;
  },
  buildGeo(location) {
    return;
  },
  getGeo() {
    return;
  },
  calcDistance(sourceGeo, destinationGeo) {
    return;
  },

  /*
    性能评估函数，使用方法
    mbgGame.performanceCheck("xxx", '1', true);
    mbgGame.performanceCheck("xxx", '2');
    mbgGame.performanceCheck("xxx", '3');
  */
  performanceCheck(key, subKey, isStart) {
    let needTime = 0;
    this._performaceTime = this._performaceTime || {};
    if (isStart || !this._performaceTime[key]) {
      console.log(`[PC] ${key} ${subKey} start`);
      this._performaceTime[key] = [['start', +moment()]];
    } else {
      const now = +moment();
      this._performaceTime[key].push([subKey, +moment()]);
      needTime = now - this._performaceTime[key][this._performaceTime[key].length - 2][1];
      const totalTime = now - this._performaceTime[key][0][1];
      if (subKey !== 'nolog') {
        console.log(`[PC] ${key} ${subKey}:${needTime} ms, total:${totalTime} ms`);
      }
      const threshold = (mbgGame.config && mbgGame.config.PCLogThrehold) || 500;
      if (subKey === 'upload' && totalTime >= threshold) {
        mbgGame.player.sendLog(`[PC] ${key} ${subKey}:${needTime} ms, total:${totalTime} ms ${mbgGame.phoneType}`);
      }
    }
    return needTime;
  },
  addBaseWin(uiLayer, prefab, node, script, ...args) {
    // 严禁打开2个相同的名字窗口
    if (uiLayer.getChildByName(node.name)) {
      mbgGame.error('addNormalWin same name', node.name);
      return null;
    }
    mbgGame.performanceCheck(`[baseWin ${script || 'none'}]`, 'begin', true);
    if (script) {
      if (!node.getComponent(script)) {
        mbgGame.error(`没有这个com: ${script}`);
      }
      node._UIScriptName = script;
    }
    const winNode = cc.instantiate(prefab);
    winNode._needMaskBg = true;
    uiLayer.addChild(winNode);
    const winBase = winNode.getComponent('winBase');
    // console.log('addBaseWin:', args);
    winBase.initWin(node, ...args);

    if (mbgGame.managerUi && mbgGame.managerUi.uiLayerWin) {
      const uiLayers = _.sortBy(_.filter(mbgGame.managerUi.uiLayerWin.children, '_needMaskBg'), ['zIndex']);
      for (let i = 0; i < uiLayers.length; i++) {
        const x = uiLayers[i];
        // 最后一个才显示遮罩
        const maskBg = x.getChildByName('maskBg');
        if (!maskBg) continue;
        const maskSprite = maskBg.getComponent(cc.Sprite);
        if (!maskSprite) continue;
        if (i !== uiLayers.length - 1) {
          maskSprite.enabled = false;
        } else {
          maskSprite.enabled = true;
        }
      }
    }
    mbgGame.performanceCheck(`[baseWin ${script || 'none'}]`, 'end');
    return winBase;
  },
  setCache(key, data) {
    this.cache[key] = {
      data,
      t: moment().unix(),
    };
  },
  getCache(key, overTime) {
    const cache = this.cache[key];
    if (!cache) return null;
    if (overTime) {
      // 判断超时
      if (cache.t + overTime < moment().unix()) {
        delete this.cache[key];
        return null;
      }
    }
    return cache.data;
  },
  removeCache(key) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  },

  // 检查是否有缓存，没有就发包拿
  checkNetCache(key, cb, sendData, dontReconnect) {
    if (this.getCache(key)) {
      if (cb) cb();
      return;
    }
    if (mbgGame.getLock('net', key, dontReconnect)) {
      return;
    }
    mbgGame.setLock('net', key);
    mbgGame.netCtrl.sendMsg(key, sendData || {}, (data) => {
      mbgGame.clearLock('net', key);
      if (data.code === 'err' && data.err) {
        mbgGame.managerUi.floatMessage(data.err);
        return;
      }
      if (data.code === 'ok') {
        mbgGame.log('[checkNetCache]', key, data);
        mbgGame.setCache(key, data.data);
        if (cb) cb();
      }
    });
  },
  isRemoteRes() {
    // 需要远程加载资源的版本，包括h5，小游戏版本
    if (CC_PREVIEW) return true;
    if (mbgGame.isWechatGame()) return true;
    if (cc.sys.isBrowser) return true;
    return false;
  },
  isH5() {
    if (this.isWechatGame()) return false;
    if (CC_PREVIEW) return false;
    return this.isRemoteRes();
  },
  isWechatH5() {
    // 微信浏览器跑的h5
    if (
      (cc.sys.browserType === cc.sys.BROWSER_TYPE_WECHAT || cc.sys.browserType === cc.sys.BROWSER_TYPE_MOBILE_QQ) &&
      cc.sys.platform !== cc.sys.WECHAT_GAME
    )
      return true;
    return false;
  },
  isWechatGame() {
    return cc.sys.platform === cc.sys.WECHAT_GAME;
  },
  isIOS() {
    if (!cc.sys.isNative) return false;
    return cc.sys.os === cc.sys.OS_IOS;
  },
  isAndroid() {
    if (!cc.sys.isNative) return false;
    return cc.sys.os === cc.sys.OS_ANDROID;
  },
  deepClone(obj) {
    if (obj == null || typeof obj !== 'object') {
      return obj;
    }

    const temp = new obj.constructor();

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        temp[key] = mbgGame.deepClone(obj[key]);
      }
    }
    return temp;
  },
  playSound(...args) {
    if (!mbgGame.resManager) return;
    mbgGame.resManager.playSound(...args);
  },
  haltSound(...args) {
    if (!mbgGame.resManager) return;
    mbgGame.resManager.haltSound(...args);
  },
  mobileVerify(n) {
    if (n._loadingMobile) return;
    n._loadingMobile = true;
    cc.loader.loadRes('prefabs/mobileVerify', cc.Prefab, (err, prefab) => {
      const node = cc.instantiate(prefab);
      n.addChild(node);
      delete n._loadingMobile;
    });
  },
  goUrl(url, n, w, h) {
    const node = new cc.Node();
    node.name = 'webView';
    const com = node.addComponent(cc.WebView);
    n.addChild(node);
    com.url = url;

    if (w && h) {
      node.setContentSize(w, h);
    } else {
      node.setContentSize(0, 0);
      node.x = -1000;
      node.on(
        'loaded',
        (event) => {
          // console.log('goUrl:', node.destroy());
          node.destroy();
        },
        this,
      );
    }
  },
  httpRequest(url, cb) {
    var xhttp;
    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        cb(this);
      }
    };
    xhttp.open('GET', url, true);
    xhttp.send();
  },
  httpPost(url, data, cb) {
    const formData = new FormData();
    const dataKeys = Object.keys(data);
    for (let i = 0; i < dataKeys.length; i += 1) {
      const key = dataKeys[i];
      formData.append(key, data[key]);
    }
    const xhttp = new XMLHttpRequest();
    xhttp.open('POST', url, true);
    // xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        cb(JSON.parse(this.responseText));
      }
    };
    xhttp.send(formData);
  },
  getUrlParams() {
    const vars = window.location.search.substr(1).split('&');
    const qs = {};
    for (let i = 0; i < vars.length; i += 1) {
      const parts = vars[i].split('=');
      if (parts.length === 2) {
        qs[parts[0]] = parts[1];
      }
    }
    return qs;
  },
  wxh5Pay({ gameId, product_id, subject, game_uuid }) {

  },
  wxh5Auth(needUnionId) {

  },
  wxh5Id() {
    const key = cc.sys.localStorage.getItem('wxh5key');
    if (key) {
      const params = mbgGame.getUrlParams();
      let openid;
      let unionid;
      if (params.token) {
        // 解密
        const token = mbgGame.encryptDecrypt(mbgGame.base64Decode(params.token), key);
        if (token.startsWith('MBG.')) {
          openid = token.substring('MBG.'.length);
        }
      }
      if (params.extra) {
        const extra = mbgGame.encryptDecrypt(mbgGame.base64Decode(params.extra), key);
        if (extra.startsWith('MBG.')) {
          unionid = extra.substring('MBG.'.length);
        }
      }
      cc.sys.localStorage.removeItem('wxh5key');
      return {
        openid,
        unionid,
      };
    }
    cc.sys.localStorage.removeItem('wxh5key');
    return null;
  },
  // 调用
  getWXConfig() {

  },

  // 防沉迷接口
  antiAddictionSetup() {
    const info = '';

    mbgGame._openAddiction = true;
    try {
      if (mbgGame.isAndroid()) {
        return jsb.reflection.callStaticMethod(
          mbgGame.packageName,
          'antiAddictionSetup',
          '(Ljava/lang/String;)I',
          info,
        );
      }
      if (mbgGame.isIOS()) {
        return jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionSetup:', info);
      }
    } catch (e) {
      return 0;
    }
    return 0;
  },

  antiAddictionLogin(params) {
    if (!mbgGame._openAddiction) return;
    const { userid, type = 0 } = params;
    if (mbgGame.isAndroid()) {
      jsb.reflection.callStaticMethod(
        mbgGame.packageName,
        'antiAddictionLogin',
        '(Ljava/lang/String;I)V',
        userid,
        type,
      );
    }
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionLogin:andInt:', userid, type);
    }
  },

  antiAddictionLogout(params) {
    if (mbgGame.isAndroid()) {
      jsb.reflection.callStaticMethod(mbgGame.packageName, 'antiAddictionLogout', '()V');
    }
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionLogout');
    }
  },

  /*
-1 未设置的用户
USER_TYPE_UNKNOWN	0	依赖SDK获取实名信息或第三方获取的信息为未实名
USER_TYPE_CHILD	1	未成年人（8岁以下）
USER_TYPE_TEEN	2	未成年人（8-16岁）
USER_TYPE_YOUNG	3	未成年人（16-17岁）
USER_TYPE_ADULT	4	成年人
  */
  antiAddictionGetUserType(userid) {
    if (mbgGame.isAndroid()) {
      return jsb.reflection.callStaticMethod(
        mbgGame.packageName,
        'antiAddictionGetUserType',
        '(Ljava/lang/String;)I',
        userid,
      );
    }
    if (mbgGame.isIOS()) {
      return jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionGetUserType:', userid);
    }
    return -1;
  },

  antiAddictionOpenRealName(params) {
    if (mbgGame.isAndroid()) {
      jsb.reflection.callStaticMethod(mbgGame.packageName, 'antiAddictionOpenRealName', '()V');
    }
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionOpenRealName');
    }
  },

  antiAddictionPayCheck(price) {
    let ret = 0;
    mbgGame._payPrice = price;
    if (mbgGame.isAndroid()) {
      ret = jsb.reflection.callStaticMethod(mbgGame.packageName, 'antiAddictionPayCheck', '(I)I', price);
    }
    if (mbgGame.isIOS()) {
      ret = jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionPayCheck:', price);
    }
    return ret;
  },

  antiAddictionPayLog() {
    if (!mbgGame._openAddiction) return;
    if (!mbgGame._payPrice) return;
    if (mbgGame.isAndroid()) {
      jsb.reflection.callStaticMethod(mbgGame.packageName, 'antiAddictionPayLog', '(I)V', mbgGame._payPrice);
    }
    if (mbgGame.isIOS()) {
      jsb.reflection.callStaticMethod('NativeOcClass', 'antiAddictionPayLog:', mbgGame._payPrice);
    }
    delete mbgGame._payPrice;
  },

  // 底层回调
  antiAddictionResult(code, msg) {
    mbgGame.log('antiAddictionResult', code, msg);
    switch (code) {
      default:
        break;
      case 500: {
        // 登录通过
        break;
      }
      case 1010:
      case 1500: {
        // 1010 实名成功，仅当游戏主动调用 openRealName 方法时，如果成功会触发
        // 1500 用户类型变更，通过SDK完成实名会触发
        const aat = mbgGame.antiAddictionGetUserType(mbgGame.state.uuid);

        mbgGame.netCtrl.sendMsg('player.antiAddiction', {
          aat,
        });
        break;
      }
      case 1015: {
        // 实名失败，仅用游戏主动调用 openRealName 方法时，如果用户取消会触发
        break;
      }
      case 1020: {
        // 付费不受限，sdk检查用户付费无限制时触发
        if (mbgGame._iosBuyItemData) {
          mbgGame.IAP.buyProduct(mbgGame._iosBuyItemData);
          delete mbgGame._iosBuyItemData;
          return;
        }
        if (mbgGame._uiNode && mbgGame._uiNode.isValid) {
          mbgGame._uiNode.active = true;
        }
        delete mbgGame._uiNode;
        break;
      }
      case 1025: {
        // 	付费受限，付费受限触发,包括游客未实名或付费额达到限制等
        delete mbgGame._uiNode;
        break;
      }
      case 1030: {
        // 时间受限，未成年人或游客游戏时长已达限制，通知游戏
        // 底层会弹窗
        break;
      }
      case 1060: {
        // 打开实名窗口，需要游戏通过其他方式完成用户实名时触发
        break;
      }
      case 2000: {
        // 额外弹窗显示，当用户操作触发额外窗口显示时通知游戏
        // 弹窗
        break;
      }
    }
  },
};

if (cc.sys.isNative) {
  if (!global.mbgGame) {
    global.mbgGame = mbgGame;
  }
} else if (!window.mbgGame) {
  window.mbgGame = mbgGame;
}

if (cc.sys.isNative) {
  let __handler;
  if (window['__errorHandler']) {
    __handler = window['__errorHandler'];
  }
  window['__errorHandler'] = function (...args) {
    // mbgGame.player.sendLog('JS错误', ...args);
    handleError(...args);
    if (__handler) {
      __handler(...args);
    }
  };
}
/*
if (cc.sys.isBrowser) {
  let __handler;
  if (window.onerror) {
    __handler = window.onerror
  }
  window.onerror = function (...args) {
    // mbgGame.player.sendLog('JS错误', ...args);
    handleError(...args)
    if (__handler) {
      __handler(...args)
    }
  }
  
}
*/

mbgGame.packageName = 'yourgamepackagename/AppActivity';
mbgGame.getChannelID();
window.mbgGame = mbgGame;
module.exports = mbgGame;
