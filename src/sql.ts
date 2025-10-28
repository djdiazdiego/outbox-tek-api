export interface NamedParams {
  [k: string]: unknown;
}
export type ParamBag = NamedParams | unknown[];

const READ_ONLY_LEXEMES = /^(select|with)\b/i;
const FORBIDDEN_TOKENS = /\b(attach|detach|pragma|vacuum|reindex|alter)\b/i;

export function ensureSingleStatement(sql: string) {
  if (sql.includes(";"))
    throw new Error("Only a single statement is allowed (no semicolons).");
}

export function ensureReadOnly(sql: string) {
  const trimmed = sql.trim();
  if (!READ_ONLY_LEXEMES.test(trimmed))
    throw new Error("Only SELECT/WITH statements are allowed.");
  if (FORBIDDEN_TOKENS.test(trimmed))
    throw new Error(
      "Forbidden token detected (attach/detach/pragma/vacuum/reindex/alter)."
    );
}

export function compileParams(
  sql: string,
  params?: ParamBag
): { sql: string; values: unknown[] } {
  if (!params) return { sql, values: [] };
  if (Array.isArray(params)) return { sql, values: params };
  const named = params as NamedParams;
  const values: unknown[] = [];
  const compiled = sql.replace(
    /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
    (_m, name: string) => {
      if (!(name in named)) throw new Error(`Missing value for :${name}`);
      values.push(named[name]);
      return "?";
    }
  );
  return { sql: compiled, values };
}
