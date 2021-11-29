import { externalInvoke as ei, runningInWvLinewise as riwl } from "wv-linewise-js-lib"

export function runningInWvLinewise() {
    return riwl();
}

export function externalInvoke(e: any) {
    return ei(e);
}

