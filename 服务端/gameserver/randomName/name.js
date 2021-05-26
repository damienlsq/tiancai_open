const fs = require("fs");

// let dict = fs.readFileSync(`${__dirname}/n.dict`, "utf8");
let dict = require('./n.dict.js');
dict = dict.split("\n");
dict = dict.map((d) => {
  return d.split(" ");
});

// let xin_dict = fs.readFileSync(`${__dirname}/f.dict`, "utf8");
let xin_dict = require('./f.dict.js');
xin_dict = xin_dict.split("\n\n");

// 英文名字
const e_names = require('./names.json');
const e_first = require('./first-names.json');
const e_middle = require('./middle-names.json');


function propertiesInterval(n1, n2) {
  if (n1 > n2) {
    n1 += n2;
    n2 = n1 - n2;
    n1 -= n2;
  }

  return Math.min(n2 - n1, n1 + 5 - n2);
}

const properties = ["金", "水", "木", "火", "土"];
let names = {
  金: [],
  木: [],
  水: [],
  火: [],
  土: [],
};
names = dict.reduce((names, n) => {
  if (n.length === 1 && n[0] === "") return names;
  names[n[2].split("：")[0]].push(n[1]);

  return names;
}, names);

const combination2 = [];
let combination2Max = 0;
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const temp = { property: properties[i] + properties[j] };
    temp.min = combination2Max;

    const interval = propertiesInterval(i, j);
    if (interval === 0) combination2Max += 100;
    if (interval === 1) combination2Max += 50;
    if (interval === 2) combination2Max += 20;

    temp.max = combination2Max - 1;

    combination2.push(temp);
  }
}

const combination3 = [];
let combination3Max = 0;
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    let base = propertiesInterval(i, j);
    if (base === 0) base = 100;
    if (base === 1) base = 50;
    if (base === 2) base = 20;
    for (let k = 0; k < 5; k++) {
      const temp = {
        property: properties[i] + properties[j] + properties[j],
      };
      temp.min = combination3Max;

      const interval = propertiesInterval(j, k);
      if (interval === 0) combination3Max += 100;
      if (interval === 1) combination3Max += 50;
      if (interval === 2) combination3Max += 20;
      combination3Max += base;

      temp.max = combination3Max - 1;

      combination3.push(temp);
    }
  }
}


const weights = [
  100,
  70,
  10,
  5,
  1,
  1,
];

let surnames = [];
const w = 0;
const idx = 0;
surnames = xin_dict.reduce((surnames, names) => {
  names = names.split("\n");
  names = names.map((n) => {
    return n.split(" ");
  }).flatten();
  return names;
}, surnames);

function getXinByWeight() {
  const idx = _.random(0, surnames.length - 1);
  return surnames[idx] || "刘";
}

// 根据五行来选字
function getnamebyproperty(property) {
  if (undefined === property) property = properties[_.random(0, 4)];

  const temp = names[property];
  const idx = _.random(0, temp.length - 1);
  return temp[idx] || "壕";
}

const randomName = function() {
  // 先随机一个姓
  const first = getXinByWeight();
  let name_count = 1;// 名最多2个字
  const temp = _.random(1, 1000);
  if (temp <= 300) {
    // 单字姓名概率应该少些
    name_count = 1;
  } else {
    name_count = 2;
  }
  let name = "";
  while (name_count--) {
    name += getnamebyproperty();
  }
  // mbgGame.logger.info("!name:" + first + name);
  return first + name;
};


function r(names) {
  return function() {
    return names[~~(Math.random() * names.length)];
  };
}

var random = module.exports = function() {
  return `${random.first()} ${random.last()}`;
};

random.first = r(e_first);
random.last = r(e_names);
random.middle = r(e_middle);

const randomEName = function() {
  return `${random.first() || 'Rich'}.${random.middle() || 'Best'}.${random.last() || 'Damien'}`;
};

module.exports = {
  randomName,
  randomEName,
};