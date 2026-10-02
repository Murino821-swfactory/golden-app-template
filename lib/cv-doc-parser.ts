/** Word 97–2003 binary DOC: MS-DOC FibRgFcLcb97/Clx/PlcPcd.
 * Read the main story's piece table, never scan arbitrary binary bytes as CV text.
 * Encrypted and pre-97 documents fail explicitly; no file leaves the browser.
 */
import { find, read } from "cfb";

export async function parseDoc(file: File): Promise<string> {
  const container = read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const stream = (name: string): Uint8Array => {
    const entry = find(container, name);
    if (!entry?.content) throw new Error("Missing Word stream");
    return Uint8Array.from(entry.content);
  };
  const word = stream("WordDocument");
  const fib = new DataView(word.buffer);
  if (word.length < 0x1aa || fib.getUint16(0, true) !== 0xa5ec ||
      fib.getUint16(2, true) < 0xc1) throw new Error("Unsupported Word version");
  const flags = fib.getUint16(0xa, true);
  if (flags & 0x8100) throw new Error("Encrypted Word document");
  const table = stream(flags & 0x200 ? "1Table" : "0Table");
  const view = new DataView(table.buffer);
  let offset = fib.getUint32(0x1a2, true);
  const end = offset + fib.getUint32(0x1a6, true);
  if (end > table.length || end <= offset) throw new Error("Invalid Clx");
  while (offset < end && table[offset] === 1) {
    if (offset + 3 > end) throw new Error("Invalid Prc");
    offset += 3 + view.getUint16(offset + 1, true);
  }
  if (offset + 5 > end || table[offset] !== 2) throw new Error("Missing piece table");
  const length = view.getUint32(offset + 1, true);
  const count = (length - 4) / 12;
  const start = offset + 5;
  if (!Number.isInteger(count) || count < 1 || start + length > end) {
    throw new Error("Invalid piece table");
  }
  const mainLength = fib.getUint32(0x4c, true);
  const pieces: string[] = [];
  let previous = 0;
  for (let i = 0; i < count; i++) {
    const cp = view.getUint32(start + i * 4, true);
    const next = view.getUint32(start + (i + 1) * 4, true);
    if (cp !== previous || next < cp) throw new Error("Invalid character range");
    previous = next;
    if (cp >= mainLength) break;
    const fc = view.getUint32(start + (count + 1) * 4 + i * 8 + 2, true);
    const compressed = !!(fc & 0x40000000);
    const position = (fc & 0x3fffffff) / (compressed ? 2 : 1);
    const bytes = (Math.min(next, mainLength) - cp) * (compressed ? 1 : 2);
    if (!Number.isInteger(position) || position + bytes > word.length) {
      throw new Error("Invalid text range");
    }
    pieces.push(new TextDecoder(compressed ? "windows-1252" : "utf-16le")
      .decode(word.subarray(position, position + bytes)));
  }
  if (previous < mainLength) throw new Error("Incomplete main story");
  // Word paragraph/cell separators and field control characters are not CV text.
  return pieces.join("").replace(/[\r\x07\x0b\x0c]/g, "\n")
    .replace(/[\x00-\x08\x0e-\x1f]/g, "");
}
