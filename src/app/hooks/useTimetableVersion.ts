import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, REALTIME_SUBSCRIBE_STATES } from "@/lib/supabase/supabase";

interface VersionRecord {
  version_number: number;
}

interface VersionFetchError {
  error: string;
}

interface UseTimetableVersionsResult<T> {
  versions: number[];
  selectedVersion: number | null;
  timetableData: T;
  loading: boolean;
  error: string | null;
  setSelectedVersion: (version: number | null) => void;
  refetch: (versionOverride?: number | null) => Promise<void>;
}

export function useTimetableVersions<T extends Record<string, unknown>>(
  initialData: T,
  initialVersions: number[],
  initialSelectedVersion: number | null
): UseTimetableVersionsResult<T> {
  const [versions, setVersions] = useState<number[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(
    initialSelectedVersion
  );
  const [timetableData, setTimetableData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initialFetchDone = useRef(false);
  const lastFetchedVersion = useRef<number | null>(null);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ] as const;

  const fetchData = useCallback(
    async (versionOverride?: number | null): Promise<void> => {
      if (loading) {
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const { data: versionData, error: versionError } = await supabase
          .from("timetable_data")
          .select("version_number")
          .order("version_number", { ascending: true });

        if (versionError) {
          throw new Error(versionError.message);
        }

        const versionNumbers =
          versionData?.map((v: VersionRecord) => v.version_number) ?? [];
        setVersions((prev) => {
          const hasChanged =
            JSON.stringify(prev.sort()) !==
            JSON.stringify(versionNumbers.sort());
          return hasChanged ? versionNumbers : prev;
        });

        const versionToUse =
          versionOverride ??
          selectedVersion ??
          versionNumbers[versionNumbers.length - 1] ??
          null;

        if (!versionToUse) {
          throw new Error("No valid version available");
        }

        if (
          lastFetchedVersion.current === versionToUse &&
          initialFetchDone.current
        ) {
          setLoading(false);
          return;
        }

        if (versionOverride !== undefined || !selectedVersion) {
          setSelectedVersion(versionToUse);
        }

        const response = await fetch(`/api/timetable?version=${versionToUse}`);

        if (!response.ok) {
          const errorData: VersionFetchError = await response.json();
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        const data: T = await response.json();
        const filteredData = Object.fromEntries(
          Object.entries(data).filter(([key]) =>
            days.includes(key as (typeof days)[number])
          )
        ) as T;

        setTimetableData((prev) => {
          const hasChanged =
            JSON.stringify(prev) !== JSON.stringify(filteredData);
          return hasChanged ? filteredData : prev;
        });

        lastFetchedVersion.current = versionToUse;
        initialFetchDone.current = true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load timetable";
        setError(errorMessage);
        if (!initialFetchDone.current) {
          setTimetableData(initialData);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, selectedVersion, initialData]
  );

  useEffect(() => {
    if (
      !initialFetchDone.current &&
      (!initialVersions.length || !initialSelectedVersion)
    ) {
      fetchData().catch((err) => console.error("Initial fetch error:", err));
    } else if (initialVersions.length && initialSelectedVersion) {
      initialFetchDone.current = true;
      lastFetchedVersion.current = initialSelectedVersion;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  useEffect(() => {
    const subscription = supabase
      .channel("timetable_data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_data" },
        async () => {
          // console.log("Timetable data changed:", payload);
          if (!loading && initialFetchDone.current) {
            lastFetchedVersion.current = null;
            await fetchData(selectedVersion).catch((err) =>
              console.error("Real-time fetch error:", err)
            );
          }
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
        // Check for error states
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // console.error("Subscription status:", status);
          setError(`Real-time updates failed: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, selectedVersion]);

  useEffect(() => {
    if (
      selectedVersion &&
      selectedVersion !== initialSelectedVersion &&
      initialFetchDone.current &&
      lastFetchedVersion.current !== selectedVersion
    ) {
      fetchData(selectedVersion).catch((err) =>
        console.error("Version change fetch error:", err)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, fetchData]);

  return {
    versions,
    selectedVersion,
    timetableData,
    loading,
    error,
    setSelectedVersion,
    refetch: fetchData,
  };
}
