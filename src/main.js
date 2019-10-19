import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { waitFor } from 'esqlate-waitfor';
import { resultDemandHTTP, loadDefinitionHTTP, getInitilizeControls, getLoadDefinition } from "./middleware";
import { addControlStoreToEsqlateQueryComponents, popBackFromArguments, serializeValues, queryComponentsToArguments, urlSearchParamsToArguments } from "./controls";
import { getURLSearchParams, getRequest, postRequest, errorHandler } from "./io";
import getCache from "esqlate-cache";
import promiseChain from "./promiseChain";
import { pick as runPick, getPopupLinkCreator } from "./user-actions";


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


const cacheDefinition = getCache(loadDefinitionHTTP);
const cacheCompleteResultForSelect = getCache(resultDemandHTTP);

function popup(row) {
    const runPopup = getPopupLinkCreator(getURLSearchParams);
    const route = runPopup(row, getStoreValue(definition), getStoreValue(controls));
    router.setRoute(route);
}

function pick(row) {
    const route = runPick(
        row,
        urlSearchParamsToArguments(
            getURLSearchParams()
        ),
        getStoreValue(result).fields
    );
    router.setRoute(route);
}

function cancel() {
    router.setRoute(popBackFromArguments(
        urlSearchParamsToArguments(getURLSearchParams())
    ).url);
}

function run() {
    const definitionName = getStoreValue(definition).name;
    const qs = serializeValues(
        addControlStoreToEsqlateQueryComponents(
            getStoreValue(controls),
            urlSearchParamsToArguments(getURLSearchParams())
        )
    );
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

    const data = {
        "arguments": queryComponentsToArguments(
            getStoreValue(definition).parameters,
            addControlStoreToEsqlateQueryComponents(
                getStoreValue(controls),
                urlSearchParamsToArguments(
                    getURLSearchParams()
                )
            )
        )
    };

    const url = `/request/${ctx.params.definitionName}`;

    // TODO: Catch 422 etc
    return postRequest(url, data)
        .then(resp => resp.json())
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${serializeValues(addControlStoreToEsqlateQueryComponents(getStoreValue(controls), urlSearchParamsToArguments(getURLSearchParams())))}`;
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
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/result/${encodeURIComponent(loc)}?${serializeValues(addControlStoreToEsqlateQueryComponents(getStoreValue(controls), urlSearchParamsToArguments(getURLSearchParams())))}`;
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
    popupMode.set(urlSearchParamsToArguments(getURLSearchParams()).reduce((acc, esqArg) => {
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
        getLoadDefinition(cacheDefinition, definition),
        getInitilizeControls(controls, statement, getURLSearchParams, cacheCompleteResultForSelect),
        hideResults,
    ]),
    '/:definitionName/request': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName/request', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        resetResult,
        setPopupMode,
        getLoadDefinition(cacheDefinition, definition),
        getInitilizeControls(controls, statement, getURLSearchParams, cacheCompleteResultForSelect),
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
        getLoadDefinition(cacheDefinition, definition),
        getInitilizeControls(controls, statement, getURLSearchParams, cacheCompleteResultForSelect),
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
        getLoadDefinition(cacheDefinition, definition),
        getInitilizeControls(controls, statement, getURLSearchParams, cacheCompleteResultForSelect),
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
