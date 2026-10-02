/**
 * Minimal types for mammoth's prebuilt browser bundle, which ships no declarations.
 * We only ever call `extractRawText`, so that is all we declare.
 */
declare module "mammoth/mammoth.browser.js" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string;
    messages: unknown[];
  }>;
}
