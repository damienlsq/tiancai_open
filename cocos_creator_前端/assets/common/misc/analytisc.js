// 统计相关
mbgGame.analytisc = {
  checkInvalid(key) {
    if (!mbgGame.isRemoteRes()) {
      return true;
    }

    if (mbgGame.config.invalidAnalytiscAll) return true;
    if (key && mbgGame.config.invalidAnalytisc && mbgGame.config.invalidAnalytisc[key]) {
      return true;
    }

    return false;
  },

  startLevel(level) {
    return;
  },
  finishLevel(level) {
    return;
  },
  failLevel(level) {
    return;
  },
  buy(name, price) {
    return;
  },
  pay(value, price) {
    return;
  },
  login() {
    return;
  },

  setLevel(lvl) {
    return;
  },

  event(e) {
    return;
  },

  testMe() {
    return;
  },
};
