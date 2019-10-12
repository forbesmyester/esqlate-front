<script>
  import Link from "./Link.svelte";
  import { beforeUpdate, afterUpdate } from 'svelte';
  import { asRow, normalizeLink, getLink } from "./controls";
  import debounce from "debounce";

  export let definition;
  export let result;
  export let inPopup;
  export let pick;
  export let args;

  const id = inPopup ? "in-popup-results" : "out-popup-results";

  function syncTable() {


    const tds = Array.from(document.querySelectorAll(`#${id} .results-body tr:first-child td`))
      .map((td) => td.getBoundingClientRect());
    const ths = Array.from(document.querySelectorAll(`#${id} .results-head th`))
      .map((th) => th.getBoundingClientRect());
    const stylesheet = document.getElementById(id + "-style").sheet;
    const initialWidths = tds.map(
      (_td, i) => tds[i].width > ths[i].width ? tds[i].width : ths[i].width
    );
    const requiredWidth = document.getElementById("code-input-area") ?
      document.getElementById("code-input-area").getBoundingClientRect().width :
      0;
    const currentWidth = initialWidths.reduce((acc, w) => acc + w, 0)
    const extraWidth = (currentWidth < requiredWidth) ? requiredWidth - currentWidth : 0;
    const widths = tds.map((_td, i) => {
      if (i == 0) {
        return initialWidths[i] +
          Math.floor(extraWidth / initialWidths.length) +
          extraWidth % initialWidths.length;
      }
      return initialWidths[i] + Math.floor(extraWidth / initialWidths.length);
    });

    // Remove old rules
    for (let i = 0; i < stylesheet.rules.length; i++) { stylesheet.removeRule(0); }

    // Set widths
    for (let i = 0; i < widths.length; i++) {
      // TODO: Check if we need to add width to match code
      const cssRule = `#${id} .results-body td:nth-child(${i + 1}), #${id} .results-head th:nth-child(${i + 1}) {width: ${widths[i]}px}`;
      stylesheet.insertRule(cssRule);
    }

    // Perhaps set height
    if (tds.length) {
      let desiredHeight = window.innerHeight - (tds[0].top);
      let scrollDesirable = document.querySelector(`#${id} .results-body tr:last-child td`).getBoundingClientRect().top > window.innerHeight;
      if (inPopup) {
        desiredHeight = 300;
        scrollDesirable = true;
      }
      if ((desiredHeight > 200) && scrollDesirable) {
        const rule = `#${id} .results-body { max-height: ${desiredHeight}px; overflow-y: scroll; }`;
        stylesheet.insertRule(rule);
      }
    }
    stylesheet.insertRule(`#${id} { max-width: ${window.innerWidth - 32} }`);
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

  const dateFormatter = new Intl.DateTimeFormat(window.navigator.language, { year: 'numeric', month: 'long', day: '2-digit' });
  const timestampFormatter = new Intl.DateTimeFormat(window.navigator.language, { hour: 'numeric', minute: 'numeric', second: 'numeric', year: 'numeric', month: 'long', day: '2-digit' });
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

  let fieldnames = [];
  beforeUpdate(() => {
    fieldnames = (args || []).map(({name}) => name);
    fieldnames = fieldnames.concat(
      (result && result.fields) ? result.fields.map(({name}) => name) : []
    );
  });

  afterUpdate(syncTable);
  window.onresize = debounce(syncTable, 200);
</script>
  {#if result && result.fields }
  <div id="main_links">
    {#each definition.links  || [] as link}
    <Link link={getLink(normalizeLink(fieldnames, link), asRow(fieldnames, [], args)) }/>
    {/each}
  </div>
  {/if}
<div id={id}>
  <style id={ id + "-style" }>
  </style>
  {#if result && result.status == "complete"}
  <div class="columns">
    <div class="column col-auto" style="margin: 0 auto">
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
      </table>
      <table class="results-body table table-striped table-hover" style="margin: 0">
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
            <td style="text-align: center">
              {#each definition.row_links  || [] as link}
              <Link link={getLink(normalizeLink(fieldnames, link), asRow(row, result.fields, args)) }/>
              {/each}
            </td>
            {/if}
            {/if}
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  {/if}
</div>
