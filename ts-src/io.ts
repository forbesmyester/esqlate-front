import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { URL } from "./types";
import { EsqlateArgument } from 'esqlate-lib';

export function getQuery(url?: string): EsqlateArgument[] {

    function paramsToR(usp: URLSearchParams) {
        let o = [];
        for (let [k, v] of usp.entries()) {
            o.push({ name: k, value: v});
        }
        return o;
    }

    return paramsToR(
        new URLSearchParams(
            url ?
                url.replace(/.*\?/, '') :
                window.location.hash.replace(/.*\?/, '')
        )
    );

}

export function getApiRoot(): URL {
    const bodyElement = (document.querySelector("body") as HTMLBodyElement);
    return (bodyElement.dataset.apiServer as string).replace(/\/$/, '');
}

export function getRequest(apiUrl: URL): Promise<Response> {
    const url = getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
    const opts: RequestInit = {
        mode: "cors",
        cache: "no-cache",
        headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
    };
    return fetch(url, opts);
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
    return fetch(url, opts);
}

export function errorHandler(e: Error) {
    alert(e.message);
}

