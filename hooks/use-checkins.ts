"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirestoreInstance, getCollectionPath } from "@/lib/firebase";
import { useAuth } from "./use-auth";

export interface Checkin {
  id: string;
  pillar: string;
  date: Date;
  userId: string;
}

export interface UseCheckinsReturn {
  checkins: Checkin[];
  todayCheckins: string[];
  currentStreak: number;
  loading: boolean;
  error: Error | null;
  doCheckin: (pillar: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStreak(checkins: Checkin[]): number {
  if (checkins.length === 0) return 0;

  const uniqueDates = Array.from(
    new Set(checkins.map((c) => startOfDay(c.date).toISOString()))
  )
    .map((iso) => new Date(iso))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const checkDate = uniqueDates[0]!;
  if (checkDate.getTime() !== today.getTime() && checkDate.getTime() !== yesterday.getTime()) {
    return 0;
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (uniqueDates[i]?.getTime() === expected.getTime()) {
      streak++;
    } else if (i === 0 && uniqueDates[i]?.getTime() === yesterday.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function useCheckins(): UseCheckinsReturn {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      setCheckins([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = getFirestoreInstance();
      const collPath = getCollectionPath("checkins");
      const q = query(
        collection(db, collPath),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      const items: Checkin[] = snap.docs.map((doc) => ({
        id: doc.id,
        pillar: doc.data().pillar,
        date: (doc.data().date as Timestamp).toDate(),
        userId: doc.data().userId,
      }));
      setCheckins(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch checkins"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const doCheckin = useCallback(
    async (pillar: string) => {
      if (!user) throw new Error("Must be logged in");

      const db = getFirestoreInstance();
      const collPath = getCollectionPath("checkins");
      await addDoc(collection(db, collPath), {
        pillar,
        userId: user.uid,
        date: Timestamp.now(),
      });
      await fetchCheckins();
    },
    [user, fetchCheckins]
  );

  const today = startOfDay(new Date());
  const todayCheckins = checkins
    .filter((c) => startOfDay(c.date).getTime() === today.getTime())
    .map((c) => c.pillar);

  return {
    checkins,
    todayCheckins,
    currentStreak: calculateStreak(checkins),
    loading,
    error,
    doCheckin,
    refresh: fetchCheckins,
  };
}
