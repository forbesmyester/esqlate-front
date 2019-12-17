import test from 'tape';
import { initializeDateTime, processDateTime, getStep, getHightlightPositions, getHightlightString, LineType, ProcessDateTimeWhich } from '../ts-src/ui';

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


test("initializeDateTime Empty", (assert) => {
    assert.deepEqual(
        initializeDateTime({ value: '', date: '', time: ''}),
        {
            value: '',
            date: '',
            time: ''
        }
    );
    assert.end();
});

test("initializeDateTime Happy", (assert) => {
    assert.deepEqual(
        initializeDateTime({ value: '1990-10-21T11:44:22.000Z', date: '1992-10-21', time: '09:44:22.000Z'}),
        {
            value: '1992-10-21T09:44:22.000Z',
            date: '1992-10-21',
            time: '09:44:22.000Z'
        }
    );
    assert.end();
});

test("processDateTime When both specified", (assert) => {
    assert.deepEqual(
        processDateTime({ value: '', date: '1990-10-21', time: '09:44:22.000Z'}, ProcessDateTimeWhich.TIME),
        {
            value: '1990-10-21T09:44:22.000Z',
            date: '1990-10-21',
            time: '09:44:22.000Z'
        },
    );
    assert.end();
});

test("processDateTime Time", (assert) => {
    assert.deepEqual(
        processDateTime({ value: '1990-10-21T11:44:22.000Z', date: '1992-10-21', time: '09:44:22.000Z'}, ProcessDateTimeWhich.TIME),
        {
            value: '1990-10-21T09:44:22.000Z',
            date: '1990-10-21',
            time: '09:44:22.000Z'
        }
    );
    assert.end();
});

test("processDateTime Date", (assert) => {
    assert.deepEqual(
        processDateTime({ value: '1990-10-21T11:44:22.000Z', date: '1992-10-21', time: '09:44:22.000Z'}, ProcessDateTimeWhich.DATE),
        {
            value: '1992-10-21T11:44:22.000Z',
            date: '1992-10-21',
            time: '11:44:22.000Z'
        }
    );
    assert.end();
});

// test("initializeDateTime", (assert) => {
//     assert.deepEqual(
//         initializeDateTime(""),
//         { value: "", time: "", date: "" }
//     );
//     assert.deepEqual(
//         initializeDateTime("1990-10-21T11:44:22.000Z"),
//         {
//             value: "1990-10-21T11:44:22.000Z",
//             time: "11:44:22.000Z",
//             date: "1990-10-21"
//         }
//     );
//     assert.end();
// });

test('getHightlightPositions', (assert) => {
    assert.deepEqual(
        getHightlightPositions(
            [ "title" ],
            "title insert into x (title, title, first_name, last_name, title_of_book) x_title; title"
        ),
        [{ begin: 0, end: 5 }, { begin: 21, end: 26 }, { begin: 28, end: 33 }, { begin: 82, end: 87 }]
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
