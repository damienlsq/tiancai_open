const syncLoader = require('RESLoader');
// 资源管理类
cc.Class({
  extends: cc.Component,

  properties: {

  },

  // use this for initialization
  onLoad() {
    mbgGame.resManager = this;
    this.musics = {};
    this.sounds = {};
  },
  loadPrefab(name, cb) {
    // 防止过快连续点击打开界面
    if (mbgGame.getLock('ui', name)) {
      return;
    }
    mbgGame.setLock('ui', name);
    syncLoader.addTask(name, {
      path: 'prefabs',
      type: cc.Prefab,
      instant: true,
      onComplete: (prefab) => {
        if (cb) {
          cb(prefab);
        }
        mbgGame.clearLock('ui', name);
      },
    });
  },
  getOrLoadSpineData(name, cb) {
    const d = cc.loader.getRes(`spine/${name}`, sp.SkeletonData);
    if (d) {
      cb(d);
      return;
    }
    if (!this.loadingSpineCB) {
      this.loadingSpineCB = {};
    }
    if (!this.loadingSpineCB[name]) {
      this.loadingSpineCB[name] = [];
    }
    this.loadingSpineCB[name].push(cb);
    if (this.loadingSpineCB[name].length > 1) {
      return;
    }
    // mbgGame.log("[getOrLoadSpineData] name:", name);
    syncLoader.addTask(name, {
      path: 'spine',
      type: sp.SkeletonData,
      instant: true,
      onComplete: (obj) => {
        const lstCB = this.loadingSpineCB[name];
        delete this.loadingSpineCB[name];
        for (let i = 0; i < lstCB.length; i++) {
          lstCB[i](obj);
        }
      },
    });
  },
  getSpineData(name, spineCtrl) {
    this.getOrLoadSpineData(name, (spineData) => {
      if (spineData && this.isValidSpineCtrl(spineCtrl)) {
        spineCtrl.setSpineData(spineData, (name !== "charasleep" && name.startsWith('chara')) ? 'skin_1' : null);
      }
    });
  },
  isValidSpineCtrl(spineCtrl) {
    if (!spineCtrl || !cc.isValid(spineCtrl) || !cc.isValid(spineCtrl.node)) {
      return false;
    }
    return true;
  },
  // 暂时强制把音量改为0，这样就可以不修改播放系统的逻辑
  pauseAudio() {
    mbgGame.pauseMusicFlag = true;
    this.updateVolume();
  },
  resumeAudio() {
    delete mbgGame.pauseMusicFlag;
    this.updateVolume();
  },
  playSound(name, type) {
    if (mbgGame.setup.sound === 0) {
      return;
    }
    this.loadSound(name, () => {
      let vol = 0.1;
      if (mbgGame.setup.sound === 2) {
        vol = 0.2;
      } else if (mbgGame.setup.sound === 3) {
        vol = 0.5;
      }
      if (type === 1) { // 播放类型1，打断上一个音频，重新播
        this.haltSound(name);
      } else if (type === 2) { // 播放类型2，上一个音频如果还在播放中，就什么都不做，return
        if (this.sounds[name].id && cc.audioEngine.getState(this.sounds[name].id) === cc.audioEngine.AudioState.PLAYING) {
          return;
        }
      }
      this.sounds[name].id = cc.audioEngine.play(this.sounds[name].audio, false, vol);
    });
  },
  haltSound(name) {
    if (!this.sounds || !this.sounds[name]) {
      return;
    }
    if (this.sounds[name].id != null) {
      cc.audioEngine.stop(this.sounds[name].id);
      delete this.sounds[name].id;
    }
  },
  loadSound(name, cb) {
    if (this.sounds[name]) {
      cb();
      return;
    }
    syncLoader.addTask(name, {
      path: 'audio',
      type: cc.AudioClip,
      onComplete: (obj) => {
        if (obj) {
          this.sounds[name] = this.sounds[name] || {};
          this.sounds[name].audio = obj;
        }
        cb();
      },
    });
  },
  playMusic(name, isSoftMode) {
    // mbgGame.warn("[playMusic]", name);
    this.nextMusic = [name, isSoftMode]; // 防止异步问题
    this.loadMusic(name, () => {
      if (!this.nextMusic) {
        // mbgGame.warn("[playMusic] !self.nextMusic", name);
        return;
      }
      const [_name, _isSoftMode] = this.nextMusic;
      if (name !== _name) { // load完后已经不是要播放这个音乐了
        // mbgGame.warn("[playMusic] name !== _name", name, _name);
        return;
      }
      delete this.nextMusic;
      this._playMusic(_name, _isSoftMode);
    });
  },
  getPlayingMusic() {
    const playingList = [];
    _.mapKeys(this.musics, (value, _name) => {
      // mbgGame.log("getPlayingMusic _name", _name, value.id, value.fadeOut);
      if (value.id != null && value.loop && !value.fadeOut) {
        playingList.push(_name);
      }
    });
    if (playingList.length > 1) {
      for (let i = 1; i < playingList.length; i++) {
        const name = playingList[i];
        this.stopMusic(name);
      }
    }
    return playingList[0];
  },
  _playMusic(name, isSoftMode) {
    const playing = this.getPlayingMusic();
    // mbgGame.warn("[_playMusic]", name);
    // mbgGame.log('_playMusic', name, playing, isSoftMode, JSON.stringify(this.musics));
    if (playing) {
      // 有正在播放的音乐
      // 没有换音乐
      if (playing === name) {
        // mbgGame.warn("[_playMusic] 1", name);
        return;
      }
      if (isSoftMode) {
        this.fadeOutMusic(playing);
      } else {
        // 不是softMode就停止所有音乐
        this.stopMusic();
      }
    }

    // 未缓存
    if (!this.hasMusic(name)) {
      mbgGame.error("[_playMusic] no music", name);
      return;
    }
    if (this.musics[name].id != null) {
      // 如果已经有一首同名在播，不能开第二首
      if (!this.musics[name].loop) {
        this.stopMusic(name);
      } else {
        if (isSoftMode) {
          this.fadeInMusic(name);
        }
        mbgGame.warn("[_playMusic] 2", name);
        return;
      }
    }
    this.musics[name].id = cc.audioEngine.play(this.musics[name].audio,
      this.musics[name].loop,
      isSoftMode ? 0 : this.getSetupVolume());

    if (isSoftMode) {
      this.fadeInMusic(name);
    }
    cc.warn("[_playMusic] ok", name);
  },
  stopMusic(name) {
    _.mapKeys(this.musics, (value, key) => {
      if (!name) {
        if (value.id != null) {
          this.haltVolAction(key);
          // mbgGame.log("stopMusic1 ", value.id, name);
          cc.audioEngine.stop(value.id);
          delete value.id;
        }
        delete value.fadeOut;
      } else if (key === name) {
        if (value.id != null) {
          this.haltVolAction(key);
          // mbgGame.log("stopMusic2 ", value.id, name);
          cc.audioEngine.stop(value.id);
          delete value.id;
          delete value.fadeOut;
        }
      }
    });
  },
  getSetupVolume() {
    if (mbgGame.pauseMusicFlag) {
      return 0;
    }
    let vol = 0.1;
    if (mbgGame.setup.music === 2) {
      vol = 0.2;
    } else if (mbgGame.setup.music === 3) {
      vol = 0.5;
    } else if (mbgGame.setup.music === 0) {
      vol = 0;
    }
    return vol;
  },
  updateVolume() {
    const name = this.getPlayingMusic();
    if (!name || !this.hasMusic(name)) {
      return;
    }
    const id = this.musics[name].id;
    cc.audioEngine.setVolume(+id, this.getSetupVolume());
  },
  haltAllVolAction() {
    _.mapKeys(this.musics, (value, name) => {
      this.haltVolAction(name);
    });
  },
  haltVolAction(name) {
    const a = this.musics[name].volAction;
    if (a) {
      if (!a.isDone()) {
        this.node.stopAction(a);
      }
      delete this.musics[name].volAction;
    }
  },
  fadeOutMusic(name) {
    // mbgGame.log("fadeOutMusic", name);
    if (!this.musics[name].loop) return; // 不是循环播放的音乐无需要处理音量
    let id = this.musics[name].id;
    if (id == null) return;
    id = +id;
    this.musics[name].fadeOut = 1;
    if (cc.audioEngine.getVolume(id) <= 0) {
      //  mbgGame.log("fadeOutMusic 2", name);
      delete this.musics[name].fadeOut;
      return;
    }
    this.haltVolAction(name);
    this.musics[name].volAction = this.node.runAction(cc.repeat(cc.sequence(cc.delayTime(0.1), cc.callFunc(() => {
      let myId = this.musics[name].id;
      if (myId == null) return;
      myId = +myId;
      let vol = cc.audioEngine.getVolume(myId);
      const maxVol = this.getSetupVolume();
      vol -= maxVol / 10;
      if (vol <= 0) {
        cc.audioEngine.stop(myId);
        // mbgGame.log("fadeOutMusic 2", name);
        delete this.musics[name].fadeOut;
        delete this.musics[name].id;
      } else {
        cc.audioEngine.setVolume(myId, vol);
      }
    }, this)), 10));
  },
  fadeInMusic(name) {
    if (!this.musics[name].loop) return; // 不是循环播放的音乐无需要处理音量
    let id = this.musics[name].id;
    delete this.musics[name].fadeOut;
    if (id == null) return;
    id = +id;
    if (cc.audioEngine.getVolume(id) >= this.getSetupVolume()) {
      cc.audioEngine.setVolume(id, this.getSetupVolume());
      return; // 已经够大声，无需要
    }
    this.haltVolAction(name);
    this.musics[name].volAction = this.node.runAction(cc.repeat(cc.sequence(cc.delayTime(0.1), cc.callFunc(() => {
      let myId = this.musics[name].id;
      if (myId == null) return;
      myId = +myId;
      let vol = cc.audioEngine.getVolume(myId);
      const maxVol = this.getSetupVolume();
      if (vol < 0) {
        vol = 0;
      }
      vol += maxVol / 10;
      if (vol >= maxVol) {
        vol = maxVol;
      }
      cc.audioEngine.setVolume(myId, vol);
    }, this)), 10));
  },
  hasMusic(name) {
    return this.musics[name] != null;
  },
  loadMusic(name, cb) {
    if (this.hasMusic(name)) {
      if (cb) cb();
      return;
    }
    syncLoader.addTask(name, {
      path: 'audio',
      type: cc.AudioClip,
      onComplete: (obj) => {
        this.loadMusicCB(name, obj);
        if (cb) cb();
      },
    });
  },
  loadMusicCB(name, obj) {
    if (obj) {
      this.musics[name] = this.musics[name] || {};
      this.musics[name].audio = obj;
      this.musics[name].loop = true;
      if (['battleLose', 'battleWin'].indexOf(name) !== -1) {
        this.musics[name].loop = false;
      }
    }
  },
  setAutoAtlasFrame(obj, autoAtlas, frameName) {
    return mbgGame.loader.loadAtlasFrame(obj, frameName);
  },
  // 不打包的图片资源
  setImageFrame(obj, path, frameName, completeCB) {
    return mbgGame.loader.loadImage(obj, frameName, completeCB);
  },
});