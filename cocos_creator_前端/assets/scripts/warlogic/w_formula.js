const w_defines = require('./w_defines');

// 公式计算用
//
class FormulaHelper {
    exec(func, sParam, dData) {
        this.m_Data = dData;
        let result = func(this);
        if (typeof (result) === "number") {
            result = Math.round(result * 100) / 100; // 只允许小数点后2位
            if (sParam === "a" || sParam === "d") { // 只有这2个参数会取整
                result = Math.ceil(result);
            }
        }
        this.m_Data = null;
        return result;
    }
    val() {
        return this.m_Data.val;
    }
    // 配表都是rank，为了兼容，不修改这个rank名字
    rank() {
        if (this.m_Data.s != null) {
            return this.m_Data.s;
        }
        return 0;
    }
    attr() {
        const dSkillUp = mbgGame.config[`skillup${this.slv()}`];
        if (this.m_Data.unit && this.m_Data.unit.isMonster()) {
            return this.m_Data.unit.getBaseAttr("SkillAttr") || 1;
        }
        if (this.m_Data.unit) {
            if (!this.m_Data.unit.isMonster()) {
                return dSkillUp.attrPoint * (1 + (0.01 * this.m_Data.unit.getAttr("Sk")));
            }
        }
        return dSkillUp.attrPoint;
    }
    slv() {
        return this.m_Data.slv || 1;
    }
    maxHp() {
        return this.m_Data.unit.getAttr("maxHp");
    }
    def() {
        return this.m_Data.unit.getAttr("Def");
    }
    cri() {
        return this.m_Data.unit.getAttr("Cri");
    }
    dodge() {
        return this.m_Data.unit.getAttr("Dodge");
    }
    coin() {
        return this.m_Data.coin;
    }
}

module.exports = FormulaHelper;