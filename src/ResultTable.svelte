<script>
  import Link from "./Link.svelte";
  import { onDestroy, beforeUpdate, afterUpdate } from 'svelte';
  import { writable, get as getStoreValue } from 'svelte/store';
  import { asRow, normalizeLink, getLink } from "./controls";
  import debounce from "debounce";

  export let definition;
  export let controls;

  export let result;
  export let inPopup;
  export let pick;
  export let showDownloads;

  const id = inPopup ? "in-popup-results" : "out-popup-results";

  function syncTable() {

    function resetStylesheet() {
      const stylesheet = document.getElementById(id + "-style").sheet;
      for (let i = 0; i < stylesheet.rules.length; i++) {
        stylesheet.removeRule(0);
      }
      return stylesheet;
    }

    const stylesheet = resetStylesheet();

    const requiredWidth = document.getElementById("code-input-area") ?
      document.getElementById("code-input-area").getBoundingClientRect().width :
      640;

    stylesheet.insertRule(`#table-holder { min-width: ${requiredWidth}px }`);
  }

  function alignment(field) {
    if (
      (field.type.indexOf("text") > -1) ||
      (field.type.indexOf("char") > -1) ||
      (field.type.indexOf("date") > -1) ||
      (field.type.indexOf("time") > -1)
    ) {
      return "left";
    }
    return "right";
  }

  const dateFormatter = new Intl.DateTimeFormat(window.navigator.language, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timestampFormatter = new Intl.DateTimeFormat(window.navigator.language, { hour: 'numeric', minute: 'numeric', second: 'numeric', year: 'numeric', month: '2-digit', day: '2-digit' });
  const formatters = {
    "date": (s) => dateFormatter.format(new Date(s)),
    "timestamp": (s) => timestampFormatter.format(new Date(s)),
  }

  function getFormatter(sqlType) {
    if (formatters.hasOwnProperty(sqlType)) {
      return formatters[sqlType];
    }
    return null;
  }


  let args = [];

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

  $: args = getValuesFromControls(controls).concat(getValuesFromResults(result));


  function getFieldnames(myArgs) {
    return myArgs.map(({name}) => name).concat(
      (result && result.fields) ? (result.fields || []).map(({name}) => name) : []
    );
  }

  afterUpdate(syncTable);
  window.onresize = debounce(syncTable, 200);
</script>
<style>
  #table-holder {
    max-height: 400px;
    overflow-y: scroll;
  }
  #table-holder table th {
    position: sticky;
    top: 0;
    z-index: 2;
    background-color: #dadee4;
  }
</style>
<div id={id}>
  <style id={ id + "-style" }>
  </style>
  {#if result && ((result.status == "complete") || (result.status == "preview"))}
  <div class="columns">
    <div class="column col-auto" style="margin: 0 auto">
      <div id="table-holder">
      <table class="results-head table table-striped table-hover" style="padding-bottom: 0; margin: 0">
        <thead>
          <tr>
            {#each result.fields as field}
            <th style={ "text-align: " + alignment(field) }>{field.name}</th>
            {/each}
            {#if (definition.row_links && definition.row_links.length) || inPopup}
            <th></th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each result.rows || [] as row}
          <tr>
            {#each row as cell, i}
            <td style={ "text-align: " + alignment(result.fields[i]) }>
              {#if cell === null}
              NULL
              {:else if getFormatter(result.fields[i].type)}
              { getFormatter(result.fields[i].type)(cell) }
              {:else}
              {cell}
              {/if}
            </td>
            {/each}
            {#if (definition.row_links && definition.row_links.length) || inPopup}
            {#if inPopup}
            <td style="text-align: center">
              <button class="btn btn-link" on:click={c => pick(row)}>Pick</button>
            </td>
            {:else}
            <td style="text-align: left">
              {#each definition.row_links  || [] as link}
              <Link link={getLink(normalizeLink(getFieldnames(args), link), asRow(row, result.fields, args)) }/>
              {/each}
            </td>
            {/if}
            {/if}
          </tr>
          {/each}
        </tbody>
      </table>
      </div>
      {#if inPopup}
        {#if !result.full_data_set }
        <div class="toast toast-warning toast-resultset-warning">
          ⚠ The result set is very large and not all results are shown.
        </div>
        {/if}
      {:else if !result.full_data_set }
        <div class="toast toast-warning toast-resultset-warning" >
          ⚠ Warning: This result set is very large and not all are shown. If you want to see the full results you will have to <a href="#show-downloads" on:click|preventDefault={showDownloads}>download them</a>.
        </div>
      {:else}
        <div class="toast toast-success toast-resultset-warning">
          All the results are showing but you can sitill <a href="#show-downloads" on:click|preventDefault={showDownloads}>download the results</a>.
        </div>
      {/if}
    </div>
  </div>
  {/if}
</div>
