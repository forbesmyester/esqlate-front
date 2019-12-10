import test from 'tape';
import { getPopupLinkCreator, pick } from '../ts-src/user-actions';
import { EsqlateQueryComponent } from "../ts-src/types";
import {EsqlateDefinition, EsqlateSuccessResult, EsqlateSuccessResultRow} from 'esqlate-lib';

test('getPopupLinkCreator', (assert) => {

    const parameterName = "customer_id";

    let definition: EsqlateDefinition = {
        "name": "where_i_was",
        "title": "",
        "description": "",
        "parameters": [
            {
                "definition": "customer_search",
                "display_field": "company_name",
                "value_field": "customer_id_value_field",
                "type": "popup",
                "name": "customer_id"
            }
        ],
        "statement": ""
    };


    const controlStore = {
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

    const getURLSearchParams = () => {
        return new URLSearchParams();
    }

    const popup = getPopupLinkCreator(getURLSearchParams);

    const result = popup(parameterName, definition, controlStore);

    const expected = "/customer_search?_burl0=%252Fwhere_i_was%253Fsearch_string%253DRob%2526country%253DArgentina&_bfld0=customer_id&_bdef0=where_i_was&_bdis0=company_name&_bval0=customer_id_value_field";


    assert.is(result, expected);
    assert.end();


});

test('pick', (assert) => {
    const row: EsqlateSuccessResultRow = [ "Ocean Shipping International", "OCEAN" ];
    const query = [
        { name: "c", val: "integer" } as EsqlateQueryComponent,
        { name: "_burl0", val: "bu1" } as EsqlateQueryComponent,
        { name: "_burl1", val: "/order_list?min_price=4" } as EsqlateQueryComponent,
        { name: "_bdef0", val: "bn1" } as EsqlateQueryComponent,
        { name: "_bdef1", val: "order_list" } as EsqlateQueryComponent,
        { name: "_bfld0", val: "bf1" } as EsqlateQueryComponent,
        { name: "_bfld1", val: "f_company_id" } as EsqlateQueryComponent,
        { name: "_bdis0", val: "bd1" } as EsqlateQueryComponent,
        { name: "_bdis1", val: "company_name" } as EsqlateQueryComponent,
        { name: "_bval0", val: "bv1" } as EsqlateQueryComponent,
        { name: "_bval1", val: "company_id" } as EsqlateQueryComponent,
    ];

    const fields: EsqlateSuccessResult["fields"] = [
        { name: "company_name", type: "varchar"},
        { name: "company_id", type: "varchar"},
    ];

    const result = pick(row, query, fields);
    const expected = "/order_list?min_price=4&f_company_id=OCEAN%20Ocean%2520Shipping%2520International";

    assert.is(result, expected);
    assert.end();

});
