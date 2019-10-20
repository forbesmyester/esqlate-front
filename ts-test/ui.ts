import test from 'tape';
import { getStep } from '../ts-src/ui';

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

