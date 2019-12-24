<script>

  import { getHightlightPositions, getHightlightString } from './ui';
  import { afterUpdate } from 'svelte';
  import { get as getStoreValue } from 'svelte/store';
  import ResultTable from "./ResultTable.svelte";
  import Parameter from "./Parameter.svelte";
  import Highlighter from "./Highlighter.svelte";
  import MainLinks from "./MainLinks.svelte";

  export let pick;
  export let run;
  export let cancelDownload;
  export let cancel;
  export let empty;
  export let popup;
  export let viewStore;
  export let download;
  export let showDownloads;
  export let toggleShowingSql;


  let getColorCache = new Map();

  function getColor(s) {
    if (getColorCache.has(s)) { return getColorCache.get(s); };
    let r = Array.from(document.querySelectorAll(`#color-finder-${s}`)).reduce((acc, el) => {
      return window.getComputedStyle(el).color;
    }, null);
    if (r != null) { getColorCache.set(s, r); }
    return r;
  }

  let md = new window.markdownit();

  let sidebarActive = false;
  function showSidebar() { sidebarActive = true; }
  function hideSidebar() { sidebarActive = false; }

  function resetStylesheet(name) {

    let styleEl = document.getElementById(name);
    if (!styleEl) {
      const head = document.head || document.getElementsByTagName('head')[0];
      styleEl = document.createElement('style');
      styleEl.id = name;
      head.appendChild(styleEl);
    }
    while (styleEl.sheet.rules.length > 0) {
      styleEl.sheet.removeRule(0);
    }
    return styleEl.sheet;
  }

  function onfocus({target}) {
    const stylesheet = resetStylesheet("onblur-onfocus-style");
    let flds = JSON.parse(target && target.dataset && target.dataset.highlightFields || "[]");
    if (flds.length == 0) { flds = [target.name] }
    flds.forEach((fld) => {
      stylesheet.insertRule(`.field_highlight[data-field="${fld}"] { font-weight: bold; color: black; }`);
    });
  }

  function onblur({target}) {
    resetStylesheet("onblur-onfocus-style");
  }

  let errorFields = new Map();

  function redrawErrorStylesheet() {
    const stylesheet = resetStylesheet("onerror");
    const allErrors = new Set();
    for (const [name, set] of errorFields) {
      let addedError = false;
      for (const s of set) {
        allErrors.add(s);
        if (!addedError) {
          stylesheet.insertRule(
            `.input-popup[data-parameter-name="${name}"], input[data-parameter-name="${name}"], select[data-parameter-name="${name}"] { border-color:${getColor('error')} !important; }`
          );
          addedError = true;
        }
      }
    }
    for (const errorField of allErrors) {
      stylesheet.insertRule(`.field_highlight[data-field="${errorField}"] { color: ${getColor('error')} !important; }`);
    }
  }

  function onerror(name, highlightFields) {

    if (!errorFields.has(name)) { errorFields.set(name, new Set()); }
    (highlightFields || [name]).forEach((hf) => {
      errorFields.get(name).add(hf);
    });
    redrawErrorStylesheet();
  }

  function onfix(name, highlightFields) {
    (highlightFields || [name]).forEach((hf) => {
      errorFields.get(name) && errorFields.get(name).delete(hf);
    });
    redrawErrorStylesheet();
  }

  function onnewcontrolvalue({detail: { name, control } }) {
    viewStore.update((vs) => {
      return {...vs, controls: {...vs.controls, [name]: { ...control } } };
    });
  }

  function buttonClass(statementType) {
    switch (statementType) {
      case "INSERT":
      case "DELETE":
      case "UPDATE":
        return "btn-error";
      case "SELECT":
        return "btn-success";
    }
    return "";
  }

  function getDownloads(result) {
    if (result && result.full_format_urls && result.full_format_urls.length) {
      return result.full_format_urls
    }
    return [];
  }

  function runDownload(mimeType) {
    return () => download(mimeType);
  }

  function parameterIsAvailable(controls) {
    return (p) => {
      return controls.hasOwnProperty(p.name);
    };
  }

  afterUpdate(() => {
    if (getStoreValue(viewStore).definition && getStoreValue(viewStore).definition.title) {
      window.document.title = `eSQLate: ${getStoreValue(viewStore).definition.title}`;
    }
    if (getStoreValue(viewStore).loading) {
      setTimeout(() => {
        if (getStoreValue(viewStore).loading) {
          document.getElementById("loading-modal").classList.add("loading-notification");
        }
      }, 250);
    } else {
      document.getElementById("loading-modal").classList.remove("loading-notification");
    }
  })


