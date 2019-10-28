import { getRequest, postRequest } from "./io";
import { getControlStore, urlSearchParamsToArguments } from "./controls";
import { get as getStoreValue, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, normalize, removeLineBeginningWhitespace, EsqlateDefinition, EsqlateRequestCreation, EsqlateResult, EsqlateParameterSelect, EsqlateParameter, EsqlateCompleteResult } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect, Controls } from "./types";
import { Cache } from "esqlate-cache";

interface LoadDefinitionCtx { definition?: EsqlateDefinition, params: { definitionName: string } }
interface LoadedDefinitionCtx { definition: EsqlateDefinition, params: { definitionName: string } }


export interface ViewStore {
    definition: EsqlateDefinition;
    statement: EsqlateStatementNormalized[];
    result: EsqlateResult | false;
    controls: Controls;
    asPopup: boolean;
    menu: { title: string; name: string }[];
}

export function getInitialViewStore(): ViewStore {
    return {
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
    cacheCompleteResultForSelect: Cache<EsqlateCompleteResult>
) {
    return async function loadDefinition(ctx: LoadedDefinitionCtx): Promise<LoadedDefinitionCtx> {

        const definition: EsqlateDefinition = ctx.definition;

        const selects = <EsqlateParameterSelect[]>definition.parameters.filter((p) => {
            return p.type == "select"
        });

        const options: OptionsForEsqlateParameterSelect[] = await Promise.all(
            selects.map((parameter) => {
                return cacheCompleteResultForSelect(parameter.definition)
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
        viewStore.update((vs) => ({...vs, definition}));
        return {...ctx, definition};
    };

}


