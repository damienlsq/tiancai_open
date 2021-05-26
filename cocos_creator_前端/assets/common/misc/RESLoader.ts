const { ccclass, property } = cc._decorator;
var _instance = null;

@ccclass
export default class RESLoader {

  // 下载任务
  tasks = [];

  maxLoader = 3; // 最多同时运行的loader数量,最小不能低于3个
  nowLoader = 0; // 正在运行的loader

  setMaxLoader(maxLoader) {
    if (maxLoader < 3) {
      mbgGame.warn("maxLoader must bigger than 3")
      return;
    }
    this.maxLoader = maxLoader;
  }

  checkTask() {
    let count = this.maxLoader - this.nowLoader;
    while (count--) {
      // 有多少队列剩就开多少个
      // 找出一个优先级高的需求
      const task = this.tasks.shift();
      if (task) {
        this.loadTask(task);
      } else {
        return;
      }
    }
  }

  loadTask(task) {
    // 开始加载资源
    this.nowLoader += 1;
    // mbgGame.log(`开始下载${task.url} ${this.nowLoader}`);
    cc.loader.loadRes(task.url, task.type,
      (completedCount, totalCount, item) => {
        if (task.onProgress) {
          task.onProgress(completedCount, totalCount, item);
        }
      },
      (err, res) => {
        this.nowLoader -= 1;
        if (task.onProgress) {
          task.onProgress();
        }
        if (err) {
          mbgGame.error(`加载失败 ${task.url} ${err}`);
        } else if (res && task.onComplete) {
          task.onComplete(res);
          // mbgGame.log(`加载完成 ${task.url}`);
        }
        this.checkTask(); // 下载完成，检查有没有新的加载任务
      });
  }

  async addTask(name, {
    type = null, // 资源类别
    path = '', // 资源路径
    onProgress = null, // 进度控制回调函数
    onComplete = null,
    instant = false,  // 立即下载
    recycle = false,  // 这个资源可以释放
  } = {}) {
    let res;
    let url = path ? `${path}/${name}` : name;
    if (type) {
      res = cc.loader.getRes(url, type);
    } else {
      res = cc.loader.getRes(url);
    }
    if (res) {
      // 直接有资源了
      if (onComplete) {
        onComplete(res);
      }
      return;
    }
    // 加入队列
    const task = {
      url,
      type,
      onProgress,
      onComplete,
    };
    if (instant) {
      // 插前面
      this.tasks.unshift(task);
    } else {
      // 插后面
      this.tasks.push(task);
    }
    // mbgGame.log('进入下载队列');
    this.checkTask();
  }

  asynLoad(url, type) {
    return new Promise((resolve, reject) => {
      cc.loader.loadRes(url, type, (err, res) => {
        if (err) {
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
  }

  async syncLoadRes(url, type, paths, onComplete) { //同步加载资源,在几个目录中查找
    for (let i = 0; i < paths.length; i++) {
      var res = await this.asynLoad(`${paths[i]}/${url}`, type);
      if (res) {
        if (onComplete) {
          onComplete(res);
        }
        return;
      }
    }
    mbgGame.error(`syncLoadRes not found res ${url}`);
  }

  static getInstance() {
    if (!_instance) {
      _instance = new RESLoader();
      if (_instance.maxLoader < 3) {
        mbgGame.log("RESLoader.maxLoader = %d 不能低于3个");
        _instance.maxLoader = 3;
      }
    }
    return _instance;
  }
}

module.exports = RESLoader.getInstance();

