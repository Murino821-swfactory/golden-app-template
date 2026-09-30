"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, getDoc, getDocs, type Timestamp } from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebase";
import { getDemoSlug } from "@/lib/demo-slug";
import { applyOps, seedFirstSample } from "@/lib/records-firestore";
import {
  RECORD_LIMIT,
  buildCreateOps,
  buildDeleteOps,
  buildUpdateOps,
  coerceValues,
  recordsPath,
  sandboxRoot,
  shouldSeed,
  sortByCreatedAtDesc,
  type EntityRecord,
  type ValueError,
} from "@/lib/records";
import { config, type EntityField } from "@/lib/prototype-config";
import { useAuth } from "./use-auth";
import { useContent, useEntityFields } from "./use-content";

export { emptyValues, missingRequired, sortByCreatedAtDesc, type EntityRecord } from "@/lib/records";

/**
 * use-records.ts — the signed-in visitor's own records of this prototype's entity.
 *
 * Every visitor has a private sandbox, `demos/{slug}/users/{uid}/records` (factory-web
 * rules; sw-factory spec 2026-09-29-golden-template-v2-design.md §4). A first visit is
 * seeded with the config's `sampleRecords`, so the grid never opens empty. The shapes of the
 * writes live in lib/records.ts; this hook only sequences them.
 *
 * Several components on one page call this hook (the dashboard's KPI cards and the grid).
 * Two module-level pieces keep them honest: one seeding promise per sandbox, so both wait
 * for the same seed instead of racing it, and a change signal, so a write in the grid
 * refreshes the KPI cards too.
 */

export class RecordValidationError extends Error {
  constructor(public readonly errors: ValueError[]) {
    super(`invalid record: ${errors.map((e) => `${e.key}:${e.code}`).join(", ")}`);
  }
}

export interface UseRecordsReturn {
  records: EntityRecord[];
  fields: EntityField[];
  entityLabel: string;
  loading: boolean;
  error: Error | null;
  count: number;
  atLimit: boolean;
  addRecord: (values: Record<string, unknown>) => Promise<void>;
  updateRecord: (id: string, values: Record<string, unknown>) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const gridConfig = config.patterns.dataGrid;
const seeding = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const announceChange = () => listeners.forEach((fn) => fn());

async function seedOnce(root: string, run: () => Promise<void>): Promise<void> {
  let pending = seeding.get(root);
  if (!pending) {
    pending = run().catch((err) => console.warn("[records] seeding stopped:", err));
    seeding.set(root, pending);
  }
  await pending;
}

export function useRecords(): UseRecordsReturn {
  const { user } = useAuth();
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const localisedFields = useEntityFields();
  const fieldsKey = JSON.stringify(localisedFields);
  const fields = useMemo<EntityField[]>(() => localisedFields, [fieldsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const content = useContent();
  const entityLabel = content.dataGrid?.entityLabel ?? "Record";
  const samplesKey = JSON.stringify(
    (content.dataGrid as { sampleRecords?: unknown } | undefined)?.sampleRecords ?? null
  );
  const slug = getDemoSlug();

  const load = useCallback(async (): Promise<{ records: EntityRecord[]; count: number }> => {
    if (!user || !gridConfig) return { records: [], count: 0 };
    const db = getFirestoreInstance();
    const root = sandboxRoot(slug, user.uid);
    const samples = JSON.parse(samplesKey) as Record<string, unknown>[] | null;

    const counter = await getDoc(doc(db, root));
    if (shouldSeed(counter.exists(), samples ?? undefined)) {
      await seedOnce(root, async () => {
        const newId = () => doc(collection(db, recordsPath(slug, user.uid))).id;
        const [first, ...rest] = samples!;
        const firstId = newId();
        const seeded = await seedFirstSample(db, root, buildCreateOps(slug, user.uid, firstId, first!));
        if (!seeded) return;
        for (const sample of rest) await applyOps(db, buildCreateOps(slug, user.uid, newId(), sample));
      });
    }

    const snap = await getDocs(collection(db, recordsPath(slug, user.uid)));
    const mapped = snap.docs.map((d) => {
      const data = d.data() as { createdAt?: Timestamp; values?: Record<string, unknown> };
      return {
        id: d.id,
        userId: user.uid,
        createdAt: data.createdAt?.toDate() ?? new Date(0),
        values: data.values ?? {},
      };
    });
    return { records: sortByCreatedAtDesc(mapped), count: snap.size };
  }, [user, slug, samplesKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await load();
      setRecords(result.records);
      setCount(result.count);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => {
        if (cancelled) return;
        setRecords(result.records);
        setCount(result.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onChange = () => void refresh();
    listeners.add(onChange);
    return () => {
      cancelled = true;
      listeners.delete(onChange);
    };
  }, [load, refresh]);

  const addRecord = useCallback(
    async (raw: Record<string, unknown>) => {
      if (!user || !gridConfig) return;
      const { values, errors } = coerceValues(fields, raw);
      if (errors.length > 0) throw new RecordValidationError(errors);
      const db = getFirestoreInstance();
      const id = doc(collection(db, recordsPath(slug, user.uid))).id;
      await applyOps(db, buildCreateOps(slug, user.uid, id, values));
      announceChange();
    },
    [user, fields, slug]
  );

  const updateRecord = useCallback(
    async (id: string, raw: Record<string, unknown>) => {
      if (!user || !gridConfig) return;
      const { values, errors } = coerceValues(fields, raw);
      if (errors.length > 0) throw new RecordValidationError(errors);
      await applyOps(getFirestoreInstance(), buildUpdateOps(slug, user.uid, id, values));
      announceChange();
    },
    [user, fields, slug]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (!user || !gridConfig) return;
      await applyOps(getFirestoreInstance(), buildDeleteOps(slug, user.uid, id));
      announceChange();
    },
    [user, slug]
  );

  return {
    records,
    fields,
    entityLabel,
    loading,
    error,
    count,
    atLimit: count >= RECORD_LIMIT,
    addRecord,
    updateRecord,
    removeRecord,
    refresh,
  };
}
