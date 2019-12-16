import { rawParse, EsqlateArgument, EsqlateDefinition, EsqlateFieldDefinition, EsqlateParameter, EsqlateParameterSelect, EsqlateLink, EsqlateStatementNormalized, EsqlateSuccessResult, ParsedType } from "esqlate-lib";
import { EsqlateQueryComponent, OptionsForEsqlateParameterSelect } from "./types";

export interface EsqlateLinkVariable {
    fun: string;
    namesOfFields: string[];
}

type EsqlateLinkAttribute = (EsqlateLinkVariable | string)[];

export type EsqlateLinkNormalized = {
    text: EsqlateLinkAttribute;
    href: EsqlateLinkAttribute;
    class: string;
}


export interface ControlStoreInputValue { value: string; }
export interface ControlStoreSelectValue {
    value: string;
    options: { value: string, display: string}[];
}
type ControlStoreItem = ControlStoreInputValue | ControlStoreSelectValue;
export interface ControlStore {
    [k: string]: ControlStoreItem;
}


export function urlSearchParamsToArguments(url: URLSearchParams): EsqlateQueryComponent[] {

    let o = [];
    for (let [k, v] of url.entries()) {
        o.push({ name: k, val: v});
    }
    return o;

}


/**
 * Merges `esqArg` and `cs` with cs taking precedence.
 */
export function addControlStoreToEsqlateQueryComponents(cs: ControlStore, esqArg: EsqlateQueryComponent[]): EsqlateQueryComponent[] {
    const fromCs: Set<String> = new Set(Object.getOwnPropertyNames(cs));

    function getValue(o: ControlStoreItem) {
        if (!o.hasOwnProperty("value")) {
            return "";
        }
        return o.value;
    }

    return Object.getOwnPropertyNames(cs).reduce(
        (acc: EsqlateQueryComponent[], k: string) => {
            return acc.concat([{ name: k, val: getValue(cs[k]) }]);
        },
        esqArg.filter(({ name }) => !fromCs.has(name))
    );
}

