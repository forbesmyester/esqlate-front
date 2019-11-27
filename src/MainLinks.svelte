<script>
  import { asRow, normalizeLink, getLink } from "./controls";
  import Link from "./Link.svelte";

  export let links;
  export let controls;
  export let result;

  function getValuesFromControls(currentControls) {
    return Object.getOwnPropertyNames(currentControls || {}).map(
      (name) => {
        return { name: name, val: currentControls[name].value }
      }
    )
  }

  function getValuesFromResults(currentResults) {
    if (!currentResults || !currentResults.rows || !currentResults.rows.length) {
      return [];
    }
    return currentResults.fields.map((fld, i) => {
      return { name: fld.name, val: currentResults.rows[0][i] };
    });
  }

  let args = [];
  let the_links = [];

  $: args = getValuesFromControls(controls || {}).concat(getValuesFromResults(result));

  $: the_links = (links || []).reduce(
    (acc, link) => {
      try {
        return acc.concat([getLink(
          normalizeLink(args.map(({name}) => name), link),
          asRow(args.map(({name}) => name), [], args)
        )]);
      } catch (e) {
        return acc;
      }
    },
    []
  );
</script>

<div id="main_links">
  {#each the_links as link}
  <Link link={link}/>
  {/each}
</div>
