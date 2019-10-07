<script>
  import Parameter from "./Parameter.svelte";
  import Link from "./Link.svelte";
  import { beforeUpdate, afterUpdate } from 'svelte';
  import { asRow, normalizeLink, getLink } from "./controls";
  export let result;
  export let definition;
  export let statement;
  export let controls;
  export let run;

  let popupMode = false;
  let showingSql = true;
  let md = new window.markdownit();

  afterUpdate(() => {
    console.log(Array.from(document.querySelectorAll('#results th')).map((th) => th.getBoundingClientRect()));
  })

</script>

{#if $result.status == "error"}
  <div class="columns">
    <div class="column col-auto" style="margin: 0 auto">
      <div class="toast toast-error" style="margin-top: 3em">
        <button class="btn btn-clear float-right"></button>
        <div style="padding: 1em">
          { $result.message }
        </div>
      </div>
    </div>
  </div>
{/if}


<div class={ popupMode ? "modal active" : "" }>
  <a href="#close" class="modal-overlay" aria-label="Close"></a>
<div class="columns" style="margin-top: 2rem">
  <div class="column col-auto modal-container code-popup" style="margin: auto">

    <div class="modal-header">
      <div class="container"><div class="columns">
          <div class="column col-9">
            <h3>
              { $definition.title }
            </h3>
          </div>
          <div class="column col-3">
            <label class="form-switch" style="float: right">
              <input type="checkbox" bind:checked={showingSql}>
              SQL<i class="form-icon"></i>
            </label>
          </div>
        </div></div>
    </div>

    <div class="modal-body">
      {#if showingSql}
      <div class="container"><div class="col-gapless columns">
          <div class="code-code column col-12">
            {#each $statement as line}
            <div class="line">{#each line as item}{#if typeof item == "string"}<span>{item}</span>{:else}<Parameter bind:control={$controls[item.name]} parameter={item}/>{/if}{/each}
            </div>
            {/each}
          </div>
        </div>
      </div>
      {:else}
      <div class="col-gapless columns code-description">
        <div class="column-12">
          <div>{@html md.render("" + $definition.description) }</div>
        </div>
      </div>
      <div class="form-horizontal code-form">
        {#each $definition.parameters as parameter}
        <div class="form-group">
          <div class="column col-5 col-sm-12">
            <label class="form-label" for={ "input-" + parameter.name }>{parameter.name}</label>
          </div>
          <div class="column col-7 col-sm-12">
            <Parameter bind:control={$controls[parameter.name]} parameter={parameter}/>
          </div>
        </div>
        {/each}
      </div>
      {/if}
    </div>

    <div class="modal-footer">
      <div class="container"><div class="col-gapless columns"><div class="column col-12">
      <button class="btn btn-primary" on:click={run}>List</button>
      </div></div></div>
    </div>
  </div>
</div>
</div>

{#if $result.status == "complete"}
  <div class="columns">
    <div class="column col-auto" style="margin: 0 auto">
      <table id="results" class="table table-striped table-hover table-scroll" style="margin: 3em 0">
        <thead>
          <tr>
            {#each $result.fields as field}
              <th>{field.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each $result.rows as row}
            <tr>
            {#each row as cell, i}
              {#if $result.fields[i].type.indexOf("char") > -1}
                <td style="text-align: left">
                  {#if cell === null}
                    NULL
                  {:else}
                    {cell}
                  {/if}
                </td>
              {:else}
                <td style="text-align: right">
                  {#if cell === null}
                    NULL
                  {:else}
                    {cell}
                  {/if}
                </td>
              {/if}
            {/each}
            {#each $definition.links  || [] as link}
            <td style="text-align: center"><Link link={getLink(normalizeLink(link), asRow(row, $result.fields)) }/></td>
            {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

