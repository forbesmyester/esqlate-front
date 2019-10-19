<script>
import ParameterDateOrTimestampz from "./ParameterDateOrTimestampz.svelte";
import ParameterPopup from "./ParameterPopup.svelte";
export let parameter;
export let control;
export let popup
let is_error = false

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
<ParameterPopup popup={popup} control={control} parameter={parameter} />
{:else if (parameter.type == "timestampz") || (parameter.type == "date")}
<ParameterDateOrTimestampz control={control} parameter={parameter} />
{:else}
  {#if ("" + control.value) != "" }
    <strong>{control.value}</strong>
  {:else}
    <strong>${parameter.name}</strong>
  {/if}
{/if}