export function getControlStore(
    query: EsqlateQueryComponent[],
    esqlateDefinitionParameters: EsqlateParameter[],
    optionsForSelect: OptionsForEsqlateParameterSelect[]
): ControlStore {

    const inputValues: Map<string, EsqlateQueryComponent["val"]> = query.reduce(
        (acc, { name, val }: EsqlateQueryComponent) => {
            acc.set(name, val);
            return acc;
        },
        new Map()
    );

    function getOptions(parameter: EsqlateParameterSelect): ControlStoreSelectValue["options"] {
        const ps = optionsForSelect.filter(o => o.parameter.name == parameter.name);
        if (ps.length === 0) { return []; }
        const result = ps[0].result;
        if ((result.status != "preview") && (result.status != "complete")) {
            return []
        }
        let valueIndex = -1;
        let displayIndex = -1;
        result.fields.forEach((fld: EsqlateFieldDefinition, index: number) => {
            if (fld.name == parameter.value_field) { valueIndex = index; }
            if (fld.name == parameter.display_field) { displayIndex = index; }
        })
        if ((valueIndex == -1) || (displayIndex == -1)) {
            return [];
        }
        return (result.rows).map((row) => {
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
        let value: any = "";
        if (inputValues.has(item.name)) {
            value = inputValues.get(item.name);
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

export function serializeValues(values: EsqlateQueryComponent[]) {
    return values.map((ea) => {
        const v = (ea.val === undefined) ? "" : encodeURIComponent(ea.val);
        return `${encodeURIComponent(ea.name)}=${v}`;
    }).join('&');
}

export function normalizeLink(namesOfFields: string[], e: EsqlateLink): EsqlateLinkNormalized {

    const params: Set<string> = new Set(namesOfFields.map((n) => n));

    const parameterCounts: { [k: string]: number } = {
        "noop": 1,
        "popup": 2,
    };

    function process(textOrHref: string): EsqlateLinkAttribute {
        const parsed = rawParse(textOrHref);
        return parsed.map((par) => {
            if (par.type == ParsedType.TEXT) {
                return par.text;
            }
            if (parameterCounts[par.function] != par.variable.length) {
                throw new Error(`Function ${par.function} takes ${parameterCounts[par.function]} parameters`);
            }
            par.variable.forEach((v) => {
                if (!params.has(v)) {
                    throw new Error("Variable ${v} in link template, but not a known variable");
                }
            });
            return { namesOfFields: par.variable, fun: par.function }
        });
    }


    return {
        class: e.hasOwnProperty("class") ? e.class as string : "",
        text: e.text ? process(e["text"]) : process(e["href"]),
        href: process(e["href"])
    }

}

interface EsqlateRow { [k: string]: number | string | boolean; }

export function asRow(rawRow: (number | string | boolean)[], fields: EsqlateSuccessResult["fields"], args: EsqlateQueryComponent[]): EsqlateRow {
    const argsAsOb = args.reduce(
        (acc, arg) => {
            return {...acc, [arg.name]: arg.val };
        },
        {}
    );
    return fields.reduce(
        (acc: EsqlateRow, field: EsqlateSuccessResult["fields"][0], index) => {
            return { ...acc, [field.name]: rawRow[index] };
        },
        argsAsOb
    )
}

function renderLinkText(s: EsqlateLinkNormalized["text"], row: EsqlateRow, escape: boolean) {
    if (typeof s == "string") {
        throw new Error("renderLink: Requires normalizeLink to be called first: " + s);
    }

    function getParameters(nofs: EsqlateLinkVariable["namesOfFields"]): string[] {
        return nofs.map((nof) => {
            return "" + row[nof] || "";
        });
    }

    function callF(ela: EsqlateLinkVariable): string {
        if (ela.fun == "noop") {
            return getParameters(ela.namesOfFields)[0];
        }
        if (ela.fun == "popup") {
            const params = getParameters(ela.namesOfFields);
            if (params.length != 2) {
                throw new Error(
                    "generation of a popup link requires 2 params"
                );
            }
            return encodeURIComponent(params[0]) + " " +
                encodeURIComponent(params[1]);
        }
        throw new Error(`Unknown function '${ela.fun}'`);
    }

    return s.reduce(
        (acc: string, ei) => {
            if (typeof ei == "string") {
                return acc = acc + ei;
            }
            if (escape) {
                return acc + encodeURIComponent(callF(ei));
            }
            return acc + callF(ei);
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


export function addBackValuesToControlStore(qry: EsqlateQueryComponent[], csv: ControlStore): ControlStore {
    return qry.reduce(
        (acc: ControlStore, esqArg: EsqlateQueryComponent) => {
            const m = esqArg.name.match(/^_b[a-z]{1,9}([0-9]{1,3})/);
            if (!m) { return acc; }
            return { ...acc, [m[0]]: { value: "" + esqArg.val } }
        },
        csv
    );
}


type BackUrl = {
    url: string;
    fld: string; // Field to set upon return
    def: string; // The definition name
    dis: string; // The name of the field to show in the input upon return
    val: string; // The value that the input is set to upon return.
}


function getBackNumber(qry: EsqlateQueryComponent[]): number {
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

export function popBackFromArguments(qry: EsqlateQueryComponent[]): BackUrl {
    const desiredNumber = getBackNumber(qry);
    if ((desiredNumber < 0)) {
        throw new Error("popBackFromArguments: No back links found")
    }
    return qry.reduce(
        (acc, esqArg) => {
            const m = esqArg.name.match(/^_b([a-z]{0,9})([0-9]{1,3})/);
            if (!m) { return acc; }
            if (parseInt(m[2]) == desiredNumber) {
                return { ...acc, [m[1]]: decodeURIComponent(esqArg.val as string) }
            }
            return acc;
        },
        { url: '', fld: '', def: '', dis: '', val: ''  }
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
        ["_bfld" + (desiredNumber + 1)]: { value: url.fld },
        ["_bdef" + (desiredNumber + 1)]: { value: url.def },
        ["_bdis" + (desiredNumber + 1)]: { value: url.dis },
        ["_bval" + (desiredNumber + 1)]: { value: url.val },
    };
}

export function queryComponentsToArguments(params: EsqlateDefinition["parameters"], queryComps: EsqlateQueryComponent[]): EsqlateArgument[] {

    // Popups are treated specially as thier value is urlencoded in the UI.
    const popups: Set<string> = new Set(
        params
            .filter((p) => p.type == "popup")
            .map((p) => p.name)
    );

    const mapper = (qc: EsqlateQueryComponent) => {
        const v = qc.val === undefined ? "" : qc.val;
        if (popups.has(qc.name)) {
            const value = decodeURIComponent(
                ("" + v).replace(/ .*/, "")
            );
            return { name: qc.name, value };
        }
        return { name: qc.name, value: v }
    };

    const filterer = (a: EsqlateArgument) => {
        return a.name.substring(0, 1) !== "#"
    }

    return queryComps.map(mapper).filter(filterer);
}

