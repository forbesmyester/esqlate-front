import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { newlineBreak, html, normalize } from "esqlate-lib";
import { waitFor } from 'waitfor-ts';
import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { resultDemandHTTP, loadDefinitionHTTP, getLoadDefinition } from "./middleware";
import { getInputValues, getControlStoreValue, serializeValues } from "./controls";
import { getQuery, getRequest, postRequest, errorHandler } from "./io";
import promiseChain from "./promiseChain";


const controls = writable({ credit: { value: 5 } });
const statement = writable([]);
const result = writable(false);
const definition = writable({ statement: [ ] });
const variables = [ ];


function run() {
    const definitionName = getStoreValue(definition).name;
    const qs = serializeValues(getStoreValue(controls));
    const route = `/${encodeURIComponent(definitionName)}/request?${qs}`
    router.setRoute(route);
}


const app = new App({
	target: document.body,
	props: { definition, result, statement, run, controls, variables }
});


function hideResults(ctx) {
    result.set(false);
    return Promise.resolve(ctx);
}


function createRequest(ctx) {
    const data = { "arguments": getQuery() };
    const url = `/request/${ctx.params.definitionName}`;
    return postRequest(url, data)
        .then(resp => resp.json())
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${serializeValues(getStoreValue(controls))}`;
            router.setRoute(url);
            return ctx;
        });
}


function waitForRequest(ctx) {

    function getReady() {
        return getRequest(ctx.params.requestLocation)
            .then(resp => resp.json())
            .then((j) => {
                if (j.status == "complete") {
                    return { complete: true, value: j.location };
                }
                return { complete: false };
            });
    }

    function calculateNewDelay(attemptsSoFar) { return attemptsSoFar * 300; }

    return waitFor(getReady, calculateNewDelay)
        .then((loc) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/result/${encodeURIComponent(loc)}?${serializeValues(getStoreValue(controls))}`;
            router.setRoute(url);
            return ctx;
        });

}


function loadResults(ctx) {
    return getRequest(ctx.params.resultLocation).then(resp => resp.json()).then((json) => {
        result.set(json);
        return ({ ...ctx, result });
    });
}


var routes = {
    '/:definitionName': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        getLoadDefinition(controls, definition, statement, loadDefinitionHTTP, resultDemandHTTP,  getQuery),
        hideResults,
    ]),
    '/:definitionName/request': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName/request', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        getLoadDefinition(controls, definition, statement, loadDefinitionHTTP, resultDemandHTTP, getQuery),
        hideResults,
        createRequest,
    ]),
    '/:definitionName/request/:requestLocation': promiseChain(errorHandler, [
        ([definitionName, requestLocation]) => {
            console.log("ROUTE:", '/:definitionName/request/:requestLocation', [definitionName, requestLocation], window.location);
            return Promise.resolve({
                params: {
                    definitionName,
                    requestLocation: decodeURIComponent(requestLocation)
                }
            });
        },
        hideResults,
        getLoadDefinition(controls, definition, statement, loadDefinitionHTTP, resultDemandHTTP, getQuery),
        waitForRequest,
    ]),
    '/:definitionName/result/:resultLocation': promiseChain(errorHandler, [
        ([definitionName, requestLocation]) => {
            console.log("ROUTE:", '/:definitionName/result/:resultLocation', [definitionName, requestLocation], window.location);
            return Promise.resolve({
                params: {
                    definitionName,
                    resultLocation: decodeURIComponent(requestLocation)
                }
            });
        },
        getLoadDefinition(controls, definition, statement, loadDefinitionHTTP, resultDemandHTTP, getQuery),
        loadResults,
    ]),
};


let router;
document.addEventListener("DOMContentLoaded", () => {
    router = window.Router(routes);
    router.configure({
        notfound: (r) => {
            console.log("Route not found " + r);
        }
    });
    router.init();
});


export default app;
