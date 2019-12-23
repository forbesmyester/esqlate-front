import { get as getStoreValue, writable } from 'svelte/store';
import App from './App.svelte';
import { waitFor } from 'esqlate-waitfor';
import { getInitialViewStore, loadResults as loadResultsImpl, resultDemandHTTP, loadDefinitionHTTP, getInitilizeControls, getLoadDefinition } from "./middleware";
import { addControlStoreToEsqlateQueryComponents, popBackFromArguments, serializeValues, queryComponentsToArguments, urlSearchParamsToArguments } from "./controls";
import { getFullUrlFromResponseUrl } from "./getFullUrlFromResponseUrl";
import { getApiRoot, getURLSearchParams, getRequest, postRequest } from "./io";
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

function download(mimeType) {
    const otherFormat = getStoreValue(viewStore).result.full_format_urls.filter(
        (ffu) => ffu.type == mimeType
    );
    if (otherFormat.length == 0) {
        throw Error(`Mime type ${mimeType} was requested but not found`);
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
        window.localStorage.setItem('showingSql', value);
        return {...vs, showingSql: value }
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
        .then(resp => resp.json())
        .then((json) => {
            const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${query}`;
            router.setRoute(url);
            return ctx;
        });
}


function waitForRequest(ctx) {

    function getReady() {
        return getRequest(ctx.params.requestLocation)
            .then(resp => resp.json())
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
        const resp = await getRequest(ctx.params.resultLocation);
        return await resp.json();
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

function errorHandler(error) {
    console.log(error);
    let message = error;
    if (error.message) {
        message = error.message;
    }
    document.getElementById("loading-modal").classList.remove("active");
    esqlateShowToastError(message);
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
    showingSql: (window.localStorage.getItem('showingSql') === "false") ?
        false :
        true
});

getRequest("/definition")
    .then(resp => resp.json())
    .then((menu) => viewStore.update((vs) => ({...vs, menu })));


const cacheDefinition = getCache(loadDefinitionHTTP);
const cacheCompleteResultForSelect = getCache(resultDemandHTTP);


const app = new App({
	target: document.body,
	props: {
        viewStore,
        toggleShowingSql,
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
            console.log("ROUTE:", '/', window.location);
            viewStore.update((vs) => ({...vs, showingMenu: true }));
            return Promise.resolve({ params: { definitionName } });
        }
    ]),
    '/:definitionName': promiseChain(errorHandler, [
        setLoading,
        ([definitionName]) => {
            console.log("ROUTE:", '/:definitionName', [definitionName], window.location);
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
        setLoading,
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
    '/:definitionName/:resultOrDownload/:resultLocation': promiseChain(errorHandler, [
        ([definitionName, resultOrDownload, requestLocation]) => {
            console.log("ROUTE:", '/:definitionName/result/:resultLocation', [definitionName, requestLocation], window.location);
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


window.onerror = errorHandler;
export default app;
