import { EsqlateArgument, EsqlateDefinition, EsqlateFieldDefinition, EsqlateParameter, EsqlateParameterSelect, EsqlateResult, EsqlateLink, EsqlateLinkItem, EsqlateCompleteResult } from "esqlate-lib";
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

export function addControlStoreToEsqlateArguments(cs: ControlStore, esqArg: EsqlateArgument[]): EsqlateArgument[] {
    const alreadyHave: Set<String> = new Set(esqArg.map((ea) => ea.name));
    return Object.getOwnPropertyNames(cs).reduce(
        (acc: EsqlateArgument[], k: string) => {
            if (alreadyHave.has(k)) { return acc; }
            return acc.concat([{ name: k, value: cs[k].value }]);
        },
        esqArg
    );
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
        if (options.some((op) => op.value == value)) { return value; }
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
    return Object.getOwnPropertyNames(values).map((k) => {
        const v = values[k].value;
        return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }).join('&');
}

export function normalizeLink(e: EsqlateLink): EsqlateLink {

    function worker(href: EsqlateLink["href"]): EsqlateLink["href"] {
        if (typeof href != "string") {
            return href;
        }
        let r: EsqlateLinkItem[] = [];
        let match: RegExpMatchArray | null;
        while (match = href.match(/(.*)\$\{([A-Z0-9a-z_ ]+)\}(.*)/)) {
            r.push({ type: "static", "static": match[1] });
            r.push({ type: "argument", "argument": match[2] });
            r.push({ type: "static", "static": match[3] });
            href = href.substr(match[0].length);
        }
        return r;
    }

    return {
        ...e,
        text: e.text ? worker(e.text) : worker(e.href),
        href: worker(e.href)
    }

}

interface EsqlateRow { [k: string]: number | string | boolean; }

export function asRow(rawRow: (number | string | boolean)[], fields: EsqlateCompleteResult["fields"]): EsqlateRow {
    return fields.reduce(
        (acc: EsqlateRow, field: EsqlateCompleteResult["fields"][0], index) => {
            return { ...acc, [field.name]: rawRow[index] };
        },
        {}
    );
}

function renderLinkText(s: EsqlateLinkItem[], row: EsqlateRow, escape: boolean) {
    if (typeof s == "string") {
        throw new Error("renderLink: Requires normalizeLink to be called first: " + s);
    }
    return s.reduce(
        (acc: string, ei: EsqlateLinkItem) => {
            if (ei.type == "static") { return acc + ei.static; }
                if (!row.hasOwnProperty(ei.argument)) {
                    throw new Error("renderLink: Missing argument: " + ei.argument + ": " + JSON.stringify(row));
                }
                return escape ?
                    (acc + encodeURIComponent(row[ei.argument])) :
                    acc + row[ei.argument];
        },
        ""
    );
}

interface EsqlateLinkForSvelte {
    text: string;
    href: string;
    class: string;
}

export function getLink(e: EsqlateLink, row: EsqlateRow): EsqlateLinkForSvelte {
    const text = e.hasOwnProperty("text") ? e.text as EsqlateLinkItem[]: e.href as EsqlateLinkItem[];
    return {
        text: renderLinkText(text, row, false),
        href: renderLinkText(e.href as EsqlateLinkItem[], row, true),
        class: e.hasOwnProperty("class") ? e.class as string : "",
    };

}
