import { getRequest, postRequest } from "./io";
import { getInputValues, getControlStoreValue } from "./controls";
import { get as getStoreValue, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, normalize, EsqlateDefinition, EsqlateArgument, EsqlateRequestCreation, EsqlateResult, EsqlateParameterSelect, EsqlateParameter } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect, Controls } from "./types";

interface LoadDefinitionCtx { definition?: EsqlateDefinition, params: { definitionName: string } }


export async function loadDefinitionHTTP(definitionName: EsqlateDefinition["name"]): Promise<EsqlateDefinition> {

    const url = `/definition/${definitionName}`;
    const resp = await getRequest(url);
    return await resp.json();
}

export async function resultDemandHTTP(definitionName: EsqlateDefinition["name"], args: EsqlateArgument[]): Promise<EsqlateResult> {
    const data: EsqlateRequestCreation = { "arguments": args };
    const url = `/demand/${definitionName}`;
    return postRequest(url, data)
        .then(resp => resp.json());
}


export function getLoadDefinition(
    controls: Writable<Controls>,
    definition: Writable<EsqlateDefinition>,
    statement: Writable<EsqlateStatementNormalized[]>,
    definitionRequest: (url: string) => Promise<EsqlateDefinition>,
    resultDemand: (definitionName: EsqlateDefinition["name"], args: EsqlateArgument[]) => Promise<EsqlateResult>,
    getQuery: () => EsqlateArgument[]
) {

    return async function loadDefinition(ctx: LoadDefinitionCtx): Promise<LoadDefinitionCtx> {

        function getDefinition(): Promise<EsqlateDefinition> {
            if (getStoreValue(definition) &&
                ((getStoreValue(definition) as EsqlateDefinition).name == ctx.params.definitionName))
            {
                return Promise.resolve((getStoreValue(definition) as EsqlateDefinition));
            }
            return definitionRequest(ctx.params.definitionName)
        }


        function isParameterSelect(p: EsqlateParameter): boolean {
            return p.type == "select"
        }

        async function prepare(select: EsqlateParameter): Promise<OptionsForEsqlateParameterSelect> {
            if (select.type !== "select") {
                throw new Error("Was only expecting EsqlateParameterSelect");
            }
            const result = await resultDemand(select.definition, []);
            return { result, parameter: select };
        }


        const json = await getDefinition();
        const selects: OptionsForEsqlateParameterSelect[] = await Promise.all(json.parameters
            .filter(isParameterSelect)
            .map(prepare));

        controls.set(getControlStoreValue(getInputValues(getQuery()), json.parameters, selects));
        definition.set(json);
        statement.set(newlineBreak(normalize(json.parameters, json.statement)));
        return ctx;
    };

}


