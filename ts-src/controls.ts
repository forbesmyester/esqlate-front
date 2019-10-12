import { normalize, EsqlateArgument, EsqlateDefinition, EsqlateFieldDefinition, EsqlateParameter, EsqlateParameterSelect, EsqlateResult, EsqlateLink, EsqlateCompleteResult, EsqlateStatementNormalized, EsqlateParameterString } from "esqlate-lib";
import { OptionsForEsqlateParameterSelect } from "./types";

export type EsqlateLinkNormalized = {
    text: EsqlateStatementNormalized;
    href: EsqlateStatementNormalized;
    class: string;
}

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

export interface ControlStoreInputValue { value: string; }
export interface ControlStoreSelectValue {
    value: string;
    options: { value: string, display: string}[];
}

export interface ControlStore {
    [k: string]: ControlStoreInputValue | ControlStoreSelectValue;
}

export function addControlStoreToEsqlateArguments(cs: ControlStore, esqArg: EsqlateArgument[]): EsqlateArgument[] {
    const fromCs: Set<String> = new Set(Object.getOwnPropertyNames(cs));
    return Object.getOwnPropertyNames(cs).reduce(
        (acc: EsqlateArgument[], k: string) => {
            return acc.concat([{ name: k, value: cs[k].value }]);
        },
        esqArg.filter(({ name }) => !fromCs.has(name))
    );
}

export function getControlStoreValue(
    inputValues: { [k: string]: any },
    esqlateDefinitionParameters: EsqlateParameter[],
    optionsForSelect: OptionsForEsqlateParameterSelect[]
): ControlStore {

    function getOptions(parameter: EsqlateParameterSelect): ControlStoreSelectValue["options"] {
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

    function selectSetValue(value: ControlStoreSelectValue["value"], options: ControlStoreSelectValue["options"]): ControlStoreSelectValue["value"] {
        if (options.some((op) => op.value == value)) { return value; }
        if (options.length) { return options[0].value; }
        return "";
    }

    function reducer(acc: ControlStore, item: EsqlateParameter): ControlStore {
        let value: any = item.type == "integer" ? 0 : "";
        if (inputValues.hasOwnProperty(item.name)) {
            value = inputValues[item.name];
        }

        if (item.type == "select") {
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

export function serializeValues(values: EsqlateArgument[]) {
    return values.map((ea) => {
        return `${encodeURIComponent(ea.name)}=${encodeURIComponent(ea.value)}`;
    }).join('&');
}

export function normalizeLink(namesOfFields: string[], e: EsqlateLink): EsqlateLinkNormalized {

    const params: EsqlateParameterString[] = namesOfFields.map(
        (n) => ({ type: "string", name: n })
    );

    return {
        class: e.hasOwnProperty("class") ? e.class as string : "",
        text: e.text ? normalize(params, e["text"]) : normalize(params, e["href"]),
        href: normalize(params, e["href"])
    }

}

interface EsqlateRow { [k: string]: number | string | boolean; }

export function asRow(rawRow: (number | string | boolean)[], fields: EsqlateCompleteResult["fields"], args: EsqlateArgument[]): EsqlateRow {
    const argsAsOb = args.reduce(
        (acc, arg) => {
            return {...acc, [arg.name]: arg.value };
        },
        {}
    );
    return fields.reduce(
        (acc: EsqlateRow, field: EsqlateCompleteResult["fields"][0], index) => {
            return { ...acc, [field.name]: rawRow[index] };
        },
        argsAsOb
    )
}

function renderLinkText(s: EsqlateLinkNormalized["text"], row: EsqlateRow, escape: boolean) {
    if (typeof s == "string") {
        throw new Error("renderLink: Requires normalizeLink to be called first: " + s);
    }
    return s.reduce(
        (acc: string, ei) => {
            if (typeof ei == "string") {
                return acc = acc + ei;
            }
            return escape ?
                (acc + encodeURIComponent(row[ei.name])) :
                acc + row[ei.name];
        },
        ""
    );
}

interface EsqlateLinkForSvelte {
    text: string;
    href: string;
    class: string;
}


export function getLink(e: EsqlateLinkNormalized, row: EsqlateRow): EsqlateLinkForSvelte {
    const text = e.hasOwnProperty("text") ? e.text : e.href;
    return {
        text: renderLinkText(text, row, false),
        href: renderLinkText(e.href, row, true),
        class: e.hasOwnProperty("class") ? e.class as string : "",
    };

}


export function addBackValuesToControlStoreValue(qry: EsqlateArgument[], csv: ControlStore): ControlStore {
    return qry.reduce(
        (acc: ControlStore, esqArg: EsqlateArgument) => {
            const m = esqArg.name.match(/^_b[a-z]{1,9}([0-9]{1,3})/);
            if (!m) { return acc; }
            return { ...acc, [m[0]]: { value: "" + esqArg.value } }
        },
        csv
    );
}


type BackUrl = {
    url: string;
    field: string; // Field to set upon return
    name: string; // The definition name
}


function getBackNumber(qry: EsqlateArgument[]): number {
    return qry.reduce(
        (acc, esqArg) => {
            const m = esqArg.name.match(/^_burl([0-9]{1,3})/);
            if (!m) { return acc; }
            if (parseInt(m[1]) > acc) {
                return parseInt(m[1]);
            }
            return acc;
        },
        -1
    );
}

export function popBackFromArguments(qry: EsqlateArgument[]): BackUrl {
    const desiredNumber = getBackNumber(qry);
    if ((desiredNumber < 0)) {
        throw new Error("popBackFromArguments: No back links found")
    }
    return qry.reduce(
        (acc, esqArg) => {
            const m = esqArg.name.match(/^_b([a-z]{0,9})([0-9]{1,3})/);
            if (!m) { return acc; }
            if (parseInt(m[2]) == desiredNumber) {
                return { ...acc, [m[1]]: decodeURIComponent(esqArg.value as string) }
            }
            return acc;
        },
        { url: '', field: '', name: '' }
    );
}


export function pushBackToControlStore(qry: ControlStore, url: BackUrl): ControlStore {
    const desiredNumber: number = Object.getOwnPropertyNames(qry).reduce(
        (acc, esqArg) => {
            const m = esqArg.match(/^_burl([0-9]{1,3})/);
            if (!m) { return acc; }
            if (parseInt(m[1]) > acc) {
                return parseInt(m[1]);
            }
            return acc;
        },
        -1
    );
    return {...qry,
        ["_burl" + (desiredNumber + 1)]: { value: url.url },
        ["_bfield" + (desiredNumber + 1)]: { value: url.field },
        ["_bname" + (desiredNumber + 1)]: { value: url.name }
    };
}
