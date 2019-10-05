import { getQuery, getRequest, postRequest, errorHandler } from "../ts-src/io";
import { getInputValues, getControlStoreValue, serializeValues } from "../ts-src/controls";
import { get as getStoreValue, writable, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, html, normalize, EsqlateDefinition, EsqlateArgument, EsqlateStatement, EsqlateCompleteResult } from "esqlate-lib";
import { Controls } from "../ts-src/types";

import test from 'tape';
import {getLoadDefinition} from '../ts-src/middleware';

test('getLoadDefinition - simplist', (assert) => {
    assert.plan(5);

    const unnormalizedStatement: EsqlateStatement = "SELECT * FROM customers\nWHERE\n  country = $country AND\n  LOWER(company_name) LIKE CONCAT('%', LOWER($search_string), '%') OR\n  LOWER(contact_name) LIKE CONCAT('%', LOWER($search_string), '%')";
    let controls: Writable<Controls> = writable({});
    let definition: Writable<EsqlateDefinition> = writable({
        "name": "",
        "title": "",
        "description": "",
        "parameters": [],
        "statement": ""
    });
    let statement: Writable<EsqlateStatementNormalized[]> = writable([]);
    const getQuery = () => [{ name: "search_string", value: "Rob" },{ name: "unused", value: "value" }];
    let requestedDefinitions: string[] = [];
    let demandedResults: string[] = [];

    const ctx = { params: { definitionName: "customer_search" } };
    function resultDemand(definitionName: EsqlateDefinition["name"], _args: EsqlateArgument[]) {
        demandedResults.push(definitionName);
        const r: EsqlateCompleteResult = {
            status: "complete",
            fields:[
                {"name":"display","type":"text"},
                {"name":"country","type":"varchar"},
                {"name":"count","type":"int8"}
            ],
            rows:[
                ["Argentina (3)","Argentina","3"],
                ["Austria (2)","Austria","2"],
                ["Belgium (2)","Belgium","2"]
            ]
        };
        return Promise.resolve(r);
    }

    function definitionRequest(name: string): Promise<EsqlateDefinition> {
        requestedDefinitions.push(name);
        return Promise.resolve({
            "name": "customer_search",
            "title": "Customer Search",
            "description": "List customers using a substring search",
            "parameters": [
                { "name": "search_string", "type": "string" },
                {
                    "name": "country",
                    "type": "select",
                    "definition": "customer_country_count",
                    "display_field": "display",
                    "value_field": "country",
                    "allow_null": false,
                }
            ],
            "statement": unnormalizedStatement
        });
    }

    const loadDefinition = getLoadDefinition(controls, definition, statement,definitionRequest, resultDemand, getQuery);

    loadDefinition(ctx)
        .then((_ctx) => {
            assert.is(
                (getStoreValue(definition) as EsqlateDefinition).name,
                "customer_search"
            );
            assert.is(
                (getStoreValue(statement) as EsqlateStatementNormalized[]).length,
                5
            );
            assert.deepEqual(
                requestedDefinitions,
                ["customer_search"]
            );
            assert.deepEqual(
                demandedResults,
                ["customer_country_count"]
            );
            assert.deepEqual(
                (getStoreValue(controls)),
                {
                    search_string: { value: "Rob" },
                    country: {
                        value: "",
                        options: [
                            { display: "Argentina (3)", value: "Argentina" },
                            { display: "Austria (2)", value: "Austria" },
                            { display: "Belgium (2)", value: "Belgium" },
                        ]
                    }
                }
            );
            assert.end();
        });


});
