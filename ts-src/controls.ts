import { EsqlateArgument, EsqlateDefinition, EsqlateFieldDefinition, EsqlateParameter, EsqlateParameterSelect, EsqlateResult } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect } from "./types";

/**
 * Takes the values from io/getQuery() and converts them into a simple KV pair.
 */
export function getInputValues(query: EsqlateArgument[]): { [k: string]: any } {
   return query.reduce(
        (acc: { [k: string]: any }, { name, value }: any) => {
            return { ...acc, [name]: value };
        },
        {}
    );
}

interface InputControlStore { value: string; }
interface SelectControlStore {
    value: string | number;
    options: { value: string | number , display: string | number }[];
}

interface ControlStore {
    [k: string]: InputControlStore | SelectControlStore;
}

export function getControlStoreValue(
    inputValues: { [k: string]: any },
    esqlateDefinitionParameters: EsqlateParameter[],
    optionsForSelect: OptionsForEsqlateParameterSelect[]
): ControlStore {

    function getOptions(parameter: EsqlateParameterSelect): SelectControlStore["options"] {
        const ps = optionsForSelect.filter(o => o.parameter.name == parameter.name);
        if (ps.length === 0) { return []; }
        if (ps[0].result.status != "complete") { return [] } // TODO: Throw?
        let valueIndex = -1;
        let displayIndex = -1;
        ps[0].result.fields.forEach((fld: EsqlateFieldDefinition, index: number) => {
            if (fld.name == parameter.value_field) { valueIndex = index; }
            if (fld.name == parameter.display_field) { displayIndex = index; }
        })
        if ((valueIndex == -1) || (displayIndex == -1)) {
            return [];
        }
        return (ps[0].result.rows).map((row) => {
            return {
                display: "" + row[displayIndex],
                value: "" + row[valueIndex]
            }
        });
    }

    function selectSetValue(value: SelectControlStore["value"], options: SelectControlStore["options"]): SelectControlStore["value"] {
        if (options.some((op) => { op.value == value })) { return value; }
        if (options.length) { return options[0].value; }
        return "";
    }

    function reducer(acc: ControlStore, item: EsqlateParameter): ControlStore {
        let value: any = "";
        if (inputValues.hasOwnProperty(item.name)) {
            value = inputValues[item.name];
        }
        switch (item.type) {
            case "integer":
                value = 0;
                break;
            case "select":
                const options = getOptions(item as EsqlateParameterSelect);
                return {...acc,
                    [item.name]: {
                        options,
                        value: selectSetValue(value, options)
                    }
                }
        }
        return { ...acc, [item.name]: { value } };
    }

    return esqlateDefinitionParameters.reduce(reducer, {});

}

export function serializeValues(values: ControlStore) {
    console.log(values);
    return Object.getOwnPropertyNames(values).map((k) => {
        const v = values[k].value;
        return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }).join('&');
}
