import { getRequest, postRequest } from "./io";
import { waitFor } from 'esqlate-waitfor';
import { getControlStore, urlSearchParamsToArguments } from "./controls";
import { get as getStoreValue, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, normalize, removeLineBeginningWhitespace, EsqlateDefinition, EsqlateRequestCreation, EsqlateResult, EsqlateParameterSelect, EsqlateParameter, EsqlateSuccessResult } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect, Controls, URL } from "./types";
import { Cache } from "esqlate-cache";

interface LoadDefinitionCtx { definition?: EsqlateDefinition, params: { definitionName: string } }
interface LoadedDefinitionCtx { definition: EsqlateDefinition, params: { definitionName: string } }


export interface ViewStore {
    showingSql: boolean;
    showingMenu: boolean;
    showingDownload: boolean,
    definition: EsqlateDefinition;
    statement: EsqlateStatementNormalized[];
    result: EsqlateResult | false;
    controls: Controls;
    asPopup: boolean;
    loading: boolean;
    menu: { title: string; name: string }[];
}

export function getInitialViewStore(): ViewStore {
    return {
        showingSql: true,
        showingMenu: false,
        loading: false,
        showingDownload: false,
        definition: {
            description: "",
            name: "",
            parameters: [],
            links: [],
            row_links: [],
            statement: "",
            title: "",
        },
        statement: [],
        result: false,
        controls: {},
        asPopup: false,
        menu: [],
    };
}


export async function loadDefinitionHTTP(definitionName: EsqlateDefinition["name"]): Promise<EsqlateDefinition> {

    const url = `/definition/${definitionName}`;
    const resp = await getRequest(url);
    return await resp.json();
}

export async function resultDemandHTTP(definitionName: EsqlateDefinition["name"]): Promise<EsqlateResult> {
    const data: EsqlateRequestCreation = { "arguments": [] };
    const url = `/demand/${definitionName}`;
    return postRequest(url, data)
        .then(resp => resp.json());
}


export function getInitilizeControls(
    viewStore: Writable<ViewStore>,
    getURLSearchParams: () => URLSearchParams,
    cacheSuccessResultForSelect: Cache<EsqlateSuccessResult>
) {
    return async function loadDefinition(ctx: LoadedDefinitionCtx): Promise<LoadedDefinitionCtx> {

        const definition: EsqlateDefinition = ctx.definition;

        const selects = <EsqlateParameterSelect[]>definition.parameters.filter((p) => {
            return p.type == "select"
        });

        const options: OptionsForEsqlateParameterSelect[] = await Promise.all(
            selects.map((parameter) => {
                return cacheSuccessResultForSelect(parameter.definition)
                    .then((result) => {
                        return { parameter, result };
                    });
            })
        );


        const controls = getControlStore(
            urlSearchParamsToArguments(getURLSearchParams()),
            definition.parameters,
            options
        );

        const statement = newlineBreak(
            normalize(
                definition.parameters,
                (typeof definition.statement == "string") ?
                    removeLineBeginningWhitespace(definition.statement) :
                    definition.statement
            )
        );

        viewStore.update((vs) => ({...vs, statement, controls}));
        return ctx;
    }
}


export function getLoadDefinition(
    cacheDefinition: Cache<EsqlateDefinition>,
    viewStore: Writable<ViewStore>
) {

    return async function loadDefinition(ctx: LoadDefinitionCtx): Promise<LoadedDefinitionCtx> {
        const definition = await cacheDefinition(ctx.params.definitionName);
        viewStore.update((vs) => ({...vs, showingMenu: false, definition}));
        return {...ctx, definition};
    };

}


export async function loadResults(fetcher: () => Promise<EsqlateSuccessResult>, viewStore: ViewStore, desiredState: EsqlateResult["status"][]): Promise<ViewStore> {

    function inDesiredState(statusStr: EsqlateResult["status"]) {
        return desiredState.indexOf(statusStr) > -1;
    }

    function calculateNewDelay(attemptsSoFar: number) {
        return attemptsSoFar * 300;
    }

    async function perform() {
        const j = await fetcher();
        if (inDesiredState(j.status)) {
            return {complete: true, value: j};
        }
        return {complete: false};
    }

    if (viewStore.result && inDesiredState(viewStore.result.status)) {
        return Promise.resolve({...viewStore });
    }

    return waitFor(perform, calculateNewDelay)
        .then((json: EsqlateSuccessResult) => {
            return {
                ...viewStore,
                result: {
                    ...viewStore.result,
                    ...json
                }
            };
        });
}
