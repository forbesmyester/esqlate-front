import { getRequest, postRequest } from "./io";
import { getControlStore, urlSearchParamsToArguments } from "./controls";
import { get as getStoreValue, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, normalize, EsqlateDefinition, EsqlateArgument, EsqlateRequestCreation, EsqlateResult, EsqlateParameterSelect, EsqlateParameter, EsqlateCompleteResult } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect, Controls } from "./types";
import { Cache } from "esqlate-cache";

interface LoadDefinitionCtx { definition?: EsqlateDefinition, params: { definitionName: string } }
interface LoadedDefinitionCtx { definition: EsqlateDefinition, params: { definitionName: string } }


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
    controlsWritable: Writable<Controls>,
    statementWritable: Writable<EsqlateStatementNormalized[]>,
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

        controlsWritable.set(getControlStore(urlSearchParamsToArguments(getURLSearchParams()), definition.parameters, options));
        statementWritable.set(newlineBreak(normalize(definition.parameters, definition.statement)));
        return ctx;
    }
}


export function getLoadDefinition(
    cacheDefinition: Cache<EsqlateDefinition>,
    definitionWritable: Writable<EsqlateDefinition>
) {

    return async function loadDefinition(ctx: LoadDefinitionCtx): Promise<LoadedDefinitionCtx> {
        const definition = await cacheDefinition(ctx.params.definitionName)
        definitionWritable.set(definition);
        return {...ctx, definition};
    };

}


