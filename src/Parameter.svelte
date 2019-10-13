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

if ((parameter.type == 'date') || (parameter.type == 'timestampz')) {
  const s = (control.value.indexOf('T') > -1) ? control.value : new Date().toISOString().replace(/T.*/, 'T09:00:00');
  date.set(s.replace(/T.*/, ''));
  time.set(s.replace(/.*T/, '').replace(/\..*/, ''));

  const dateUnsub = date.subscribe(value => {
    control.value = new Date(value + 'T' + getStoreValue(time)).toISOString();
    if (parameter.type == 'date') {
      control.value = control.value.replace(/T.*/, '');
    }
  });
  onDestroy(dateUnsub);

  const timeUnsub = time.subscribe(value => {
    control.value = new Date(getStoreValue(date) + 'T' + value).toISOString();
    if (parameter.type == 'date') {
      control.value = control.value.replace(/T.*/, '');
    }
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
<input type="date" bind:value={$date}/>
{#if (parameter.type == "timestampz")}
<input type="time" bind:value={$time}/>
{/if}
{:else}
  {#if ("" + control.value) != "" }
    <strong>{control.value}</strong>
  {:else}
    <strong>${parameter.name}</strong>
  {/if}
{/if}
