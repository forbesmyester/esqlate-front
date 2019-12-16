<script>

  import { createEventDispatcher } from 'svelte';
  const dispatchNewValue = createEventDispatcher();

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

  function validator(validationFunc) {
    return function() {
      if (!validationFunc(control.value)) {
        return onerror(parameter.name, parameter.highlight_fields);
      }
      onfix(parameter.name, parameter.highlight_fields);
      dispatchNewValue(
        "newvalue",
        { name: parameter.name, control }
      );
    }
  }

  function isDateOk() {
    if ((parameter.empty_string_is_null) && (control.value == "")) {
      return true;
    }
    return ("" + control.value).match(/\d\d\d\d\-\d\d-\d\d/);
  }

  function isIntegerOk() {
    if ((parameter.empty_string_is_null) && (control.value == "")) {
      return true;
    }
    return ("" + parseInt(control.value) == control.value)
  }

  function isDecimalOk() {
    if ((parameter.empty_string_is_null) && (control.value == "")) {
      return true;
    }
    return ("" + control.value).match(/^-?(0|[1-9]\d*)(\.\d+)?$/)
  }

  if (parameter.type == "integer") { validator(isIntegerOk)(); }
  if (parameter.type == "decimal") { validator(isDecimalOk)(); }
  if (parameter.type == "date") { validator(isDateOk)(); }

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
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} name={parameter.name} bind:value={control.value} data-parameter-name={parameter.name} >
{:else if parameter.type == "date"}
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} name={parameter.name} type="date" bind:value={control.value} data-parameter-name={parameter.name} on:change={validator(isDateOk)}>
{:else if parameter.type == "integer"}
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} name={parameter.name} type="number" bind:value={control.value} on:change={validator(isIntegerOk)} data-parameter-name={parameter.name}>
{:else if parameter.type == "decimal"}
  <input data-highlight-fields={JSON.stringify(parameter.highlight_fields)} id={ "input-" + parameter.name } on:focus={onfocus} on:blur={onblur} step={getStep(parameter.decimal_places)} name={parameter.name} type="number" bind:value={control.value} on:change={validator(isDecimalOk)} data-parameter-name={parameter.name}>
{:else if parameter.type == "server"}
  ${parameter.name}
{:else if parameter.type == "select"}
  {#if control.options }
    <select data-highlight-fields={JSON.stringify(parameter.highlight_fields)} on:focus={onfocus} on:blur={onblur} id={ "input-" + parameter.name } name={parameter.name} bind:value={control.value} data-parameter-name={parameter.name}>
      {#if parameter.empty_string_is_null}
        <option value=""></option>
      {/if}
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
<ParameterPopup popup={popup} onfix={onfix} onerror={onerror} control={control} parameter={parameter} data-parameter-name={parameter.name} />
{:else if (parameter.type == "datetime")}
<ParameterDateOrDatetime on:newvalue onfix={onfix} onerror={onerror} onfocus={onfocus} onblur={onblur} control={control} parameter={parameter} />
{:else}
  {#if ("" + control.value) != "" }
    <strong>{control.value}</strong>
  {:else}
    <strong>${parameter.name}</strong>
  {/if}
{/if}
