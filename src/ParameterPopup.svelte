<script>
export let parameter;
export let control;
export let popup

function getDisplayValue(controlValue) {
  return decodeURIComponent(
    controlValue.substr(controlValue.indexOf(" ") + 1)
  );
}

</script>
<strong>
  <button class="input-popup" on:click={() => popup(parameter.name)}>
    <div>{getDisplayValue(control.value)}</div>&nbsp;⯅
  </button>
</strong>

