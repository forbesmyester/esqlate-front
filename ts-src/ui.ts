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


export function processDateTime(paramType: string, s: string) {
    let r = '';
    const ss = paramType == "date" ?
        (s.replace(/T.*/, '') + 'T09:00:00') :
        s;
    r = new Date(ss).toISOString();
    if (paramType == 'date') {
        return r.replace(/T.*/, '');
    }
    return r;
}

