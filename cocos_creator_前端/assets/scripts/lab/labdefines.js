const FacID = {
  // : 1, // 时空隧道
  clan: 2, // 公会
  collector1: 3,
  collector2: 4,
  collector3: 5,
  gym1: 11, // 贪吃蛇
  gym2: 12, // 拳击机
  gym3: 13, // 打砖块
  gym4: 14, // 砸锤机
  gym5: 15, // 打鸭子
  gym6: 16, // 小蜜蜂
  read1: 21,
  read2: 22,
  read3: 23,
};

// 顺序在显示工作中的动画效果有用，同时只有最上面的一个会有工作中动画
const FloorType = {
  Hall: 1,
  Chest: 2,
  Talent: 3,
  Col: 4,
  Read: 5,
  Gym1: 6,
  Gym2: 7,
  Gym3: 8,
  Gym: 100, // 因为有3个健身楼层，用这个指代这3个楼层

  // 地下室
  Achieve: 20,
  Story: 21,
  Character: 22,
  Clan: 23,
  Design: 24,

  Build: 25,
};

const AllFloorTypes = [];
for (const k in FloorType) {
  AllFloorTypes.push(FloorType[k]);
}

FloorType.Gym = 100; // 因为有3个健身楼层，用这个指代这3个楼层

const FloorType2FacIDs = {};
FloorType2FacIDs[FloorType.Hall] = []; // 大堂
FloorType2FacIDs[FloorType.Chest] = []; // 宝箱
FloorType2FacIDs[FloorType.Talent] = []; // 天才研究室
FloorType2FacIDs[FloorType.Col] = [FacID.collector1, FacID.collector2, FacID.collector3]; // 收集器
FloorType2FacIDs[FloorType.Read] = [FacID.read1, FacID.read2, FacID.read3];
FloorType2FacIDs[FloorType.Gym1] = [FacID.gym3, FacID.gym5];
FloorType2FacIDs[FloorType.Gym2] = [FacID.gym2, FacID.gym4];
FloorType2FacIDs[FloorType.Gym3] = [FacID.gym1, FacID.gym6];
FloorType2FacIDs[FloorType.Gym] = [FacID.gym3, FacID.gym5, FacID.gym2, FacID.gym4, FacID.gym1, FacID.gym6];


const FacIDList = [];
for (const k in FacID) {
  FacIDList.push(FacID[k]);
}

const GymFacIDs = [
  FacID.gym3,
  FacID.gym5,
  FacID.gym2,
  FacID.gym4,
  FacID.gym1,
  FacID.gym6,
];

const CollectorFacIDs = [
  FacID.collector1,
  FacID.collector2,
  FacID.collector3,
];


const ReadFacIDs = [
  FacID.read1,
  FacID.read2,
  FacID.read3,
];


const FacType = {
  Gym: 1,
  Collector: 2,
  Read: 3,
};

const FacID2Type = {};
const FacID2FloorType = {};
const FacID2ConfigPrefix = {};

for (let i = 0; i < CollectorFacIDs.length; i++) {
  FacID2ConfigPrefix[CollectorFacIDs[i]] = "collector";
  FacID2Type[CollectorFacIDs[i]] = FacType.Collector;
  FacID2FloorType[CollectorFacIDs[i]] = FloorType.Col;
}

for (let i = 0; i < ReadFacIDs.length; i++) {
  FacID2ConfigPrefix[ReadFacIDs[i]] = "read";
  FacID2Type[ReadFacIDs[i]] = FacType.Read;
  FacID2FloorType[ReadFacIDs[i]] = FloorType.Read;
}

for (let i = 0; i < GymFacIDs.length; i++) {
  FacID2ConfigPrefix[GymFacIDs[i]] = "gym";
  FacID2Type[GymFacIDs[i]] = FacType.Gym;
}

FacID2FloorType[FacID.gym3] = FloorType.Gym1;
FacID2FloorType[FacID.gym5] = FloorType.Gym1;
FacID2FloorType[FacID.gym2] = FloorType.Gym2;
FacID2FloorType[FacID.gym4] = FloorType.Gym2;
FacID2FloorType[FacID.gym1] = FloorType.Gym3;
FacID2FloorType[FacID.gym6] = FloorType.Gym3;


const FloorID2FloorComName = {};
FloorID2FloorComName[0] = "build";
FloorID2FloorComName[FacID.collector1] = "collectorFloorPanel";
FloorID2FloorComName[FacID.collector2] = "collectorFloorPanel";
FloorID2FloorComName[FacID.collector3] = "collectorFloorPanel";
FloorID2FloorComName[FacID.gym1] = "gymFloorPanel";
FloorID2FloorComName[FacID.gym2] = "gymFloorPanel";
FloorID2FloorComName[FacID.gym3] = "gymFloorPanel";
FloorID2FloorComName[FacID.gym4] = "gymFloorPanel";
FloorID2FloorComName[FacID.gym5] = "gymFloorPanel";
FloorID2FloorComName[FacID.gym6] = "gymFloorPanel";
FloorID2FloorComName[FacID.read1] = "readFloorPanel";
FloorID2FloorComName[FacID.read2] = "readFloorPanel";
FloorID2FloorComName[FacID.read3] = "readFloorPanel";

const ColFacID2worldIdx = {};
ColFacID2worldIdx[FacID.collector1] = 1;
ColFacID2worldIdx[FacID.collector2] = 2;
ColFacID2worldIdx[FacID.collector3] = 3;


// 设施ID对应的位置编号，用来定位站人
const FacID2PosID = {};

FacID2PosID[FacID.collector1] = 1;
FacID2PosID[FacID.collector2] = 2;
FacID2PosID[FacID.collector3] = 3;
FacID2PosID[FacID.gym3] = 1;
FacID2PosID[FacID.gym5] = 2;
FacID2PosID[FacID.gym2] = 1;
FacID2PosID[FacID.gym4] = 2;
FacID2PosID[FacID.gym1] = 1;
FacID2PosID[FacID.gym6] = 2;
FacID2PosID[FacID.read1] = 1;
FacID2PosID[FacID.read2] = 2;
FacID2PosID[FacID.read3] = 3;

const FacID2IdleActionNum = {
  12: 1,
  14: 1,
  15: 1,
  11: 6,
  13: 6,
  16: 6,
};

function getImageByFacType(facType) {
  if (facType === FacType.Collector) {
    return "collecting";
  }
  if (facType === FacType.Gym) {
    return "training";
  }
  if (facType === FacType.Read) {
    return "reading";
  }
  return "";
}

module.exports = {
  FacIDList,
  FacID,
  FacID2Type,
  AllFloorTypes,
  FloorType,
  FloorType2FacIDs,
  FacID2FloorType,
  FloorID2FloorComName,
  CollectorFacIDs,
  GymFacIDs,
  ReadFacIDs,
  ColFacID2worldIdx,
  FacID2PosID,
  FacType,
  FacID2ConfigPrefix,
  FacID2IdleActionNum,
  getImageByFacType,
};
