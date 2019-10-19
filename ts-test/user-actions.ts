import test from 'tape';
import { getPopupLinkCreator, pick } from '../ts-src/user-actions';
import { EsqlateQueryComponent } from "../ts-src/types";
import {EsqlateDefinition, EsqlateCompleteResult, EsqlateCompleteResultRow} from 'esqlate-lib';

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

    const expected = "/customer_search?_burl0=%252Fwhere_i_was%253Fsearch_string%253DRob%2526country%253DArgentina&_bfld0=customer_id&_bname0=where_i_was&_bdisp0=company_name";


    assert.is(result, expected);
    assert.end();


});

test('pick', (assert) => {
    const row: EsqlateCompleteResultRow = [ "Ocean Shipping International", "OCEAN" ];
    const query = [
        { name: "c", val: "integer" } as EsqlateQueryComponent,
        { name: "_burl0", val: "bu1" } as EsqlateQueryComponent,
        { name: "_burl1", val: "/order_list?min_price=4" } as EsqlateQueryComponent,
        { name: "_bname0", val: "bn1" } as EsqlateQueryComponent,
        { name: "_bname1", val: "order_list" } as EsqlateQueryComponent,
        { name: "_bfld0", val: "bf1" } as EsqlateQueryComponent,
        { name: "_bfld1", val: "company_id" } as EsqlateQueryComponent,
        { name: "_bdisp0", val: "bd1" } as EsqlateQueryComponent,
        { name: "_bdisp1", val: "company_name" } as EsqlateQueryComponent,
    ];

    const fields: EsqlateCompleteResult["fields"] = [
        { name: "company_name", type: "varchar"},
        { name: "company_id", type: "varchar"},
    ];

    const result = pick(row, query, fields);
    const expected = "/order_list?min_price=4&company_id=OCEAN%20Ocean%2520Shipping%2520International";

    assert.is(result, expected);
    assert.end();

});
