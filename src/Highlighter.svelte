<script>
  import { getHightlightPositions, getHightlightString } from './ui';

  export let item;
  export let parameters;

  function getParts(params, theItem) {
    const parameterNames = Array.from(new Set(params.reduce(
      (acc, {name, highlight_fields}) => acc.concat(highlight_fields || [name]),
      []
    )));
    return getHightlightString(getHightlightPositions(parameterNames, theItem), theItem);
  }

</script>
{#each getParts(parameters, item) as part}
{#if part.type == "String"}
<span>{part.value}</span>
{:else}
<span class="field_highlight" data-field={part.value}>{part.value}</span>
{/if}
{/each}
