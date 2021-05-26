const mbgGame = require('mbgGame');
const syncLoader = require('RESLoader');

const loader = {
  // [ 资源id， 资源目录， 资源类型， 是否一定要加载完成， 加载完成后回调 ]
  autoAtlas: ['uiBase', 'uiIcon', 'uiClear', 'labIcon', 'itemsIcon', 'flagIcon'], // 自动图集名字列表
  preloadList: [
    ['uiBase', 'uiBase', cc.SpriteAtlas, true],
    ['uiIcon', 'uiIcon', cc.SpriteAtlas, true],
    ['labIcon', 'labIcon', cc.SpriteAtlas, true],

    ['number', 'prefabs', cc.Prefab, true],
    ['fighter', 'prefabs', cc.Prefab, true],
    ['floorCharacter', 'prefabs', cc.Prefab, true],
    ['panelSquare', 'prefabs', cc.Prefab, true],
    ['panelLab', 'prefabs', cc.Prefab, true],
    ['gameLayer', 'prefabs', cc.Prefab, true],
    ['winFull', 'prefabs', cc.Prefab, true],
    ['panelSchemeTeamEditor', 'prefabs', cc.Prefab, true],
    ['winResult', 'prefabs', cc.Prefab, true],
    ['chara1', 'spine', sp.SkeletonData, true],
    ['chara2', 'spine', sp.SkeletonData, true],
    ['monster1026', 'spine', sp.SkeletonData, true],
    ['monster1024', 'spine', sp.SkeletonData, true],
    ['monster1025', 'spine', sp.SkeletonData, true],
    ['monster2001', 'spine', sp.SkeletonData, true], // 主持人
    ['arena_1', 'images', cc.SpriteFrame, true],
    // 优先下载的排前面

    ['monster2001', 'spine', sp.SkeletonData, false], // 胡十三
    ['panelStory', 'prefabs', cc.Prefab, false],
    ['panelCharacters', 'prefabs', cc.Prefab, false],

    ['uiClear', 'uiClear', cc.SpriteAtlas, false, (res) => {
      const texture = res.getTexture();
      if (texture) {
        const Filter = cc.Texture2D.Filter;
        texture.setFilters(Filter.LINEAR, Filter.LINEAR)
      }
    }],
    ['itemsIcon', 'itemsIcon', cc.SpriteAtlas, false],
    ['flagIcon', 'flagIcon', cc.SpriteAtlas, false],

    ['10003_0', 'images', cc.SpriteFrame, false],
    ['winNormal', 'prefabs', cc.Prefab, false],
    ['winTiny', 'prefabs', cc.Prefab, false],
    ['winNoFrame', 'prefabs', cc.Prefab, false],

    ['panelClan', 'prefabs', cc.Prefab, false],
    ['panelShop', 'prefabs', cc.Prefab, false],

    ['chara3', 'spine', sp.SkeletonData, false],
    ['chara4', 'spine', sp.SkeletonData, false],
    ['chara5', 'spine', sp.SkeletonData, false],
    ['chara6', 'spine', sp.SkeletonData, false],
    ['chara7', 'spine', sp.SkeletonData, false],
    ['chara8', 'spine', sp.SkeletonData, false],
    ['chara9', 'spine', sp.SkeletonData, false],
    ['chara10', 'spine', sp.SkeletonData, false],
    ['chara11', 'spine', sp.SkeletonData, false],
    ['chara12', 'spine', sp.SkeletonData, false],
    ['chara13', 'spine', sp.SkeletonData, false],
    ['chara14', 'spine', sp.SkeletonData, false],
    ['chara15', 'spine', sp.SkeletonData, false],
  ],
  chechNeedResOK() {
    for (let i = 0; i < this.preloadList.length; i++) {
      const [name, path, type, needCheck] = this.preloadList[i];
      if (mbgGame.isRemoteRes()) {
        // 如果是网页模式，不需要强制加载false的
        if (!needCheck) continue;
      }
      // native下面，上面的都需要加载后才能跑
      if (!cc.loader.getRes(`${path}/${name}`, type)) {
        return false;
      }
    }
    return true;
  },
  preloadRes() {
    for (let i = 0; i < this.preloadList.length; i++) {
      const [name, path, type, instant, cb] = this.preloadList[i];
      syncLoader.addTask(name, {
        path,
        type,
        instant,
        onComplete: (res) => {
          if (cb) cb(res);
          mbgGame.preloadRes[name] = res;
        },
      });
    }
  },
  setFrame(obj, frame) {
    if (!frame || !obj || !obj.isValid) return;
    if (obj instanceof cc.Sprite) {
      obj.spriteFrame = frame;
    } else if (obj instanceof cc.SpriteFrame) {
      obj = frame;
    } else if (obj instanceof cc.Button) {
      obj.normalSprite = frame;
      obj.pressedSprite = frame;
      obj.hoverSprite = frame;
      obj.disabledSprite = frame;
    } else {
      const sprite = obj.getComponent(cc.Sprite);
      if (!sprite) return;
      sprite.spriteFrame = frame;
    }
  },
  loadAtlasFrame(obj, name) {
    let spriteFrame;
    if (CC_PREVIEW) {
      // 预览模式不支持自动图集，多个目录中查找图片
      syncLoader.syncLoadRes(name, cc.SpriteFrame, this.autoAtlas,
        (res) => {
          this.setFrame(obj, res);
        });
      return;
    }

    for (let i = 0; i < this.autoAtlas.length; i++) {
      const spriteUrl = `${this.autoAtlas[i]}/${name}`;
      spriteFrame = cc.loader.getRes(spriteUrl, cc.SpriteFrame);
      /*
      const atlasUrl = `${this.autoAtlas[i]}/${this.autoAtlas[i]}`;
      if (CC_PREVIEW) {
        // 预览模式不支持自动图集
        spriteFrame = cc.loader.getRes(spriteUrl, cc.SpriteFrame);
      } else {
        // 1.10版本可以直接getRes图集的spriteframe
        spriteFrame = cc.loader.getRes(spriteUrl, cc.SpriteFrame);
        
        const atlas = cc.loader.getRes(atlasUrl, cc.SpriteAtlas);
        mbgGame.log('loadAtlasFrame atlas:', name, atlasUrl);
        if (atlas) {
          spriteFrame = atlas.getSpriteFrame(name);
          mbgGame.log('loadAtlasFrame spriteFrame:', name, atlasUrl, spriteFrame,
          _.keys(atlas._spriteFrames).join(','));
        } else {
          // 加载自动图集
          syncLoader.addTask(this.autoAtlas[i], {
            path: this.autoAtlas[i],
            type: cc.SpriteAtlas,
            onComplete: (res) => {
              if (res instanceof cc.SpriteAtlas) {
                // 加载完在检查一次
                this.loadAtlasFrame(obj, name);
              }
            },
          });
          return;
        }
      }
      */
      if (spriteFrame) {
        // 已经找到了
        break;
      }
    }
    if (spriteFrame) {
      this.setFrame(obj, spriteFrame);
    }
  },
  loadImage(obj, name, completeCB) {
    const spriteUrl = `images/${name}`;
    const spriteFrame = cc.loader.getRes(spriteUrl, cc.SpriteFrame);
    if (spriteFrame) {
      this.setFrame(obj, spriteFrame);
      if (completeCB) completeCB();
      return;
    }

    syncLoader.addTask(name, {
      path: 'images',
      type: cc.SpriteFrame,
      onComplete: (res) => {
        if (res instanceof cc.SpriteFrame) {
          this.setFrame(obj, res);
          if (completeCB) completeCB();
        }
      },
    });
  },
};

mbgGame.loader = loader;