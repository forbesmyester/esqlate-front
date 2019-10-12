<script>
export let parameter;
export let control;
export let popup
function runPopup() {
  popup(this.innerText);
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
{:else}
  '<strong>{control.value}</strong>'
{/if}