</script>

<div class={ $viewStore.showingMenu ? "showing-menu off-canvas" : "off-canvas" }>
  <!-- off-screen toggle button -->
  <a class="off-canvas-toggle btn btn-link"
    href="#sidebar-id"
    on:click|preventDefault={showSidebar}
    >
    ☰
  </a>

  <div id="sidebar-id" class={ (sidebarActive || $viewStore.showingMenu) ? "off-canvas-sidebar active" : "off-canvas-sidebar" }>
    <div id="logo">eSQLate</div>
    <ul id="menu">
      {#each ($viewStore.menu || []) as item}
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
    {#if $viewStore.showingMenu}
      <div class="columns">
        <div class="column col-auto" style="margin: 3rem auto 0 auto; max-width: 40%">
          <h2>Welcome to eSQLate.</h2>
          <p>This tool enables you to create simple administration panels by writing SQL queries within a simple JSON document.</p>
        </div>
      </div>
    {:else}
    <div class="columns" id="toast-error-wrapper" style="display:none">
      <div class="column col-auto" style="margin: 3rem auto 0 auto">
        <div class="toast toast-error">
          <button class="btn btn-clear float-right" onclick="esqlateHideToastError()"></button>
          <div id="toast-error-wrapper-text" style="padding: 1em">
            xx
          </div>
        </div>
      </div>
    </div>

    {#if !$viewStore.asPopup}
      <MainLinks
        links={ $viewStore.definition.top_links }
        controls={ $viewStore.controls }
        result={ $viewStore.result }
        />
    {/if}

    <div class={ ($viewStore.asPopup) ? "modal active in-popup" : "no-modal" } style={$viewStore.statement.length ? "" : "display: none"}>
      <a href="#close" on:click|preventDefault={cancel} class="modal-overlay" aria-label="Close">&nbsp;</a>
      <div class="columns" style={ $viewStore.asPopup ? "" : "margin-top: 2rem"}>
        <div class="column col-auto modal-container code-popup" style="margin: auto">

          <div class="modal-header">
            <div class="container"><div class="columns">
                <div class="column col-9">
                  <h3>{ $viewStore.definition.title }</h3><div id="color-finder" style="display: none"><span id="color-finder-error" class="text-error"></span>a<span id="color-finder-warning" class="text-warning">b</span><span id="color-finder-success" class="text-success">c</span></div>
                </div>
                <div class="column col-3">
                  <label class="form-switch" style="float: right">
                    <input type="checkbox" checked={$viewStore.showingSql ? "checked" : ""} on:click={toggleShowingSql}>
                    SQL<i class="form-icon"></i>
                  </label>
                </div>
              </div></div>
          </div>

          <div class="modal-body" style="overflow: unset">
            {#if $viewStore.showingSql}
            <div class="container">
              <div class="col-gapless columns">
                <div class="column-12" id="code-description-area">
                  {#if $viewStore.definition.description }
                  <div>{@html md.render("" + $viewStore.definition.description) }</div>
                  {/if}
                </div>
              </div>
              <div class="col-gapless columns">
                <div class="code-code column col-12" id="code-input-area">
                  {#each $viewStore.statement as line}
                  <div class="line">
                    {#each line as item}
                    {#if typeof item == "string"}
                    <Highlighter parameters={$viewStore.definition.parameters} item={item}/>
                    {:else}
                    <Parameter on:newvalue={onnewcontrolvalue} onfix={onfix} onerror={onerror} onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$viewStore.controls[item.name]} parameter={item}/>
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
                {#if $viewStore.definition.description }
                <div>{@html md.render("" + $viewStore.definition.description) }</div>
                {/if}
              </div>
            </div>
            <div class="form-horizontal code-form">
              {#each $viewStore.definition.parameters.filter(parameterIsAvailable($viewStore.controls)) as parameter}
              <div class="form-group">
                <div class="column col-5 col-sm-12">
                  <label class="form-label" for={ "input-" + parameter.name }>{parameter.name}</label>
                </div>
                <div class="column col-7 col-sm-12">
                  {#if parameter.type == "static"}
                  <label class="form-label" >
                  <Parameter on:newvalue={onnewcontrolvalue} onfix={onfix} onerror={onerror} onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$viewStore.controls[parameter.name]} parameter={parameter}/>
                  </label>
                  {:else}
                  <Parameter on:newvalue={onnewcontrolvalue} onfix={onfix} onerror={onerror} onfocus={onfocus} onblur={onblur} popup={popup} bind:control={$viewStore.controls[parameter.name]} parameter={parameter}/>
                  {/if}
                </div>
              </div>
              {/each}
            </div>
            {/if}
          </div>

          <div class="modal-footer">
            <div class="container"><div class="col-gapless columns"><div class="column col-12">
            {#if $viewStore.asPopup}
            <button class="btn btn-link" on:click={cancel}>Cancel</button>
            <button class="btn" on:click={empty}>Select Empty Value</button>
            {/if}
            <button class={ "btn btn-primary " + buttonClass($viewStore.definition.statement_type) } on:click={run}>
              { $viewStore.definition.statement_type || "EXECUTE" }
            </button>
            </div></div></div>
          </div>

          {#if $viewStore.asPopup}
          <div class="modal-body">
          <ResultTable controls={$viewStore.controls} pick={pick} inPopup={true} definition={$viewStore.definition} result={$viewStore.result}/>
          </div>
          {/if}

        </div>
      </div>
    </div>

    {#if $viewStore.showingDownload}
    <div class="modal active" id="modal-id">
      <a href="#close" class="modal-overlay" aria-label="Close" on:click|preventDefault={cancelDownload}>&nbsp;</a>
      <div class="modal-container">
        <div class="modal-header">
          <a href="#close" on:click|preventDefault={cancelDownload} class="btn btn-clear float-right" aria-label="Close">&nbsp;</a>
          <div class="modal-title h5">
            {#if getDownloads($viewStore.result).length }
              Please select a download
            {:else}
              Preparing downloads
            {/if}
          </div>
        </div>
        <div class="modal-body">
          <div class="content" style="min-height: 2rem">
            {#if getDownloads($viewStore.result).length }
              {#each getDownloads($viewStore.result) as link}
                <a href="#download" on:click|preventDefault={runDownload(link.type)}>{link.type}</a>
              {/each}
            {:else}
              <div style="text-align: center; font-size: 144pt;">
                🕓
              </div>
            {/if}
          </div>
        </div>
        <div class="modal-footer">
          <a href="#close" on:click|preventDefault={cancelDownload} aria-label="Close">Cancel</a>
        </div>
      </div>
    </div>
    {/if}

    {#if !$viewStore.asPopup}
    <MainLinks
      links={ $viewStore.definition.links }
      controls={ $viewStore.controls }
      result={ $viewStore.result }
      />
    <div style="margin-top: 3em" class={ ($viewStore.asPopup) ? "in-popup" : "" }>
      <ResultTable showDownloads={showDownloads} controls={$viewStore.controls} inPopup={false} definition={$viewStore.definition} result={$viewStore.result}/>
    </div>
  {/if}
  {/if}
  </div>
</div>

<div class={$viewStore.loading ? "modal active" : "modal"} id="loading-modal"> 
  <div id="loading-modal-content">
    🕓
  </div>
</div>
