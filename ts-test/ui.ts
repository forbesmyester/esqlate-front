import test from 'tape';
import { processDateTime, getStep } from '../ts-src/ui';

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
