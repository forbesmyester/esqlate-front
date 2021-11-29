"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalInvoke = exports.runningInWvLinewise = void 0;
const wv_linewise_js_lib_1 = require("wv-linewise-js-lib");
function runningInWvLinewise() {
    return wv_linewise_js_lib_1.runningInWvLinewise();
}
exports.runningInWvLinewise = runningInWvLinewise;
function externalInvoke(e) {
    return wv_linewise_js_lib_1.externalInvoke(e);
}
exports.externalInvoke = externalInvoke;
