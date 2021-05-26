
try {
    require('mbgGame');
    const utils = require('utils');
    module.exports = utils;
} catch (e) {
    const utils = require('../gameserver/utils');
    module.exports = utils;
} 