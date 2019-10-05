<script>
  import Parameter from "./Parameter.svelte";
  export let result;
  export let definition;
  export let statement;
  export let controls;
  export let run;

  let showingSql = true;


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

<div id="code-holder" class="modal-container">
  <div class="modal-header">

    <label class="form-switch" style="float: right">
      <input type="checkbox" bind:checked={showingSql}>
      <i class="form-icon"></i>SQL
    </label>

    <div class="modal-title h5">{ definition.title }</div>

  </div>
  <div class="modal-body">

    {#if showingSql}
      <div class="code">
        {#each $statement as line}
          <div class="line">{#each line as item}{#if typeof item == "string"}<span>{item}</span>{:else}<Parameter bind:control={$controls[item.name]} parameter={item}/>{/if}{/each}
        </div>
      {/each}
    </div>
    {:else}
      <div>{@html $definition.description}</div>
      <div class="form-group">
        {#each $definition.parameters as parameter}
          <label class="form-label" for="input-example-1">{parameter.name}</label>
          <Parameter bind:control={$controls[parameter.name]} parameter={parameter}/>
        {/each}
      </div>
    {/if}

  </div>
  <div class="modal-footer">
    <a class="btn btn-link" href="#modals">Cancel</a>
    <button class="btn btn-primary" on:click={run}>List</button>
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
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

