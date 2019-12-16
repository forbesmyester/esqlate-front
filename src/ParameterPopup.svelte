<script>
export let parameter;
export let control;
export let popup
export let onerror;
export let onfix;

function getDisplayValue(controlValue) {
  return decodeURIComponent(
    controlValue.substr(controlValue.indexOf(" ") + 1)
  );
}

if (!parameter.empty_string_is_null) {
  control.value != "" ?
    onfix(parameter.name, parameter.highlight_fields) :
    onerror(parameter.name, parameter.highlight_fields);
}

</script>
<strong>
  <button data-parameter-name={parameter.name} class="input-popup" on:click={() => popup(parameter.name)}>
    <div>{getDisplayValue(control.value)}</div>&nbsp;⯅
  </button>
</strong>

