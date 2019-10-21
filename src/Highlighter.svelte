<script>
  import { onDestroy } from 'svelte';
  import { getHightlightPositions, getHightlightString } from './ui';

  export let item;
  export let definition;

  let parameterNames = [];

  const unsub = definition.subscribe((def) => {
    parameterNames = def.parameters.map(({highlight_field}) => highlight_field);
  });
  onDestroy(unsub);

  const parts = getHightlightString(getHightlightPositions(parameterNames, item), item);

</script>
{#each parts as part}{#if part.type == "String"}<span>{part.value}</span>{:else}<span class="field_highlight" data-field={part.value}>{part.value}</span>{/if}{/each}
