<script>
import { createEventDispatcher } from 'svelte';
import { onDestroy } from 'svelte';
import { initializeDateTime, processDateTime } from './ui';
import { get as getStoreValue, writable } from 'svelte/store';

export let parameter;
export let control;
export let onblur;
export let onfocus;
export let onerror;
export let onfix;


const dispatchNewValue = createEventDispatcher();

function emptyCheck() {
  if (!parameter.empty_string_is_null) {
    control.value != "" ?  onfix(parameter.name, parameter.highlight_fields) : onerror(parameter.name, parameter.highlight_fields);
  }
}

function onchangedate({ target: { value: evtValue} }) {
    try {
      control = processDateTime({ ...control, date: evtValue }, "DATE");
      dispatchNewValue("newvalue", { name: parameter.name, control });
      emptyCheck();
    } catch (e) {
      onerror(parameter.name, parameter.highlight_fields);
    }
}

function onchangetime({ target: { value: evtValue } }) {
    try {
      control = {...processDateTime({ ...control, time: evtValue }, "TIME")};
      dispatchNewValue("newvalue", { name: parameter.name, control });
      emptyCheck();
    } catch (e) {
      onerror(parameter.name, parameter.highlight_fields);
    }
}

emptyCheck();

</script>
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name }
       data-parameter-name={parameter.name}
       type="date"
       on:change={onchangedate}
       value={initializeDateTime(control).date || ""}/>
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name + "-time" }
       data-parameter-name={parameter.name}
       type="time"
       on:change={onchangetime}
       value={initializeDateTime(control).time || ""}/>
