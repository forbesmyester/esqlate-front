<script>
import { onDestroy } from 'svelte';
import { get as getStoreValue, writable } from 'svelte/store';
export let parameter;
export let control;
export let popup
function runPopup() {
  popup(this.innerText);
}
let date = writable(0);
let time = writable(0);

let is_error = false

function processDateTime(s) {
  is_error = false;
  try {
    control.value = new Date(s).toISOString();
  } catch (e) {
    is_error = true;
    control.value = new Date(s).toISOString();
  }
  if (parameter.type == 'date') {
    control.value = control.value.replace(/T.*/, '');
  }
}

if ((parameter.type == 'date') || (parameter.type == 'timestampz')) {
  const s = (control.value.indexOf('T') > -1) ? control.value : new Date().toISOString().replace(/T.*/, 'T09:00:00');
  date.set(s.replace(/T.*/, ''));
  time.set(s.replace(/.*T/, '').replace(/\..*/, ''));

  const dateUnsub = date.subscribe(value => {
    processDateTime(value + 'T' + getStoreValue(time));
  });
  onDestroy(dateUnsub);

  const timeUnsub = time.subscribe(value => {
    processDateTime(getStoreValue(date) + 'T' + value);
  });
  onDestroy(timeUnsub);

}

</script>

{#if parameter.type != "server"}
  {#if (!parameter.hasOwnProperty("name"))}
    <div class="deverror">Parameter should have 'name'</div>
  {/if}
  {#if (!control || !control.hasOwnProperty("value"))}
    <div class="deverror">Control for {parameter.name} should exist and have 'value'</div>
  {/if}
{/if}

{#if parameter.type == "string"}
  <input id={ "input-" + parameter.name } name={parameter.name} bind:value={control.value}>
{:else if parameter.type == "integer"}
  <input id={ "input-" + parameter.name } name={parameter.name} type="number" bind:value={control.value}>
{:else if parameter.type == "server"}
  ${parameter.name}
{:else if parameter.type == "select"}
  {#if control.options }
    <select id={ "input-" + parameter.name } name={parameter.name} bind:value={control.value}>
      {#each control.options as opt}
        <option value={opt.value}>{opt.display}</option>
      {/each}
    </select>
  {:else}
    {#if ("" + control.value) != "" }
      <strong>{control.value}</strong>
    {:else}
      <strong>${parameter.name}</strong>
    {/if}
  {/if}
{:else if parameter.type == "popup"}
<strong>
  <button class="input-popup" on:click={() => popup(parameter.name)}>
    <div>{control.value}</div>&nbsp;⯅
  </button>
</strong>
{:else if (parameter.type == "timestampz") || (parameter.type == "date")}
<input class={is_error ? "is-error" : ""} type="date" bind:value={$date}/>{control.value}
{#if (parameter.type == "timestampz")}
<input class={is_error ? "is-error" : ""} type="time" bind:value={$time}/>
{/if}
{:else}
  {#if ("" + control.value) != "" }
    <strong>{control.value}</strong>
  {:else}
    <strong>${parameter.name}</strong>
  {/if}
{/if}
