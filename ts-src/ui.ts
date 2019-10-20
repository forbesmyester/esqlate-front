export function getStep(decimalPlaceCount: any) {
  let i = 0;
  let r = "0.";
  while (i++ < decimalPlaceCount) {
    if (i >= decimalPlaceCount) {
      return r + "1";
    }
    r = r + "0";
  }
  return "1";
}


