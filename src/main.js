import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { newlineBreak, html, normalize } from "esqlate-lib";
import { waitFor } from 'esqlate-waitfor';
import { resultDemandHTTP, loadDefinitionHTTP, getLoadDefinition } from "./middleware";
import { addBackValuesToControlStoreValue, addControlStoreToEsqlateArguments, popBackFromArguments, pushBackToControlStore, serializeValues } from "./controls";
import { getQuery, getRequest, postRequest, errorHandler } from "./io";
import getCache from "esqlate-cache";
import promiseChain from "./promiseChain";
import { pick as runPick, popup as runPopup } from "./user-actions";


const controls = writable({});
const popupMode = writable(false);
const statement = writable([]);
const result = writable(false);
const definition = writable({ statement: [ ] });
const variables = [ ];
const menu = writable([]);

getRequest("/")
    .then(resp => resp.json())
    .then((j) => { menu.set(j); });

const cache = {
    definition: getCache(loadDefinitionHTTP),
    selectResult: getCache(resultDemandHTTP)
};

function popup(row) {
    const route = runPopup(row, getStoreValue(definition), getStoreValue(controls));
    router.setRoute(route);
}

function pick(row) {
    const route = runPick(row, getQuery(), getStoreValue(result));
    router.setRoute(route);
}

function cancel() {
    const qry = getQuery();
    router.setRoute(popBackFromArguments(qry).url);
}

function run() {
    const definitionName = getStoreValue(definition).name;
    const qs = serializeValues(addControlStoreToEsqlateArguments(getStoreValue(controls), getQuery()));
    const route = `/${encodeURIComponent(definitionName)}/request?${qs}`
    router.setRoute(route);
}

const app = new App({
	target: document.body,
	props: {
        definition,
        result,
        statement,
        run,
        controls,
        variables,
        popup,
        pick,
        cancel,
        popupMode,
        menu
    }
});


function hideResults(ctx) {
    result.set(false);
    return Promise.resolve(ctx);
}


function createRequest(ctx) {
    const data = { "arguments": addControlStoreToEsqlateArguments(getStoreValue(controls), getQuery()) };
    const url = `/request/${ctx.params.definitionName}`;

    // TODO: Catch 422 etc
    return postRequest(url, data)
        .then(resp => resp.json())
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${serializeValues(addControlStoreToEsqlateArguments(getStoreValue(controls), getQuery()))}`;
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
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/result/${encodeURIComponent(loc)}?${serializeValues(addControlStoreToEsqlateArguments(getStoreValue(controls), getQuery()))}`;
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


function setPopupMode(ctx) {
    popupMode.set(getQuery().reduce((acc, esqArg) => {
        return esqArg.name == '_burl0' ? true : acc;
    }, false));
    return Promise.resolve(ctx);
}

function resetResult(ctx) {
    result.set(false);
    return Promise.resolve(ctx);
}

var routes = {
    '/:definitionName': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        resetResult,
        setPopupMode,
        getLoadDefinition(controls, definition, statement, getQuery, cache),
        hideResults,
    ]),
    '/:definitionName/request': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName/request', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        resetResult,
        setPopupMode,
        getLoadDefinition(controls, definition, statement, getQuery, cache),
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
        resetResult,
        setPopupMode,
        hideResults,
        getLoadDefinition(controls, definition, statement, getQuery, cache),
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
        setPopupMode,
        getLoadDefinition(controls, definition, statement, getQuery, cache),
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
