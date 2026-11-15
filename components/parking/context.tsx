"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRecords, type UseRecordsReturn } from "@/hooks/use-records";
import { parseReservation, parseVehicle, type Reservation, type Vehicle } from "@/lib/parking";
import type { EntityRecord } from "@/lib/records";

/**
 * One read of the visitor's sandbox for the three parking blocks (map, reservations,
 * vehicles), and the little they share: which spot is selected, which dialog is open, and
 * the minute on the clock — a reservation starts and ends without anyone touching the page.
 */
interface ParkingState extends Pick<UseRecordsReturn, "loading" | "error" | "count" | "atLimit" | "addRaw" | "setRaw" | "removeRecord"> {
  spots: EntityRecord[];
  reservations: Reservation[];
  vehicles: Vehicle[];
  now: Date;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** `null` = closed; `{}` = open with no spot chosen yet. */
  reserving: { spotId?: string } | null;
  openReservation: (spotId?: string) => void;
  closeReservation: () => void;
}

const ParkingContext = createContext<ParkingState | null>(null);

export function ParkingProvider({ children }: { children: ReactNode }) {
  const { records, extras, loading, error, count, atLimit, addRaw, setRaw, removeRecord } = useRecords();
  const [now, setNow] = useState(() => new Date());
  const [selectedId, select] = useState<string | null>(null);
  const [reserving, setReserving] = useState<{ spotId?: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const reservations = useMemo(() => extras.flatMap((r) => parseReservation(r) ?? []), [extras]);
  const vehicles = useMemo(() => extras.flatMap((r) => parseVehicle(r) ?? []), [extras]);

  const value = useMemo<ParkingState>(
    () => ({
      spots: records,
      reservations,
      vehicles,
      now,
      loading,
      error,
      count,
      atLimit,
      addRaw,
      setRaw,
      removeRecord,
      selectedId: selectedId && records.some((r) => r.id === selectedId) ? selectedId : null,
      select,
      reserving,
      openReservation: (spotId) => setReserving(spotId ? { spotId } : {}),
      closeReservation: () => setReserving(null),
    }),
    [records, reservations, vehicles, now, loading, error, count, atLimit, addRaw, setRaw, removeRecord, selectedId, reserving]
  );

  return <ParkingContext.Provider value={value}>{children}</ParkingContext.Provider>;
}

export function useParking(): ParkingState {
  const state = useContext(ParkingContext);
  if (!state) throw new Error("useParking must be used inside <ParkingProvider>");
  return state;
}
