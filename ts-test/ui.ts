import test from 'tape';
import { processDateTime, getStep, getHightlightPositions, getHightlightString, LineType } from '../ts-src/ui';

test("getStep", (assert) => {
    assert.is(getStep(2), "0.01");
    assert.is(getStep(1), "0.1");
    assert.is(getStep(0), "1");
    assert.is(getStep(-1), "1");
    assert.is(getStep(3), "0.001");
    assert.is(getStep(undefined), "1");
    assert.is(getStep(""), "1");
    assert.end();
});


test("processDateTime", (assert) => {
    assert.is(processDateTime("date", '1990-10-21'), '1990-10-21');
    assert.is(processDateTime("date", '1990-10-21T11:44:22'), '1990-10-21');
    assert.is(processDateTime("datetime", '1990-10-21T11:44:22.000Z'), '1990-10-21T11:44:22.000Z');
    assert.end();
});

test('getHightlightPositions', (assert) => {
    assert.deepEqual(
        getHightlightPositions(
            [ "first_name", undefined ],
            "insert into x (first_name, first_name, last_name)"
        ),
        [{ begin: 15, end: 25 }, { begin: 27, end: 37 }]
    );
    assert.end();

});


test('getHightlightString', (assert) => {

    assert.deepEqual(
        getHightlightString(
            [{ begin: 15, end: 25 }, { begin: 17, end: 28 }, { begin: 27, end: 37 }],
            "insert into x (first_name, first_name, last_name)"
        ),
        [
            { type: LineType.String, value: 'insert into x (' },
            { type: LineType.Field, value: 'first_name' },
            { type: LineType.String, value: ', ' },
            { type: LineType.Field, value: 'first_name' },
            { type: LineType.String, value: ', last_name)' }
        ]
    );
    assert.end();

});
