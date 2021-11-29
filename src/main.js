import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { waitFor } from 'esqlate-waitfor';
import { getInitialViewStore, loadResults as loadResultsImpl, resultDemandHTTP, loadDefinitionHTTP, getInitilizeControls, getLoadDefinition } from "./middleware";
import { addControlStoreToEsqlateQueryComponents, popBackFromArguments, serializeValues, queryComponentsToArguments, urlSearchParamsToArguments } from "./controls";
import { runningInWvLinewise } from "./js-wrap-wv-linewise-js-lib"
import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { consoleLog, getApiRoot, getURLSearchParams, getRequest, postRequest,errorHandler } from "./io";
import getCache from "esqlate-cache";
import promiseChain from "./promiseChain";
import { pick as runPick, getPopupLinkCreator } from "./user-actions";
import { getLocalStorage } from "./storage";

window.onerror = errorHandler;
window.onunhandledrejection = errorHandler;

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

function download(mimeType) {
    const otherFormat = getStoreValue(viewStore).result.full_format_urls.filter(
        (ffu) => ffu.type == mimeType
    );
    if (otherFormat.length == 0) {
        throw Error(`Mime type ${mimeType} was requested but not found`);
    }
    if (runningInWvLinewise()) {
        getRequest(otherFormat[0].location)
            .catch((err) => {
                console.log(err);
            });
        consoleLog("Opening in default viewer");
        alert("Opening in default viewer");
        return;
    }
    window.location = getFullUrlFromResponseUrl(getApiRoot(), otherFormat[0].location);
}


function cancelDownload() {
    router.setRoute(
        window.location.hash.replace(
            /^#\/?([^\/]+)\/((result)|(download))/,
            "/$1/result"
        )
    );
}

function showDownloads() {
    router.setRoute(
        window.location.hash.replace(
            /^#\/?([^\/]+)\/((result)|(download))/,
            "/$1/download"
        )
    );
}

function empty() {
    const route = runPick(
        [],
        urlSearchParamsToArguments(getURLSearchParams()),
        getStoreValue(viewStore).result.fields,
        true
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

    const qs = serializeValues(
        addControlStoreToEsqlateQueryComponents(
            getStoreValue(viewStore).controls,
            urlSearchParamsToArguments(getURLSearchParams())
        )
    );
    const route = `/${encodeURIComponent(definitionName)}/request?${qs}`
    router.setRoute(route);
}


function toggleShowingSql() {
    viewStore.update((vs) => {
        const value = !vs.showingSql;
        getLocalStorage().setItem('showingSql', value);
        return {...vs, showingSql: value }
    });
}


function toggleShowingExtendedDisplay() {
    viewStore.update((vs) => {
        const value = !vs.showingExtendedDisplay;
        getLocalStorage().setItem('showingExtendedDisplay', value);
        return {...vs, showingExtendedDisplay: value }
    });
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
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${query}`;
            router.setRoute(url);
            return ctx;
        });
}


function waitForRequest(ctx) {

    function getReady() {
        return getRequest(ctx.params.requestLocation)
            .then((j) => {
                if ((j.status == "preview") || (j.status == "complete")) {
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
            router.setRoute(url);
            return ctx;
        });

}


function loadResults(ctx) {

    async function fetcher() {
        return await getRequest(ctx.params.resultLocation);
    }

    const desiredStatus = ctx.params.showingDownload ?
        ["error", "complete"] :
        ["error", "complete", "preview"];


    viewStore.update((vs) => {
        return {
            ...vs,
            showingDownload: ctx.params.showingDownload
        }
    });

    return loadResultsImpl(fetcher, getStoreValue(viewStore), desiredStatus)
        .then((vs) => {
            viewStore.set(vs);
            return ctx;
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

function finishedLoading(ctx) {
    viewStore.update((vs) => {
        return {...vs, loading: false}
    });
    return Promise.resolve(ctx);
}
function setLoading(ctx) {
    viewStore.update((vs) => {
        return {...vs, loading: true}
    });
    return Promise.resolve(ctx);
}

const viewStore = writable({
    ...getInitialViewStore(),
    showingSql: (getLocalStorage().getItem('showingSql') === "false") ?
        false :
        true,
    showingExtendedDisplay: (getLocalStorage().getItem('showingExtendedDisplay') === "true") ?
        true :
        false,
});

const cacheDefinition = getCache(loadDefinitionHTTP);
const cacheCompleteResultForSelect = getCache(resultDemandHTTP);

getRequest("/definition")
    .then((menu) => viewStore.update((vs) => ({...vs, menu })))

const app = new App({
	target: document.body,
	props: {
        viewStore,
        toggleShowingSql,
        toggleShowingExtendedDisplay,
        run,
        popup,
        pick,
        empty,
        cancel,
        cancelDownload,
        showDownloads,
        download,
    }
});


var routes = {
    '/': promiseChain(errorHandler, [
        ([definitionName]) => {
            consoleLog(`ROUTE: / (${window.location.hash})`);
            viewStore.update((vs) => ({...vs, showingMenu: true }));
            return Promise.resolve({ params: { definitionName } });
        }
    ]),
    '/:definitionName': promiseChain(errorHandler, [
        setLoading,
        ([definitionName]) => {
            consoleLog(`ROUTE: /:definitionName (${window.location.hash})`);
            return Promise.resolve({ params: { definitionName } });
        },
        hideResults,
        setPopupMode,
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
        hideResults,
        finishedLoading,
    ]),
    '/:definitionName/request': promiseChain(errorHandler, [
        setLoading,
        ([definitionName]) => {
            consoleLog(`ROUTE: /:definitionName/request (${window.location.hash})`);
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
        setLoading,
        ([definitionName, requestLocation]) => {
            consoleLog(`ROUTE: /:definitionName/request/:requestLocation (${window.location.hash})`);
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
    '/:definitionName/:resultOrDownload/:resultLocation': promiseChain(errorHandler, [
        ([definitionName, resultOrDownload, requestLocation]) => {
            consoleLog(`ROUTE: /:definitionName/result/:resultLocation (${window.location.hash})`);
            if (resultOrDownload == "result") {
                setLoading();
            }
            return Promise.resolve({
                params: {
                    showingDownload: (resultOrDownload == "download"),
                    definitionName,
                    resultLocation: decodeURIComponent(requestLocation)
                }
            });
        },
        setPopupMode,
        getLoadDefinition(cacheDefinition, viewStore),
        getInitilizeControls(viewStore, getURLSearchParams, cacheCompleteResultForSelect),
        loadResults,
        (ctx) => {
            const result = getStoreValue(viewStore).result;
            if (result && result.message) {
                esqlateShowToastError(result.message);
            }
            return Promise.resolve(ctx);
        },
        finishedLoading,
    ]),
};

if (window.location.hash == "") {
    window.location.hash = "/";
}

let router;
router = window.Router(routes);
router.configure({
    notfound: (_r) => {
        router.setRoute("/");
    },
});
router.init();


export default app;
