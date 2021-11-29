import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { URL } from "./types";
import { externalInvoke, getWvLinewiseManagedFetch, runningInWvLinewise, RawWvLinewise, WvLinewise } from "wv-linewise-js-lib"

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

function handleResponse<X>(url: string, p: Promise<Response>): Promise<X> {
    return p.then(throwOnInvalidStatusCodes.bind(null, url))
        .then((r) => { return (r.json() as unknown) as Promise<X>; })
        .then((body) => {
            consoleLog({ "method": "POST", url, body });
            return body
        });
}

let wvl = new WvLinewise(new RawWvLinewise({ invoke: externalInvoke }));
let wvFetch = getWvLinewiseManagedFetch(wvl, "IN", () => 10);

export function getRequest<X>(apiUrl: URL): Promise<X> {
    let fetchFunc = fetch;
    if (runningInWvLinewise()) {
        return handleResponse(apiUrl, wvFetch(apiUrl, {}));
    }
    const url = getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
    const opts: RequestInit = {
        mode: "cors",
        cache: "no-cache",
        headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
    };
    return fetchFunc(url, opts)
        .then(throwOnInvalidStatusCodes.bind(null, apiUrl))
        .then((r) => { return (r.json() as unknown) as Promise<X> });
}

export function postRequest<X>(apiUrl: URL, data: any): Promise<X> {

    if (runningInWvLinewise()) {
        return handleResponse(apiUrl, wvFetch(apiUrl, { method: 'POST', body: JSON.stringify(data) }));
    }

    const url = getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
    const opts: RequestInit = {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
        body: JSON.stringify(data)
    };
    return fetch(url, opts)
        .then(throwOnInvalidStatusCodes.bind(null, apiUrl))
        .then((r) => { return (r.json() as unknown) as Promise<X> });
}


export function errorHandler(error: PromiseRejectionEvent|Error|string) {
    consoleLog(error);
    let message = error;
    if ((error as PromiseRejectionEvent).reason) {
        error = (error as PromiseRejectionEvent).reason
    }
    if ((error as Error).message) {
        message = (error as Error).message;
    }
    let el: HTMLElement | null = document.getElementById("loading-modal");
    el && el.classList.remove("active");
    (window as any).esqlateShowToastError && (window as any).esqlateShowToastError(message) || alert(message);
}


function fakeConsoleLog(x: any) {
    let fcDiv = document.querySelector('#fake-console');
    if (fcDiv === null) {
        fcDiv = document.createElement("div");
        let fcDivId = document.createAttribute("id");
        fcDivId.value = 'fake-console';
        fcDiv.setAttributeNode(fcDivId);
        document.body.appendChild(fcDiv);
    }
    let div = document.createElement("div");
    let txt = document.createTextNode(JSON.stringify(x));
    div.appendChild(txt);
    fcDiv.appendChild(div);
    if (fcDiv.childNodes.length > 16) {
        fcDiv.childNodes[0].remove();
    }
}


export function consoleLog(x: any) {
    if (runningInWvLinewise()) {
        return fakeConsoleLog(x);
    }
    console.log(x);
}

