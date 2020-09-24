import { runningInWvLinewise } from "wv-linewise-js-lib"

export function consoleLog(...x: [any?, ...any[]]) {
    if (!runningInWvLinewise()) {
        console.log.apply(null, x);
    }
}


