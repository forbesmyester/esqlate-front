import {EsqlateDefinition, EsqlateParameterPopup, EsqlateArgument, EsqlateCompleteResult} from 'esqlate-lib';
import {ControlStore, serializeValues, addControlStoreToEsqlateArguments, addBackValuesToControlStore, pushBackToControlStore, popBackFromArguments, urlSearchParamsToArguments} from './controls';
import { getURLSearchParams } from './io';

export function popup(parameterName: string, definition: EsqlateDefinition, controls: ControlStore) {
    const definitionName = definition.name;
    const parameter: EsqlateParameterPopup = definition.parameters
        .reduce((acc, p) => {
            return p.name == parameterName ? p : acc;
        }) as EsqlateParameterPopup;

    if (!parameter) {
        throw new Error(`Could not find Select(name=${parameterName})`);
    }

    const qs = serializeValues(addControlStoreToEsqlateArguments(controls, []));
    const backRoute = encodeURIComponent(
        `/${encodeURIComponent(definitionName)}?${qs}`
    );

    const existingBack = addBackValuesToControlStore(urlSearchParamsToArguments(getURLSearchParams()), {});
    const newBacks = pushBackToControlStore(
        existingBack,
        {
            url: backRoute,
            name: definitionName,
            field: parameter.name
        }
    );
    const newQs = serializeValues(addControlStoreToEsqlateArguments(newBacks, []));

    return `/${encodeURIComponent(parameter.definition)}?${newQs}`
}

export function pick(row: {[x: string]: any;}, query: EsqlateArgument[], result: EsqlateCompleteResult) {

    const back = popBackFromArguments(query);
    const fieldIndex = result.fields.reduce(
        (acc, f, i) => {
            if (f.name == back.field) {
                return i
            }
            return acc;
        },
        -1
    );

    if (fieldIndex == -1) {
        throw new Error(`Return is a field that doesn't exist ${back.field}`);
    }

    const newQsValues = urlSearchParamsToArguments(new URLSearchParams(back.url.replace(/.*\?/, '')))
        .filter((esqArg) => esqArg.name != back.field)
        .concat([{ name: back.field, value: row[fieldIndex] }]);

    const qs = serializeValues(addControlStoreToEsqlateArguments({}, newQsValues))

    return `/${encodeURIComponent(back.name)}?${qs}`
}
