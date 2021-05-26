const CWarListener = require('./listener').CWarListener;

class CTestListener extends CWarListener {
    CType() {
        return "CTestListener";
    }
    send2C(sEvent, dData) {
        //  console.log(sEvent, JSON.stringify(dData));
    }
}

module.exports = CTestListener;