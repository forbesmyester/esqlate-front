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

let date = writable(0);
let time = writable(0);

function initializeValue() {
  date.set(control.value.replace(/T.*/, ''));
  time.set(control.value.replace(/.*T/, '').replace(/\..*/, ''));
}


function onchangedate({ target: { value: evtValue} }) {
    try {
      control = processDateTime({ ...control, date: evtValue });
      dispatchNewValue("newvalue", { name: parameter.name, control });
      control.value != "" ?  onfix(parameter.name, parameter.highlight_fields) : onerror(parameter.name, parameter.highlight_fields);
    } catch (e) {
      onerror(parameter.name, parameter.highlight_fields);
    }
}

function onchangetime({ target: { value: evtValue } }) {
    try {
      control = {...processDateTime({ ...control, time: evtValue })};
      dispatchNewValue("newvalue", { name: parameter.name, control });
      control.value != "" ?  onfix(parameter.name, parameter.highlight_fields) : onerror(parameter.name, parameter.highlight_fields);
    } catch (e) {
      onerror(parameter.name, parameter.highlight_fields);
    }
}

control = initializeDateTime(control.value);
control.value != "" ?  onfix(parameter.name, parameter.highlight_fields) : onerror(parameter.name, parameter.highlight_fields);

</script>
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name }
       data-parameter-name={parameter.name}
       type="date"
       on:change={onchangedate}
       value={control.date || ""}/>
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name + "-time" }
       data-parameter-name={parameter.name}
       type="time"
       on:change={onchangetime}
       value={control.time || ""}/>
