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

export interface ControlStoreDateValue {
    value: string;
    date?: string;
    time?: string;
}

export interface ControlStoreDateValueNormalized {
    value: string;
    date: string;
    time: string;
}

export function initializeDateTime(control: ControlStoreDateValue): ControlStoreDateValueNormalized {
    const indexOfT = control.value.indexOf('T');

    const date = control.date ?
        control.date :
        indexOfT > -1 ?
            control.value.substring(0, indexOfT) :
            "";

    const time = control.time ?
        control.time :
        indexOfT > -1 ?
            control.value.substring(indexOfT + 1) :
            "";

    return { value: (date && time) ? date + 'T' + time : '', date, time };
}


export enum ProcessDateTimeWhich {
    DATE = "DATE",
    TIME = "TIME",
}


export function processDateTime(control: ControlStoreDateValue, which: ProcessDateTimeWhich): ControlStoreDateValueNormalized {

    const indexOfT = control.value.indexOf('T');

    let date = control.value.substring(0, indexOfT);
    let time = control.value.substring(indexOfT + 1);

    if ((!date) || (which == ProcessDateTimeWhich.DATE)) {
        date = control.date || "";
    }

    if ((!time) || (which == ProcessDateTimeWhich.TIME)) {
        time = control.time || "";
    }

    return { value: (date && time) ? date + 'T' + time : '', date, time };

}


export interface HighlightPosition {
    begin: number;
    end: number;
}

export function getHightlightPositions(params: EsqlateParameter["highlight_fields"], bitOfSql: string): HighlightPosition[] {

    function findAll(s: string, substring: string) {
        let lastPos = -1;
        let ret: number[] = [];

        while (!ret.some((r) => r === -1)) {
            lastPos = s.indexOf(substring, lastPos + 1)
            ret.push(lastPos);
        }

        return ret
            .filter((r) => r !== -1)
            .filter((r) => {
                return (
                    ((r == 0) || (!bitOfSql[r - 1].match(/[a-z0-9_]/))) &&
                    ((r + substring.length >= bitOfSql.length) || (!bitOfSql[r + substring.length].match(/[a-z0-9_]/)))
                );
            })
            .map((r) => {
                return { begin: r, end: substring.length + r };
            });
    }

    return (params || []).filter((p) => p !== undefined).reduce(
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
