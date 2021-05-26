// /////////////////////////////
// /     各类排行榜 （主要提供后台统计使用）
// /////////////////////////////
const rankType = [
  'diamonds',
  'coins',
  'winRate',
  'curWinStreak',
  'winStreak',
  'curAllWinTimesA',
  'AllWinTimesA',
  'curAllWinTimesP',
  'AllWinTimesP',
  'raid1',
  'raid2',
  'raid3',
  'raid4',
  'raid5',
  'raid6',
  'raid7',
  'raid8',
  'raid9',
  'raid10',
];


const rankList = mbgGame.common.db_mgr.CSortedSet.extend({
  // tc_ranklist_z_${SubType}   全部玩家zset，用来做排行榜
  // member uuid
  // score 积分
  FuncType: "ranklist",
  // SubType: "",
  * setScore(type, uuid, score) {
    if (rankType.indexOf(type) === -1) {
      mbgGame.logError(`[rankList] no type:${type}`);
      return;
    }
    if (!score || +score <= 0) {
      return;
    }
    score = parseInt(score);
    this.SubType = type;
    yield this.zadd(score, uuid);

    // 只保留200个数据
    // yield this.DB().zremrangebyrank(this.key(),100,-1);
  },
  * removeScore(type, uuid) {
    this.SubType = type;
    yield this.zrem(uuid);
  },
  * incrScore(type, uuid, scoreAdd) {
    if (rankType.indexOf(type) === -1) {
      return "err1";
    }
    if (!scoreAdd || +scoreAdd <= 0) {
      return "err2";
    }
    scoreAdd = parseInt(scoreAdd);
    this.SubType = type;
    return yield this.zincrby(scoreAdd, uuid);
  },
  * cleanRankData(uuid) {
    for (let i = 0; i < rankType.length; i++) {
      yield this.removeScore(rankType[i], uuid);
    }
  },
  * getScore(type, uuid) {
    this.SubType = type;
    const score = yield this.zscore(uuid);
    return score;
  },
  getScoreMulti(type, uuid) {
    this.SubType = type;
    this.zscore(uuid);
  },
});

module.exports = {
  rankList,
};