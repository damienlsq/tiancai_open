const gb = require('./gua.json');

function loadGua(guaXiang) {
	if (gb.gua !== null) {
		const len = gb.gua.length;
		for (let i = 0; i < len; ++i) {
			if (gb.gua[i]['gua-xiang'] === guaXiang) {
				const name = gb.gua[i]['gua-name'];
				return {
					guaName: getGuaName(guaXiang, name),
					guaDetail: gb.gua[i]['gua-detail'],
				};
			}
		}
	}
	return null;
}

function getGuaName(guaXiang, guaName) {
	const name = ['地', '雷', '水', '泽', '山', '火', '风', '天'];
	const last = parseInt(guaXiang[0]) + parseInt(guaXiang[1]) * 2
		+ parseInt(guaXiang[2]) * 4;
	const first = parseInt(guaXiang[3]) + parseInt(guaXiang[4]) * 2
		+ parseInt(guaXiang[5]) * 4;
	if (first === last) {
		return `${guaName}为${name[first]}`;
	}
	return name[first] + name[last] + guaName;
}

module.exports = {
	loadGua,
};