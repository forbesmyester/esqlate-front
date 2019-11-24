import { URL } from "./types";
export function getFullUrlFromResponseUrl(apiRoot: URL, responseUrl: string) {

    // It may be full...
    try {
        return new URL(responseUrl).href;
    } catch (_e) {}

    // May not include the protocol
    const apiRootUrl = new URL(apiRoot);
    if (responseUrl.substring(0, 2) == "//") {
        return apiRootUrl.protocol + responseUrl;
    }

    // May be an absolute path
    if (responseUrl.substring(0, 1) == "/") {
        return apiRoot.replace(/\/$/, '') + responseUrl;
        // return apiRootUrl.protocol + "//" + apiRootUrl.hostname +
        // (apiRootUrl.port ? ":" + apiRootUrl.port : "") +
        // responseUrl;
    }

    // Or something else...
    throw new Error("Cannot handle location " + responseUrl);

}


