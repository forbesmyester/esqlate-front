<script>

  import ParameterDateOrDatetime from "./ParameterDateOrDatetime.svelte";
  import ParameterPopup from "./ParameterPopup.svelte";
  import { getStep } from "./ui";
  export let parameter;
  export let control;
  export let popup;
  export let onfocus;
  export let onblur;
  export let onerror;
  export let onfix;
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
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} name={parameter.name} bind:value={control.value}>
{:else if parameter.type == "integer"}
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} name={parameter.name} type="number" bind:value={control.value}>
{:else if parameter.type == "decimal"}
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} step={getStep(parameter.decimal_places)} name={parameter.name} type="number" bind:value={control.value}>
{:else if parameter.type == "server"}
  ${parameter.name}
{:else if parameter.type == "select"}
  {#if control.options }
    <select data-highlight-fields={JSON.stringify(parameter.highlight_fields)} on:focus={onfocus} on:blur={onblur} id={ "input-" + parameter.name } name={parameter.name} bind:value={control.value}>
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
{:else if (parameter.type == "datetime") || (parameter.type == "date")}
<ParameterDateOrDatetime onfix={onfix} onerror={onerror} onfocus={onfocus} onblur={onblur} control={control} parameter={parameter} />
{:else}
  {#if ("" + control.value) != "" }
    <strong>{control.value}</strong>
  {:else}
    <strong>${parameter.name}</strong>
  {/if}
{/if}
