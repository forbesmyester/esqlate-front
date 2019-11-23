import { getRequest, postRequest, errorHandler } from "../ts-src/io";
import getCache from "esqlate-cache";
import { getControlStore, urlSearchParamsToArguments } from "../ts-src/controls";
import { get as getStoreValue, writable, Writable } from 'svelte/store';
import { EsqlateStatementNormalized, newlineBreak, html, normalize, EsqlateDefinition, EsqlateStatement, EsqlateResult, EsqlateSuccessResult } from "esqlate-lib";
import { EsqlateQueryComponent } from "../ts-src/types";

import test from 'tape';
import {getInitilizeControls, getLoadDefinition, getInitialViewStore, ViewStore, loadResults} from '../ts-src/middleware';

test('getLoadDefinition - simplist', (assert) => {
    assert.plan(5);

    const unnormalizedStatement: EsqlateStatement = "SELECT * FROM customers\nWHERE\n  country = $country AND\n  LOWER(company_name) LIKE CONCAT('%', LOWER($search_string), '%') OR\n  LOWER(contact_name) LIKE CONCAT('%', LOWER($search_string), '%')";
    let viewStore: Writable<ViewStore> = writable({
        ...getInitialViewStore(),
        definition: {
            "name": "",
            "title": "",
            "description": "",
            "parameters": [],
            "statement": ""
        }
    });
    const getURLSearchParams = () => new URLSearchParams("?search_string=Rob&unused=value");
    let requestedDefinitions: string[] = [];
    let demandedResults: string[] = [];

    const ctx = { params: { definitionName: "customer_search" } };

    function resultDemand(definitionName: EsqlateDefinition["name"], _args: EsqlateQueryComponent[]): Promise<EsqlateSuccessResult> {
        demandedResults.push(definitionName);
        const r: EsqlateSuccessResult = {
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


    const cacheDefinition = getCache(definitionRequest);
    const cacheSuccessResultForSelect = getCache(resultDemand);

    const loadDefinition = getLoadDefinition(cacheDefinition, viewStore);
    const initializeControls = getInitilizeControls(viewStore, getURLSearchParams, cacheSuccessResultForSelect);

    loadDefinition(ctx)
        .then(initializeControls)
        .then((_ctx) => {
            assert.is(
                (getStoreValue(viewStore).definition as EsqlateDefinition).name,
                "customer_search"
            );
            assert.is(
                (getStoreValue(viewStore).statement as EsqlateStatementNormalized[]).length,
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
                (getStoreValue(viewStore).controls),
                {
                    search_string: { value: "Rob" },
                    country: {
                        value: "Argentina",
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


test('loadResults - already have - do nothing', (assert) => {

    const viewStore: ViewStore = {
        ...getInitialViewStore(),
        definition: {
            "name": "",
            "title": "",
            "description": "",
            "parameters": [],
            "statement": ""
        },
        result: {
            fields: [],
            full_data_set: false,
            full_format_urls: [{ type: "application/csv", location: "x" }],
            rows: [],
            status: "complete",
        }
    };

    function fetcher (): Promise<EsqlateSuccessResult> {
        return Promise.reject(new Error("Should not be called"));

    };

    assert.plan(1);

    loadResults(fetcher, viewStore, ["complete"])
        .then((result) => {
            assert.deepEqual(
                result,
                {...viewStore }
            );
        });
})


test('loadResults - do summat', (assert) => {

    const viewStore: ViewStore = {
        ...getInitialViewStore(),
        definition: {
            "name": "",
            "title": "",
            "description": "",
            "parameters": [],
            "statement": ""
        },
        result: {
            fields: [],
            full_data_set: false,
            rows: [],
            status: "preview",
        }
    };

    let attempts = 0;

    function fetcher (): Promise<EsqlateSuccessResult> {
        let extra = {};
        if (++attempts > 2) {
            extra = {
                status: "complete",
                full_format_urls: [
                    { type: "text/csv", location: "x" }
                ],
            };
        }
        return Promise.resolve({
            fields: [],
            full_data_set: false,
            rows: [],
            status: "preview",
            ...extra
        });

    };

    assert.plan(2);

    loadResults(fetcher, viewStore, ["complete"])
        .then((result) => {
        assert.is(attempts, 3);
        assert.deepEqual(result, {
                ...viewStore,
                result: {
                    fields: [],
                    full_data_set: false,
                    rows: [],
                    status: "complete",
                    full_format_urls: [
                        {
                            type: "text/csv",
                            location: "x"
                        }
                    ]
                }
            });
        });
})
