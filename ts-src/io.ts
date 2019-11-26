import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { URL } from "./types";

export function getURLSearchParams(): URLSearchParams {
    return new URLSearchParams(window.location.hash.replace(/.*\?/, ''));
}

export function getApiRoot(): URL {
    const bodyElement = (document.querySelector("body") as HTMLBodyElement);
    const url = (bodyElement.dataset.apiServer as string).replace(/\/$/, '');
    if (!url.match(/https?:/)) {
        return getFullUrlFromResponseUrl(window.location.origin, url);
    }
    return url;
}

function throwOnInvalidStatusCodes(apiUrl: URL, resp: Response): Response {
    if ((resp.status < 200) || (resp.status >= 300)) {
        throw new Error(
            `HTTP Request to ${apiUrl} returned status code ` +
            `${resp.status} but I was expecting something in the ` +
            `200 range`
        );
    }
    return resp;
}

export function getRequest(apiUrl: URL): Promise<Response> {
    const url = getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
    const opts: RequestInit = {
        mode: "cors",
        cache: "no-cache",
        headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
    };
    return fetch(url, opts)
        .then(throwOnInvalidStatusCodes.bind(null, apiUrl));
}

export function postRequest(apiUrl: URL, data: any) {
    const url = getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
    const opts: RequestInit = {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
        body: JSON.stringify(data)
    };
    return fetch(url, opts)
        .then(throwOnInvalidStatusCodes.bind(null, apiUrl));
}

export function errorHandler(e: Error) {
    alert(e.message);
}

