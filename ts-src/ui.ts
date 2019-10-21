import {EsqlateParameter} from 'esqlate-lib';

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

export interface HighlightPosition {
    begin: number;
    end: number;
}

export function getHightlightPositions(params: EsqlateParameter["highlight_field"][], bitOfSql: string): HighlightPosition[] {

    function findAll(s: string, substring: string) {
        let lastPos = 0;
        let ret: number[] = [];
        while (!ret.some((r) => r === -1)) {
            lastPos = s.indexOf(substring, lastPos + 1)
            ret.push(lastPos);
        }
        return ret
            .filter((r) => r !== -1)
            .map((r) => {
                return { begin: r, end: substring.length + r };
            });
    }

    return params.filter((p) => p !== undefined).reduce(
        (acc: HighlightPosition[], param) => {
            return acc.concat(findAll(bitOfSql, "" + param));
        },
        []
    );

}

export enum LineType {
    Field = "Field",
    String = "String",
}

export interface LineField { type: LineType, value: string }

export function getHightlightString(highlightPositions: HighlightPosition[], bitOfSql: string): LineField[] {
    const sorted = highlightPositions.concat([]).sort((hpa, hpb) => hpa.begin - hpb.begin);
    let begin: number = 0;
    const r: LineField[] = [];
    sorted.forEach((hp) => {
        if (begin > hp.begin) { return; }
        r.push({ type: LineType.String, value: bitOfSql.substring(begin, hp.begin) });
        r.push({ type: LineType.Field, value: bitOfSql.substring(hp.begin, hp.end) });
        begin = hp.end;
    });
    r.push({ type: LineType.String, value: bitOfSql.substring(begin) });
    return r;
}
