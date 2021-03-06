const _u = require('../underscore');

const stateModules = [
  [1, require("./state_1")],
  [2, require("./state_2")],
  [3, require("./state_3")],
  // [4, require("./state_4")],
  [5, require("./state_5")],
  [6, require("./state_6")],
  [7, require("./state_7")],
  [8, require("./state_8")],
  [9, require("./state_9")],
  [10, require("./state_10")],
  [11, require("./state_11")],
  [12, require("./state_12")],
  [13, require("./state_13")],
  [14, require("./state_14")],
  [15, require("./state_15")],
  [16, require("./state_16")],
  [17, require("./state_17")],
  [18, require("./state_18")],
  [19, require("./state_19")],
  [20, require("./state_20")],
  [102, require("./state_102")],
  [105, require("./state_105")],
  [106, require("./state_106")],
  [107, require("./state_107")],
  [110, require("./state_110")],
  [111, require("./state_111")],
  [114, require("./state_114")],
  [115, require("./state_115")],
  [998, require("./state_998")],
  [999, require("./state_999")],
  [1001, require("./state_1001")],
  [1002, require("./state_1002")],
  [1003, require("./state_1003")],
  [1004, require("./state_1004")],
  [1005, require("./state_1005")],
  [1006, require("./state_1006")],
  [1007, require("./state_1007")],
  [1008, require("./state_1008")],
  [1009, require("./state_1009")],
  [1010, require("./state_1010")],
  [2001, require("./state_2001")],
  [2006, require("./state_2006")],
  [2008, require("./state_2008")],
  [2011, require("./state_2011")],
  [2015, require("./state_2015")],
  [2016, require("./state_2016")],
  [2017, require("./state_2017")],
  [2018, require("./state_2018")],
  [2019, require("./state_2019")],
  [2020, require("./state_2020")],
  [2025, require("./state_2025")],
  [2026, require("./state_2026")],
  [2027, require("./state_2027")],
  [2029, require("./state_2029")],
  [3001, require("./state_3001")],
  [3002, require("./state_3002")],
  [3003, require("./state_3003")],
  [3004, require("./state_3004")],
  [3005, require("./state_3005")],
  [3006, require("./state_3006")],
  [3007, require("./state_3007")],
  [3008, require("./state_3008")],
  [3009, require("./state_3009")],
  [3010, require("./state_3010")],
  [10001, require("./state_10001")],
  [10004, require("./state_10004")],
  [10012, require("./state_10012")],
  [10014, require("./state_10014")],
  [20012, require("./state_20012")],
  [20015, require("./state_20015")],
  [9999, require("./state_9999")],
];

const StateData = {};

_u.each(stateModules, (pair) => {
  const [stateID, module] = pair;
  StateData[stateID] = module;
});
module.exports = StateData;