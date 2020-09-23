import { runningInWvLinewise } from "wv-linewise-js-lib";

let memStorage: { [k: string]: string } = {};
export function getLocalStorage() {
    if (runningInWvLinewise()) {
        return {
            getItem: function getItem(k: string) { return memStorage[k] },
            setItem: function setItem(k: string, v: string) { memStorage[k] = v; }
        }
    }
    return window.localStorage;
}



