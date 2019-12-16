import test from 'tape';
import { getControlStore, normalizeLink, getLink, asRow, addBackValuesToControlStore, ControlStoreInputValue, popBackFromArguments, pushBackToControlStore, EsqlateLinkNormalized, queryComponentsToArguments } from "../ts-src/controls";
import { EsqlateSuccessResult, EsqlateLink, EsqlateParameterString, EsqlateParameterInteger, EsqlateParameterSelect, EsqlateDefinition, EsqlateArgument } from 'esqlate-lib';
import { EsqlateQueryComponent } from '../ts-src/types';

test("normalizeLink", (assert) => {

    // Just HREF
    assert.deepEqual(
        normalizeLink(
            ["country", "num"],
            { href: "#request/customers?country=${country}&abc=$num" }
        ),
        {
            class: "",
            href: [
                "#request/customers?country=",
                { fun: "noop", namesOfFields: ["country"] },
                "&abc=",
                { fun: "noop", namesOfFields: ["num"] },
            ],
            text: [
                "#request/customers?country=",
                { fun: "noop", namesOfFields: ["country"] },
                "&abc=",
                { fun: "noop", namesOfFields: ["num"] },
            ]
        }
    );

    // With Text
    assert.deepEqual(
        normalizeLink(
            ["country", "num"],
            {
                href: "#request/customers?country=${noop country}&abc=$num",
                text: "Hello $num"
            }
        ),
        {
            class: "",
            href: [
                "#request/customers?country=",
                { fun: "noop", namesOfFields: ["country"] },
                "&abc=",
                { fun: "noop", namesOfFields: ["num"] },
            ],
            text: [
                "Hello ",
                { fun: "noop", namesOfFields: ["num"] },
            ]
        }
    );

    // As Popup
    assert.deepEqual(
        normalizeLink(
            ["country_id", "country", "num"],
            {
                href: "#request/customers?country=${popup country_id country}&abc=$num",
                text: "Hello $num"
            }
        ),
        {
            class: "",
            href: [
                "#request/customers?country=",
                { fun: "popup", namesOfFields: ["country_id", "country"] },
                "&abc=",
                { fun: "noop", namesOfFields: ["num"] },
            ],
            text: [
                "Hello ",
                { fun: "noop", namesOfFields: ["num"] },
            ]
        }
    );

    // Wrong param count for noop
    assert.throws(() => {
        normalizeLink(
            ["country", "num"],
            { href: "#request/customers?country=${noop a country}&abc=$num" }
        );
    });

    // Unknown variable
    assert.throws(() => {
        normalizeLink(
            ["country", "num"],
            { href: "#request/customers?country=${aaa}&abc=$num" }
        );
    });

    // Unknown function
    assert.throws(() => {
        normalizeLink(
            ["country", "num"],
            { href: "#request/customers?country=${zzz aaa}&abc=$num" }
        );
    });

    // Wrong param count for popup
    assert.throws(() => {
        normalizeLink(
            ["country", "num"],
            { href: "#request/customers?country=${popup aaa}&abc=$num" }
        );
    });

    assert.end();

});

test("getLink", (assert) => {

    const link: EsqlateLinkNormalized = {
        href: [
            "#request/customers?country=",
            { fun: "popup", namesOfFields: ["country_id", "country_name"] },
            "&abc=123",
        ],
        text: [
            "In ",
            { fun: "noop", namesOfFields: ["display"] }
        ],
        class: "zz"
    };

    const expected = {
        class: "zz",
        href: "#request/customers?country=H%2526M%20H%2526M%2520Store&abc=123",
        text: "In H and M"
    };

    assert.deepEqual(
        getLink(link, { country_id: "H&M", country_name: "H&M Store", display: "H and M" }),
        expected
    );
    assert.end();
});

test('asRow', (assert) => {
    assert.plan(1);
    assert.deepEqual(
        asRow(
            ["hi", 4],
            [{"name": "greeting", type: "string"}, {name: "age", type: "integer"}],
            [{name: "gender", val: "F"}]
        ),
        { greeting: "hi", age: 4, gender: "F" }
    );
});

