<script>
import { onDestroy } from 'svelte';
import { get as getStoreValue, writable } from 'svelte/store';

export let parameter;
export let control;

let date = writable(0);
let time = writable(0);

let is_error = false

function processDateTime(s) {
  is_error = false;
  try {
    control.value = new Date(s).toISOString();
  } catch (e) {
    is_error = true;
    control.value = "";
  }
  if (parameter.type == 'date') {
    control.value = control.value.replace(/T.*/, '');
  }
}

function initializeValue() {
  const s = (control.value.indexOf('T') > -1) ? control.value : new Date().toISOString().replace(/T.*/, 'T09:00:00');
  date.set(s.replace(/T.*/, ''));
  time.set(s.replace(/.*T/, '').replace(/\..*/, ''));
}

function registerHandlers() {
  const dateUnsub = date.subscribe(value => {
    processDateTime(value + 'T' + getStoreValue(time));
  });
  onDestroy(dateUnsub);

  const timeUnsub = time.subscribe(value => {
    processDateTime(getStoreValue(date) + 'T' + value);
  });
  onDestroy(timeUnsub);
}

initializeValue();
registerHandlers();

</script>
<input class={is_error ? "is-error" : ""} type="date" bind:value={$date}/>
{#if (parameter.type == "timestampz")}
<input class={is_error ? "is-error" : ""} type="time" bind:value={$time}/>
{/if}
