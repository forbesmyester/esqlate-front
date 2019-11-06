import { EsqlateSuccessResult, EsqlateDefinition, EsqlateResult, EsqlateParameterSelect } from "esqlate-lib";
import { Cache } from "esqlate-cache";

export type URL = string;

interface InputControl { value: string | number; }
export interface Controls { [k: string]: InputControl; }

export interface OptionsForEsqlateParameterSelect {
    result: EsqlateResult;
    parameter: EsqlateParameterSelect;
}

export interface Cache {
    definition: Cache<EsqlateDefinition>;
    selectResult: Cache<EsqlateSuccessResult>;
}

export interface EsqlateQueryComponent {
  name: string;
  val: number | string | number | boolean;
}