test('getControlStore', (assert) => {
    assert.plan(1);

    const result: EsqlateSuccessResult = {
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
        getControlStore(
            [{ name: "b", val: "four" }],
            [
                { name: "a", type: "integer" } as EsqlateParameterInteger,
                { name: "b", type: "string" } as EsqlateParameterString,
                selectParameter
            ],
            [ { parameter: selectParameter, result } ]
        ),
        {
            "a": { value: "" },
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

test('getControlStore a bug', (assert) => {
    assert.plan(1);

    assert.deepEqual(
        getControlStore(
            [{ name: "b", val: 10881 }],
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
        { name: "c", val: "integer" } as EsqlateQueryComponent,
        { name: "_burl0", val: "bu1" } as EsqlateQueryComponent,
        { name: "_burl1", val: "bu2" } as EsqlateQueryComponent,
        { name: "_bname0", val: "bn1" } as EsqlateQueryComponent,
        { name: "_bname1", val: "bn2" } as EsqlateQueryComponent,
        { name: "_bfld0", val: "bf1" } as EsqlateQueryComponent,
        { name: "_bfld1", val: "bf2" } as EsqlateQueryComponent,
        { name: "_bdis0", val: "bd1" } as EsqlateQueryComponent,
        { name: "_bdis1", val: "bd2" } as EsqlateQueryComponent,
        { name: "_bval0", val: "bv1" } as EsqlateQueryComponent,
        { name: "_bval1", val: "bv2" } as EsqlateQueryComponent,
    ];

    const result = addBackValuesToControlStore(
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
        "_bfld0": { value: "bf1" },
        "_bfld1": { value: "bf2" },
        "_bdis0": { value: "bd1" },
        "_bdis1": { value: "bd2" },
        "_bval0": { value: "bv1" },
        "_bval1": { value: "bv2" },
    };

    assert.deepEqual(
        result,
        expectedResult
    );
    assert.end();
});

test("popBackFromArguments", (assert) => {
    const inputQuery = [
        { name: "c", val: "integer" } as EsqlateQueryComponent,
        { name: "_burl0", val: "bu1" } as EsqlateQueryComponent,
        { name: "_burl1", val: "%2Fbu2" } as EsqlateQueryComponent,
        { name: "_bdef0", val: "bn1" } as EsqlateQueryComponent,
        { name: "_bdef1", val: "bn2" } as EsqlateQueryComponent,
        { name: "_bfld0", val: "bf1" } as EsqlateQueryComponent,
        { name: "_bfld1", val: "bf2" } as EsqlateQueryComponent,
        { name: "_bdis0", val: "bd1" } as EsqlateQueryComponent,
        { name: "_bdis1", val: "bd2" } as EsqlateQueryComponent,
        { name: "_bval0", val: "bv1" } as EsqlateQueryComponent,
        { name: "_bval1", val: "bv2" } as EsqlateQueryComponent,
    ];
    const result = popBackFromArguments(inputQuery);

    assert.deepEqual(result, { def: "bn2", fld: "bf2", url: "/bu2", dis: "bd2", val: "bv2" });
    assert.end();
});


test("pushBackToControlStore", (assert) => {
    const inputQuery = {
        "c": { value: "integer" },
        "_burl0": { value: "bu1" },
        "_burl1": { value: "bu2" },
        "_bdef0": { value: "bn1" },
        "_bdef1": { value: "bn2" },
        "_bfld0": { value: "bf1" },
        "_bfld1": { value: "bf2" },
        "_bdis0": { value: "bd1" },
        "_bdis1": { value: "bd2" },
        "_bval0": { value: "bv1" },
        "_bval1": { value: "bv2" },
    };
    const result = pushBackToControlStore(inputQuery, { def: "bn3", fld: "bf3", url: "bu3", dis: "bd3", val: "bv3" });

    assert.deepEqual(
        result,
        {
            "c": { value: "integer" },
            "_burl0": { value: "bu1" },
            "_burl1": { value: "bu2" },
            "_burl2": { value: "bu3" },
            "_bdef0": { value: "bn1" },
            "_bdef1": { value: "bn2" },
            "_bdef2": { value: "bn3" },
            "_bfld0": { value: "bf1" },
            "_bfld1": { value: "bf2" },
            "_bfld2": { value: "bf3" },
            "_bdis0": { value: "bd1" },
            "_bdis1": { value: "bd2" },
            "_bdis2": { value: "bd3" },
            "_bval0": { value: "bv1" },
            "_bval1": { value: "bv2" },
            "_bval2": { value: "bv3" },
        }
    );
    assert.end();
});


 test("queryComponentsToArguments", (assert) => {

     const input:  EsqlateQueryComponent[] = [
         { name: "search_string", val: "Hello Matt" },
         { name: "company_id", val: "OCEAN%20BOB Ocean%20Shipping%20International" },
         { name: "#hash", val: "abc123" }
     ];

     const parameters: EsqlateDefinition["parameters"] = [
         {
             name: "company_id",
             type: "popup",
             definition: "customer_country_count",
             display_field: "display",
             value_field: "country",
         }
     ];

     const expected:  EsqlateArgument[] = [
         { name: "search_string", value: "Hello Matt" },
         { name: "company_id", value: "OCEAN BOB" }
     ];

     assert.deepEqual(
         queryComponentsToArguments(parameters, input),
         expected
     );

     assert.end();

 });
