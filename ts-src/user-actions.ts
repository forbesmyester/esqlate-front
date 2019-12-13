import {EsqlateDefinition, EsqlateParameterPopup, EsqlateParameterString, EsqlateSuccessResult, EsqlateSuccessResultRow} from 'esqlate-lib';
import { EsqlateQueryComponent } from './types';
import {ControlStore, serializeValues, addControlStoreToEsqlateQueryComponents, addBackValuesToControlStore, pushBackToControlStore, popBackFromArguments, urlSearchParamsToArguments} from './controls';

export function getPopupLinkCreator(getURLSearchParams: () => URLSearchParams) {
    return function popup(parameterName: string, definition: EsqlateDefinition, controls: ControlStore) {
        const definitionName = definition.name;
        const parameter: EsqlateParameterPopup = definition.parameters
            .reduce((acc, p) => {
                return p.name == parameterName ? p : acc;
            }) as EsqlateParameterPopup;

        if (!parameter) {
            throw new Error(`Could not find Select(name=${parameterName})`);
        }

        const qs = serializeValues(
            addControlStoreToEsqlateQueryComponents(
                controls,
                []
            )
        );
        const backRoute = encodeURIComponent(
            `/${encodeURIComponent(definitionName)}?${qs}`
        );

        const existingBack = addBackValuesToControlStore(urlSearchParamsToArguments(getURLSearchParams()), {});
        const newBacks = pushBackToControlStore(
            existingBack,
            {
                url: backRoute,
                def: definitionName,
                fld: parameter.name,
                val: parameter.value_field,
                dis: parameter.display_field
            }
        );
        const newQs = serializeValues(
            addControlStoreToEsqlateQueryComponents(
                newBacks,
                []
            )
        );

        return `/${encodeURIComponent(parameter.definition)}?${newQs}`
    }
}

export function pick(row: EsqlateSuccessResultRow, query: EsqlateQueryComponent[], fields: EsqlateSuccessResult["fields"], setNull: boolean = false) {

    const back = popBackFromArguments(query);

    function getFieldIndex(desiredFieldName: string) {
        return fields.reduce(
            (acc, f, i) => {
                if (f.name == desiredFieldName) {
                    return i
                }
                return acc;
            },
            -1
        );
    }

    function getEncodedValue() {
        const valueIndex = getFieldIndex(back.val);
        const displayIndex = getFieldIndex(back.dis);

        if (valueIndex == -1) {
            throw new Error(`Return is a field that doesn't exist ${back.val}`);
        }

        return encodeURIComponent(row[valueIndex]) + " " +
            encodeURIComponent(row[displayIndex])
    }

    const usp = new URLSearchParams(back.url.replace(/.*\?/, ''));
    const newQsValues = urlSearchParamsToArguments(usp)
        .filter((esqArg) => esqArg.name != back.fld)
        .concat([{
            name: back.fld,
            val: setNull ? "" : getEncodedValue(),
        }]);

    const qs = serializeValues(
        addControlStoreToEsqlateQueryComponents(
            {},
            newQsValues
        )
    );

    return `/${encodeURIComponent(back.def)}?${qs}`
}
