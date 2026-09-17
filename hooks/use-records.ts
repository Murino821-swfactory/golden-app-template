"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreInstance, getCollectionPath } from "@/lib/firebase";
import { useAuth } from "./use-auth";
import { config, type EntityField } from "@/lib/prototype-config";
import { useContent, useEntityFields } from "./use-content";

/**
 * use-records.ts — generic CRUD over whatever entity `prototype.config.json` declares.
 *
 * This is what replaces "the Developer agent writes a hook per prototype". The shape of a
 * record is data (`patterns.dataGrid.entity.fields`), so one tested hook serves every
 * prototype instead of one untested hook per customer.
 *
 * Records are per-user (`where userId == uid`) and, in demo mode, additionally namespaced
 * under `demos/{slug}/` by `getCollectionPath` — a prototype can never read another
 * prototype's data.
 */

/** A record's own fields are dynamic; these four are always present. */
export interface EntityRecord {
  id: string;
  userId: string;
  createdAt: Date;
  values: Record<string, unknown>;
}

export interface UseRecordsReturn {
  records: EntityRecord[];
  fields: EntityField[];
  entityLabel: string;
  loading: boolean;
  error: Error | null;
  addRecord: (values: Record<string, unknown>) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const gridConfig = config.patterns.dataGrid;

/** Empty form state derived from the configured fields — booleans start false, the rest "". */
export function emptyValues(fields: EntityField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    out[field.key] = field.type === "boolean" ? false : "";
  }
  return out;
}

/** Which configured fields are missing a value that `required` demands. Pure — unit-testable
 * without Firestore, and the form and the hook share one definition of "valid". */
export function missingRequired(
  fields: EntityField[],
  values: Record<string, unknown>
): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key];
      return v === undefined || v === null || v === "";
    })
    .map((f) => f.key);
}

export function useRecords(): UseRecordsReturn {
  const { user } = useAuth();
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Labels come from the language on screen, shapes from the config. `useEntityFields`
  // returns a fresh array each render, so it is memoised on the locale-stable JSON of the
  // labels — `fields` feeds the useCallback deps below and a new array every render would
  // rebuild addRecord every render.
  const localisedFields = useEntityFields();
  const fieldsKey = JSON.stringify(localisedFields);
  const fields = useMemo<EntityField[]>(() => localisedFields, [fieldsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const entityLabel = useContent().dataGrid?.entityLabel ?? "Record";
  const collectionName = gridConfig?.entity.key ?? "records";

  /**
   * Pure fetch: returns data, touches no state. The mount effect applies the result only
   * AFTER an await — React 19 rejects setState called synchronously inside an effect body.
   */
  const loadRecords = useCallback(async (): Promise<EntityRecord[]> => {
    if (!user || !gridConfig) return [];

    const db = getFirestoreInstance();
    const ref = collection(db, getCollectionPath(collectionName));
    const snap = await getDocs(
      query(ref, where("userId", "==", user.uid), orderBy("createdAt", "desc"))
    );

    return snap.docs.map((d) => {
      const data = d.data() as {
        userId: string;
        createdAt?: Timestamp;
        values?: Record<string, unknown>;
      };
      return {
        id: d.id,
        userId: data.userId,
        createdAt: data.createdAt?.toDate() ?? new Date(0),
        values: data.values ?? {},
      };
    });
  }, [user, collectionName]);

  /** Manual refetch — called from handlers and after writes, never from an effect body. */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await loadRecords());
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadRecords]);

  useEffect(() => {
    let cancelled = false;

    loadRecords()
      .then((recs) => {
        if (cancelled) return;
        setRecords(recs);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadRecords]);

  const addRecord = useCallback(
    async (values: Record<string, unknown>) => {
      if (!user || !gridConfig) return;

      const missing = missingRequired(fields, values);
      if (missing.length > 0) {
        throw new Error(`Missing required: ${missing.join(", ")}`);
      }

      const db = getFirestoreInstance();
      await addDoc(collection(db, getCollectionPath(collectionName)), {
        userId: user.uid,
        createdAt: Timestamp.now(),
        values,
      });
      await refresh();
    },
    [user, fields, collectionName, refresh]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (!user || !gridConfig) return;
      const db = getFirestoreInstance();
      await deleteDoc(doc(db, getCollectionPath(collectionName), id));
      await refresh();
    },
    [user, collectionName, refresh]
  );

  return {
    records,
    fields,
    entityLabel,
    loading,
    error,
    addRecord,
    removeRecord,
    refresh,
  };
}
