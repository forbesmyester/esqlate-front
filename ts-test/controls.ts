import test from 'tape';
import { getControlStoreValue, normalizeLink, getLink, asRow } from "../ts-src/controls";
import { EsqlateCompleteResult, EsqlateLink, EsqlateParameterString, EsqlateParameterInteger, EsqlateParameterSelect } from 'esqlate-lib';

test("normalizeEsqlateLink", (assert) => {

    const input: EsqlateLink = {
        href: "#request/customers?country=${country}&abc=123"
    }

    const expected: EsqlateLink = {
        href: [
            { type: "static", "static": "#request/customers?country=" },
            { type: "argument", "argument": "country" },
            { type: "static", "static": "&abc=123" },
        ],
        text: [
            { type: "static", "static": "#request/customers?country=" },
            { type: "argument", "argument": "country" },
            { type: "static", "static": "&abc=123" },
        ]
    };

    assert.plan(1);
    assert.deepEqual(normalizeLink(input), expected);
    assert.end();

});

test("renderLink", (assert) => {

    const link: EsqlateLink = {
        href: [
            { type: "static", "static": "#request/customers?country=" },
            { type: "argument", "argument": "country" },
            { type: "static", "static": "&abc=123" },
        ],
        text: [
            { type: "static", "static": "In " },
            { type: "argument", "argument": "display" },
        ],
        class: "zz"
    };

    const expected = {
        class: "zz",
        href: "#request/customers?country=H%26M&abc=123",
        text: "In H and M"
    };

    assert.plan(1);
    assert.deepEqual(getLink(link, { country: "H&M", display: "H and M" }), expected);
    assert.end();
});

test('asRow', (assert) => {
    assert.plan(1);
    assert.deepEqual(
        asRow(
            ["hi", 4],
            [{name: "greeting", type: "string"}, {name: "age", type: "integer"}]
        ),
        { greeting: "hi", age: 4 }
    );
});

test('getControlStoreValue', (assert) => {
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
