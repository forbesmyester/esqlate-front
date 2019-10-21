<script>
import { onDestroy } from 'svelte';
import { processDateTime } from './ui';
import { get as getStoreValue, writable } from 'svelte/store';

export let parameter;
export let control;

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
    } catch (e) {
      is_error = true;
    }
  });
  onDestroy(dateUnsub);

  const timeUnsub = time.subscribe(value => {
    is_error = false;
    try {
      control.value = processDateTime(parameter.type, getStoreValue(date) + 'T' + value);
    } catch (e) {
      is_error = true;
    }
  });
  onDestroy(timeUnsub);
}

initializeValue();
registerHandlers();

</script>
<input id={ "input-" + parameter.name }
       class={is_error ? "is-error" : ""}
       type="date"
       bind:value={$date}/>
{#if (parameter.type == "datetime")}
<input id={ "input-" + parameter.name }
       class={is_error ? "is-error" : ""}
       type="time"
       bind:value={$time}/>
{/if}
