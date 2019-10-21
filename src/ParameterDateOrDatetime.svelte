<script>
import { onDestroy } from 'svelte';
import { processDateTime } from './ui';
import { get as getStoreValue, writable } from 'svelte/store';

export let parameter;
export let control;
export let onblur;
export let onfocus;
export let onerror;
export let onfix;

let date = writable(0);
let time = writable(0);

let is_error = false

function initializeValue() {
  date.set(control.value.replace(/T.*/, ''));
  time.set(control.value.replace(/.*T/, '').replace(/\..*/, ''));
}

function registerHandlers() {
  const dateUnsub = date.subscribe(value => {
    is_error = false;
    try {
      control.value = processDateTime(parameter.type, value);
      onfix(parameter.name, parameter.highlight_fields)
    } catch (e) {
      is_error = true;
      onerror(parameter.name, parameter.highlight_fields)
    }
  });
  onDestroy(dateUnsub);

  const timeUnsub = time.subscribe(value => {
    is_error = false;
    try {
      control.value = processDateTime(parameter.type, getStoreValue(date) + 'T' + value);
      onfix(parameter.name, parameter.highlight_fields)
    } catch (e) {
      is_error = true;
      onerror(parameter.name, parameter.highlight_fields)
    }
  });
  onDestroy(timeUnsub);
}

initializeValue();
registerHandlers();

</script>
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name }
       class={is_error ? "is-error" : ""}
       type="date"
       bind:value={$date}/>{is_error}
{#if (parameter.type == "datetime")}
<input data-highlight-fields={JSON.stringify(parameter.highlight_fields)}
       on:focus={onfocus}
       on:blur={onblur}
       id={ "input-" + parameter.name }
       class={is_error ? "is-error" : ""}
       type="time"
       bind:value={$time}/>
{/if}
