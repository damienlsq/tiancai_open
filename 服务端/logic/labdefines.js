const FacID = {
  clan: 2, // 公会
  collector1: 3,
  collector2: 4,
  collector3: 5,
  gym1: 11,
  gym2: 12,
  gym3: 13,
  gym4: 14,
  gym5: 15,
  gym6: 16,
  read1: 21,
  read2: 22,
  read3: 23,
};

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
};

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

const Read2FacIDs = [
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

for (let i = 0; i < CollectorFacIDs.length; i++) {
  FacID2Type[CollectorFacIDs[i]] = FacType.Collector;
}
for (let i = 0; i < GymFacIDs.length; i++) {
  FacID2Type[GymFacIDs[i]] = FacType.Gym;
}
for (let i = 0; i < Read2FacIDs.length; i++) {
  FacID2Type[Read2FacIDs[i]] = FacType.Read;
}
const FacID2CharaMaxLen = {};
FacID2CharaMaxLen[FacID.collector1] = 1;
FacID2CharaMaxLen[FacID.collector2] = 1;
FacID2CharaMaxLen[FacID.collector3] = 1;
FacID2CharaMaxLen[FacID.gym1] = 1;
FacID2CharaMaxLen[FacID.gym2] = 1;
FacID2CharaMaxLen[FacID.gym3] = 1;
FacID2CharaMaxLen[FacID.gym4] = 1;
FacID2CharaMaxLen[FacID.gym5] = 1;
FacID2CharaMaxLen[FacID.gym6] = 1;
FacID2CharaMaxLen[FacID.read1] = 1;
FacID2CharaMaxLen[FacID.read2] = 1;
FacID2CharaMaxLen[FacID.read3] = 1;

module.exports = {
  FloorType,
  FacIDList,
  FacID,
  FacType,
  FacID2Type,
  CollectorFacIDs,
  GymFacIDs,
  FacID2CharaMaxLen,
  Read2FacIDs,
};