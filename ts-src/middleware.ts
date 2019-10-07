import { getRequest, postRequest } from "./io";
import { getInputValues, getControlStoreValue } from "./controls";
import { get as getStoreValue, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, normalize, EsqlateDefinition, EsqlateArgument, EsqlateRequestCreation, EsqlateResult, EsqlateParameterSelect, EsqlateParameter } from "esqlate-lib";
import { Cache, OptionsForEsqlateParameterSelect, Controls } from "./types";

interface LoadDefinitionCtx { definition?: EsqlateDefinition, params: { definitionName: string } }


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


export function getLoadDefinition(
    controls: Writable<Controls>,
    definition: Writable<EsqlateDefinition>,
    statement: Writable<EsqlateStatementNormalized[]>,
    getQuery: () => EsqlateArgument[],
    cache: Cache
) {

    return async function loadDefinition(ctx: LoadDefinitionCtx): Promise<LoadDefinitionCtx> {

        const json = await cache.definition(ctx.params.definitionName);

        const selects = <EsqlateParameterSelect[]>json.parameters.filter((p) => {
            return p.type == "select"
        });

        const options: OptionsForEsqlateParameterSelect[] = await Promise.all(
            selects.map((parameter) => {
                return cache.selectResult(parameter.definition)
                    .then((result) => {
                        return { parameter, result };
                    });
            })
        );

        controls.set(getControlStoreValue(getInputValues(getQuery()), json.parameters, options));
        definition.set(json);
        statement.set(newlineBreak(normalize(json.parameters, json.statement)));
        return ctx;
    };

}


