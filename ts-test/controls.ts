import test from 'tape';
import { getControlStoreValue } from "../ts-src/controls";
import {EsqlateCompleteResult, EsqlateParameterString, EsqlateParameterInteger, EsqlateParameterSelect} from 'esqlate-lib';

test('getQuery', (assert) => {
    assert.plan(1);

    const result: EsqlateCompleteResult = {
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

    const selectParameter: EsqlateParameterSelect = {
        name: "c",
        type: "select",
        definition: "customer_country_count",
        display_field: "display",
        value_field: "country",
        allow_null: false,
    };

    assert.deepEqual(
        getControlStoreValue(
            { "b": "four" },
            [
                { name: "a", type: "integer" } as EsqlateParameterInteger,
                { name: "b", type: "string" } as EsqlateParameterString,
                selectParameter
            ],
            [ { parameter: selectParameter, result } ]
        ),
        {
            "a": { value: 0 },
            "b": { value: "four" },
            "c": {
                value: "Argentina",
                options: [
                    { display: "Argentina (3)", value: "Argentina" },
                    { display: "Austria (2)", value: "Austria" },
                    { display: "Belgium (2)", value: "Belgium" },
                ]
            }
        }
    );


});
