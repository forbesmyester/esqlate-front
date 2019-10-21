<script>

  import { getHightlightPositions, getHightlightString } from './ui';
  import { onDestroy } from 'svelte';
  import { get as getStoreValue } from 'svelte/store';
  import ResultTable from "./ResultTable.svelte";
  import Parameter from "./Parameter.svelte";
  import Highlighter from "./Highlighter.svelte";

  export let pick;
  export let result;
  export let definition;
  export let statement;
  export let controls;
  export let run;
  export let cancel;
  export let popup;
  export let popupMode;
  export let menu;

  let showingSql = true;
  let md = new window.markdownit();

  let args = [];
  const unsubControls = controls.subscribe((controlValue) => {
    args = Object.getOwnPropertyNames(controlValue || {}).map(
      (name) => {
        return { name: name, val: controlValue[name].value }
      }
    );
  });
  onDestroy(unsubControls);

  let sidebarActive = false;
  function showSidebar() { sidebarActive = true; }
  function hideSidebar() { sidebarActive = false; }

  function resetStylesheet() {

    let styleEl = document.getElementById("onblur-onfocus-style");
    if (!styleEl) {
      const head = document.head || document.getElementsByTagName('head')[0];
      styleEl = document.createElement('style');
      styleEl.id = "onblur-onfocus-style";
      head.appendChild(styleEl);
    }
    for (let i = 0; i < styleEl.sheet.rules.length; i++) {
      styleEl.sheet.removeRule(0);
    }
    return styleEl.sheet;
  }

  function onfocus({target}) {
    const stylesheet = resetStylesheet();
    try {
      const flds = JSON.parse(target && target.dataset && target.dataset.field || "[]");
      flds.forEach((fld) => {
        stylesheet.insertRule(`.field_highlight[data-field="${fld}"] { font-weight: bold; color: black; }`);
      });
    } catch (e) {}
  }

  function onblur({target}) {
    resetStylesheet();
  }


</script>

<div class="off-canvas">
  <!-- off-screen toggle button -->
  <a class="off-canvas-toggle btn btn-link"
     href="#sidebar-id"
     on:click|preventDefault={showSidebar}
     >
     ☰
  </a>

  <div id="sidebar-id" class={ sidebarActive ? "off-canvas-sidebar active" : "off-canvas-sidebar" }>
    <div id="logo">eSQLate</div>
    <ul>
      {#each $menu as item}
      <li>
        <a href={"#/" + item.name} on:click={hideSidebar}>
          {item.title}
        </a>
      </li>
      {/each}
    </ul>
  </div>

  <a class="off-canvas-overlay"
     href="#close"
     on:click|preventDefault={hideSidebar}
     >&nbsp;</a>

  <div class="off-canvas-content">

{#if $result.status == "error"}
  <div class="columns">
    <div class="column col-auto" style="margin: 3rem auto 0 auto">
      <div class="toast toast-error">
        <button class="btn btn-clear float-right"></button>
        <div style="padding: 1em">
          { $result.message }
        </div>
      </div>
    </div>
  </div>
{/if}


<div class={ ($popupMode) ? "modal active in-popup" : "no-modal" }>
  <a href="#close" on:click|preventDefault={cancel} class="modal-overlay" aria-label="Close">&nbsp;</a>
  <div class="columns" style={ $popupMode ? "" : "margin-top: 2rem"}>
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
          <div class="code-code column col-12" id="code-input-area">
            {#each $statement as line}
            <div class="line">
              {#each line as item}
              {#if typeof item == "string"}
              <Highlighter parameters={$definition.parameters} item={item}/>
              {:else}
              <Parameter onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$controls[item.name]} parameter={item}/>
              {/if}
              {/each}
            </div>
            {/each}
          </div>
        </div>
      </div>
      {:else}
      <div class="col-gapless columns code-description">
        <div class="column-12" id="code-input-area">
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
            {#if parameter.type == "static"}
            <label class="form-label" >
            <Parameter onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$controls[parameter.name]} parameter={parameter}/>
            </label>
            {:else}
            <Parameter onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$controls[parameter.name]} parameter={parameter}/>
            {/if}
          </div>
        </div>
        {/each}
      </div>
      {/if}
    </div>
      {#if $popupMode}
      <ResultTable args={args} pick={pick} inPopup={true} definition={$definition} result={$result}/>
      {/if}



    <div class="modal-footer">
      <div class="container"><div class="col-gapless columns"><div class="column col-12">
      {#if $popupMode}
      <button class="btn btn-link" on:click={cancel}>Cancel</button>
      {/if}
      <button class="btn btn-primary" on:click={run}>List</button>
      </div></div></div>
    </div>
  </div>
</div>
</div>

{#if !$popupMode}
<div style="margin-top: 3em" class={ ($popupMode) ? "in-popup" : "" }>
<ResultTable args={args} inPopup={false} definition={$definition} result={$result}/>
</div>
{/if}
  </div>
</div>
