const warDefines = require('warDefines');

cc.Class({
  extends: cc.Component,

  properties: {
    gradeNameLabel: cc.Label,
    icon: cc.Sprite,
    scoreLabel: cc.Label,
    scoreBar: cc.ProgressBar,
    chestBtn: cc.Node,
    protectLine: cc.Node,
    protectIcon: cc.Node,
    protectScoreLabel: cc.Label,
    // 新
    titleSp: cc.Sprite,
    gradePreLayout: cc.Node,
    gradeNextLayout: cc.Node,
    gradePreSp: cc.Sprite,
    gradeCurSp: cc.Sprite,
    gradeNextSp: cc.Sprite,
    gradeScorePre: cc.Label,
    gradeScoreCur: cc.Label,
    gradeScoreNext: cc.Label,
    gradeScoreMid: cc.Label,
    myScoreCur: cc.Label,
    barLeft: cc.ProgressBar,
    barRight: cc.ProgressBar,
    barLeftNoUse: cc.Node,
    barRightNoUse: cc.Node,
  },
  onLoad() {

  },
  refreshGradeInfo() {
    const arenaKConfig = mbgGame.config.arenaKConfig;
    const curGrade = mbgGame.player.getPVPGrade();
    const curScore = mbgGame.player.getPVPScore();
    const epoch = warDefines.calEpoch(curGrade);
    this.myScoreCur.string = curScore;
    mbgGame.resManager.setImageFrame(this.titleSp, 'images', `pvptitle${epoch}`);
    if (curGrade - 1 === 0) {
      this.gradePreLayout.active = false;
    } else {
      this.gradePreLayout.active = true;
      mbgGame.resManager.setImageFrame(this.gradePreSp, 'images', `pvpgrade${curGrade - 1}`);
      const dConfig = arenaKConfig[curGrade - 1];
      const scoreRange = dConfig.scoreRange;
      this.barLeft.progress = Math.min(100,
        (curScore - scoreRange[0]) / (scoreRange[1] - scoreRange[0]));
      this.gradeScorePre.string = scoreRange[0];
      this.gradeScoreMid.string = (scoreRange[1] + scoreRange[0]) / 2;
      this.barLeftNoUse.active = curGrade > 2;
    }

    mbgGame.resManager.setImageFrame(this.gradeCurSp, 'images', `pvpgrade${curGrade}`);
    const dConfig = arenaKConfig[curGrade];
    const scoreRange = dConfig.scoreRange;
    this.barRight.progress = Math.min(100,
      (curScore - scoreRange[0]) / (scoreRange[1] - scoreRange[0]));
    this.gradeScoreCur.string = scoreRange[0];

    if (curGrade + 1 > 21) {
      this.gradeNextLayout.active = false;
    } else {
      this.gradeNextLayout.active = true;
      mbgGame.resManager.setImageFrame(this.gradeNextSp, 'images', `pvpgrade${curGrade + 1}`);
      const dNextConfig = arenaKConfig[curGrade + 1];
      const nextScoreRange = dNextConfig.scoreRange;
      this.gradeScoreNext.string = nextScoreRange[0];
      this.barRightNoUse.active = curGrade < 20;
    }
  },
});
