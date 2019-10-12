import test from 'tape';
import { getControlStoreValue, normalizeLink, getLink, asRow, addBackValuesToControlStoreValue, ControlStoreInputValue, popBackFromArguments, pushBackToControlStore, EsqlateLinkNormalized } from "../ts-src/controls";
import { EsqlateCompleteResult, EsqlateLink, EsqlateParameterString, EsqlateParameterInteger, EsqlateParameterSelect, EsqlateArgument } from 'esqlate-lib';

test("normalizeEsqlateLink", (assert) => {

    const input: EsqlateLink = {
        href: "#request/customers?country=${country}&abc=$num"
    }

    const expected: EsqlateLinkNormalized = {
        class: "",
        href: [
            "#request/customers?country=",
            { type: "string", "name": "country" },
            "&abc=",
            { type: "string", "name": "num" },
        ],
        text: [
            "#request/customers?country=",
            { type: "string", "name": "country" },
            "&abc=",
            { type: "string", "name": "num" },
        ]
    };

    assert.plan(1);
    assert.deepEqual(normalizeLink(["country", "num"], input), expected);
    assert.end();

});

test("getLink", (assert) => {

    const link: EsqlateLinkNormalized = {
        href: [
            "#request/customers?country=",
            { type: "string", "name": "country" },
            "&abc=123",
        ],
        text: [
            "In ",
            { type: "string", name: "display" }
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
            [{name: "greeting", type: "string"}, {name: "age", type: "integer"}],
            [{name: "gender", value: "F"}]
        ),
        { greeting: "hi", age: 4, gender: "F" }
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

test('getControlStoreValue a bug', (assert) => {
    assert.plan(1);

    assert.deepEqual(
        getControlStoreValue(
            { "b": 10881 },
            [{ name: "b", type: "integer" } as EsqlateParameterInteger],
            []
        ),
        { "b": { value: 10881 } }
    );

});

test("addBackValuesToControlStoreValue", (assert) => {

    const inputControlStoreValue: { [k: string]: ControlStoreInputValue } = {
        "a": { value: "0" },
        "b": { value: "four" },
    };

    const inputQuery = [
        { name: "c", value: "integer" } as EsqlateArgument,
        { name: "_burl0", value: "bu1" } as EsqlateArgument,
        { name: "_burl1", value: "bu2" } as EsqlateArgument,
        { name: "_bname0", value: "bn1" } as EsqlateArgument,
        { name: "_bname1", value: "bn2" } as EsqlateArgument,
        { name: "_bfield0", value: "bf1" } as EsqlateArgument,
        { name: "_bfield1", value: "bf2" } as EsqlateArgument,
    ];

    const result = addBackValuesToControlStoreValue(
        inputQuery,
        inputControlStoreValue
    );

    const expectedResult = {
        "a": { value: "0" },
        "b": { value: "four" },
        "_burl0": { value: "bu1" },
        "_burl1": { value: "bu2" },
        "_bname0": { value: "bn1" },
        "_bname1": { value: "bn2" },
        "_bfield0": { value: "bf1" },
        "_bfield1": { value: "bf2" },
    };

    assert.deepEqual(
        result,
        expectedResult
    );
    assert.end();
});

test("popBackFromArguments", (assert) => {
    const inputQuery = [
        { name: "c", value: "integer" } as EsqlateArgument,
        { name: "_burl0", value: "bu1" } as EsqlateArgument,
        { name: "_burl1", value: "%2Fbu2" } as EsqlateArgument,
        { name: "_bname0", value: "bn1" } as EsqlateArgument,
        { name: "_bname1", value: "bn2" } as EsqlateArgument,
        { name: "_bfield0", value: "bf1" } as EsqlateArgument,
        { name: "_bfield1", value: "bf2" } as EsqlateArgument,
    ];
    const result = popBackFromArguments(inputQuery);

    assert.deepEqual(result, { name: "bn2", field: "bf2", url: "/bu2" });
    assert.end();
});


test("pushBackToControlStore", (assert) => {
    const inputQuery = {
        "c": { value: "integer" },
        "_burl0": { value: "bu1" },
        "_burl1": { value: "bu2" },
        "_bname0": { value: "bn1" },
        "_bname1": { value: "bn2" },
        "_bfield0": { value: "bf1" },
        "_bfield1": { value: "bf2" },
    };
    const result = pushBackToControlStore(inputQuery, { name: "bn3", field: "bf3", url: "bu3" });

    assert.deepEqual(
        result,
        {
            "c": { value: "integer" },
            "_burl0": { value: "bu1" },
            "_burl1": { value: "bu2" },
            "_burl2": { value: "bu3" },
            "_bname0": { value: "bn1" },
            "_bname1": { value: "bn2" },
            "_bname2": { value: "bn3" },
            "_bfield0": { value: "bf1" },
            "_bfield1": { value: "bf2" },
            "_bfield2": { value: "bf3" },
        }
    );
    assert.end();
});


