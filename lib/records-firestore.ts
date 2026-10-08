/**
 * records-firestore.ts — the only place a RecordOp touches Firestore.
 *
 * `moveCounter` is a merge-set with `increment`, so a first write CREATES the counter with
 * count 1 — exactly what factory-web's rules accept (and nothing else).
 */
import {
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type SetOptions,
} from "firebase/firestore";
import type { RecordOp } from "./records";

interface Writer {
  set(ref: DocumentReference, data: Record<string, unknown>, options?: SetOptions): unknown;
  update(ref: DocumentReference, data: Record<string, unknown>): unknown;
  delete(ref: DocumentReference): unknown;
}

function write(target: Writer, db: Firestore, op: RecordOp): void {
  const ref = doc(db, op.path);
  switch (op.kind) {
    case "setRecord":
      target.set(ref, { values: op.values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return;
    case "updateRecord":
      target.update(ref, { values: op.values, updatedAt: serverTimestamp() });
      return;
    case "deleteRecord":
      target.delete(ref);
      return;
    case "moveCounter":
      target.set(ref, { count: increment(op.delta), last: op.last }, { merge: true });
      return;
  }
}

export async function applyOps(db: Firestore, ops: RecordOp[]): Promise<void> {
  const batch = writeBatch(db);
  for (const op of ops) write(batch as unknown as Writer, db, op);
  await batch.commit();
}

/** The first sample of a first visit. Returns false — and writes nothing — when the counter
 * already exists, so two tabs opening the grid at once cannot seed twice. */
export async function seedFirstSample(db: Firestore, counterPath: string, ops: RecordOp[]): Promise<boolean> {
  return runTransaction(db, async (tx) => {
    const counter = await tx.get(doc(db, counterPath));
    if (counter.exists()) return false;
    for (const op of ops) write(tx as unknown as Writer, db, op);
    return true;
  });
}
