"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultQualityFactory = void 0;
exports.createQualityFactory = createQualityFactory;
const Quality_1 = require("../Quality");
class DefaultQualityFactory {
    opts;
    constructor(opts = {}) {
        this.opts = opts;
    }
    checkContract(files, contract, context = {}) {
        const selected = contract ?? Quality_1.builtInOutputContracts.find((item) => item.id === this.opts.defaultContractId) ?? Quality_1.builtInOutputContracts[0];
        return (0, Quality_1.checkProjectOutputContract)(files, selected, context);
    }
}
exports.DefaultQualityFactory = DefaultQualityFactory;
function createQualityFactory(opts) {
    return new DefaultQualityFactory(opts);
}
