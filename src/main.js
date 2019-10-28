import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { waitFor } from 'esqlate-waitfor';
import { getInitialViewStore, resultDemandHTTP, loadDefinitionHTTP, getInitilizeControls, getLoadDefinition } from "./middleware";
import { addControlStoreToEsqlateQueryComponents, popBackFromArguments, serializeValues, queryComponentsToArguments, urlSearchParamsToArguments } from "./controls";
import { getURLSearchParams, getRequest, postRequest } from "./io";
import getCache from "esqlate-cache";
import promiseChain from "./promiseChain";
import { pick as runPick, getPopupLinkCreator } from "./user-actions";


function popup(row) {
    const runPopup = getPopupLinkCreator(getURLSearchParams);
    const route = runPopup(row, getStoreValue(viewStore).definition, getStoreValue(viewStore).controls);
    router.setRoute(route);
}

function pick(row) {
    const route = runPick(
        row,
        urlSearchParamsToArguments(
            getURLSearchParams()
        ),
        getStoreValue(viewStore).result.fields
    );
    router.setRoute(route);
}

function cancel() {
    router.setRoute(popBackFromArguments(
        urlSearchParamsToArguments(getURLSearchParams())
    ).url);
}

function run() {
    const definitionName = getStoreValue(viewStore).definition.name;

    console.log({gsv: getStoreValue(viewStore).controls, usp: urlSearchParamsToArguments(getURLSearchParams())});
    const qs = serializeValues(
        addControlStoreToEsqlateQueryComponents(
            getStoreValue(viewStore).controls,
            urlSearchParamsToArguments(getURLSearchParams())
        )
    );
    console.log(qs);
    const route = `/${encodeURIComponent(definitionName)}/request?${qs}`
    router.setRoute(route);
}


function hideResults(ctx) {
    viewStore.update((vs) => ({...vs, result: false }));
    return Promise.resolve(ctx);
}


function createRequest(ctx) {

    const data = {
        "arguments": queryComponentsToArguments(
            getStoreValue(viewStore).definition.parameters,
            addControlStoreToEsqlateQueryComponents(
                getStoreValue(viewStore).controls,
                urlSearchParamsToArguments(
                    getURLSearchParams()
                )
            )
        )
    };

    const url = `/request/${ctx.params.definitionName}`;

    const query = serializeValues(
        addControlStoreToEsqlateQueryComponents(
            getStoreValue(viewStore).controls,
            data.arguments.map(({ name, value }) => ({ name, val: value }))
        )
    );

    // TODO: Catch 422 etc
    return postRequest(url, data)
        .then(resp => resp.json())
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${query}`;
            // console.log(url);
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

    const qry = addControlStoreToEsqlateQueryComponents(
        getStoreValue(viewStore).controls,
        urlSearchParamsToArguments(getURLSearchParams())
    );

    return waitFor(getReady, calculateNewDelay)
        .then((loc) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/result/${encodeURIComponent(loc)}?${serializeValues(qry)}`;
            // console.log(url);
            router.setRoute(url);
            return ctx;
        });

}


function loadResults(ctx) {
    return getRequest(ctx.params.resultLocation)
        .then(resp => resp.json())
        .then((result) => {
            viewStore.update((vs) => ({...vs, result}))
            return {...ctx, result};
        });
}


function setPopupMode(ctx) {
    viewStore.update((vs) => {
        const asPopup = urlSearchParamsToArguments(getURLSearchParams())
            .reduce(
                (acc, esqArg) => {
                    return esqArg.name == '_burl0' ? true : acc;
                },
                false
            );
        return {...vs, asPopup };
    });
    return Promise.resolve(ctx);
}

function errorHandler(error) {
    console.log(error);
    let message = error;
    if (error.message) {
        message = error.message;
    }
    viewStore.update((vs) => ({...vs, result: {...vs.result, message}}));
}


const viewStore = writable(getInitialViewStore());

getRequest("/definition")
    .then(resp => resp.json())
    .then((menu) => viewStore.update((vs) => ({...vs, menu })));


const cacheDefinition = getCache(loadDefinitionHTTP);
const cacheCompleteResultForSelect = getCache(resultDemandHTTP);


const app = new App({
	target: document.body,
	props: {
        viewStore,

        run,
        popup,
        pick,
        cancel,
    }
});


var routes = {
    '/:definitionName': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        hideResults,
        setPopupMode,
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
        hideResults,
    ]),
    '/:definitionName/request': promiseChain(errorHandler, [
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName/request', [definitionName], window.location);
            return Promise.resolve({ params: { definitionName } });
        },
        hideResults,
        setPopupMode,
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
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
        setPopupMode,
        hideResults,
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
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
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
        loadResults,
    ]),
};


let router;
router = window.Router(routes);
router.configure({
    notfound: (r) => {
        errorHandler("Route not found " + r);
    }
});
router.init();


window.onerror = errorHandler;
export default app;
