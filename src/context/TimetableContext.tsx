"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase/supabase";
import { TimetableData } from "@/app/timetable/types";
import { toast } from "sonner";
import { Days } from "@/helpers/page";

interface TimetableVersionContextType {
  versions: number[];
  selectedVersion: number | null;
  timetableData: TimetableData;
  loading: boolean;
  error: string | null;
  setSelectedVersion: (version: number | null) => void;
  saveTimetableData: (data: TimetableData, version?: number) => Promise<number>;
  deleteVersion: (version: number) => Promise<void>;
}

const TimetableVersionContext = createContext<
  TimetableVersionContextType | undefined
>(undefined);

interface TimetableVersionProviderProps {
  initialData: {
    versions: number[];
    selectedVersion: number | null;
    allVersionData: Record<number, TimetableData>;
  };
  children: React.ReactNode;
}

export const TimetableVersionProvider: React.FC<
  TimetableVersionProviderProps
> = ({ initialData, children }) => {
  // Initialize selectedVersion with sessionStorage or initialData
  const getInitialSelectedVersion = (): number | null => {
    if (typeof window !== "undefined") {
      const storedVersion = window.sessionStorage.getItem("selectedVersion");
      if (storedVersion) {
        const versionNum = parseInt(storedVersion, 10);
        if (initialData.versions.includes(versionNum)) {
          console.log(
            "Initialized selectedVersion from sessionStorage:",
            versionNum
          ); // Debug log
          return versionNum;
        }
      }
    }
    console.log(
      "Initialized selectedVersion from initialData:",
      initialData.selectedVersion
    ); // Debug log
    return initialData.selectedVersion;
  };

  // Initialize state
  const [versions, setVersions] = useState<number[]>(initialData.versions);
  const [selectedVersion, setSelectedVersionState] = useState<number | null>(
    getInitialSelectedVersion()
  );
  const [allVersionData, setAllVersionData] = useState<
    Record<number, TimetableData>
  >(initialData.allVersionData);
  const [timetableData, setTimetableData] = useState<TimetableData>(
    initialData.allVersionData[getInitialSelectedVersion() as number] || {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    }
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Persist selectedVersion to sessionStorage
  useEffect(() => {
    if (selectedVersion !== null && typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "selectedVersion",
        selectedVersion.toString()
      );
      console.log(
        "Persisted selectedVersion to sessionStorage:",
        selectedVersion
      ); // Debug log
    }
  }, [selectedVersion]);

  // Update timetableData when selectedVersion changes
  useEffect(() => {
    console.log("Selected version changed to:", selectedVersion); // Debug log
    if (selectedVersion !== null) {
      if (allVersionData[selectedVersion]) {
        setTimetableData(allVersionData[selectedVersion]);
        setError(null);
        setLoading(false);
        console.log(
          "Used preloaded allVersionData for version:",
          selectedVersion,
          "Data:",
          allVersionData[selectedVersion]
        ); // Debug log
      } else {
        fetchTimetableData(selectedVersion);
      }
    } else {
      setTimetableData({
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
      });
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, allVersionData]);

  // Fetch timetable data (for uncached versions or post-save validation)
  const fetchTimetableData = useCallback(
    async (version: number, retries = 1) => {
      setLoading(true);
      setError(null);
      console.log(
        `Fetching timetable data for version: ${version}, retries left: ${retries}`
      ); // Debug log
      try {
        const { data, error } = await supabase
          .from("timetable_data")
          .select("data")
          .eq("version_number", version)
          .single();

        if (error) {
          if (retries > 0) {
            console.warn(
              `Retrying fetch for version ${version}, error:`,
              error
            ); // Debug log
            return await fetchTimetableData(version, retries - 1);
          }
          throw error;
        }

        const fetchedData: TimetableData = data?.data || {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
        };

        // Normalize data
        Days.forEach((day) => {
          if (!fetchedData[day]) {
            fetchedData[day] = [];
          }
        });

        setAllVersionData((prev) => {
          const newData = { ...prev, [version]: fetchedData };
          console.log(
            `Updated allVersionData for version ${version}:`,
            newData
          ); // Debug log
          return newData;
        });
        setTimetableData(fetchedData);
        console.log(`Set timetableData for version ${version}:`, fetchedData); // Debug log
      } catch (err) {
        console.error("Fetch timetable error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch timetable data"
        );
        setTimetableData({
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
        });
      } finally {
        setLoading(false);
        console.log("Data fetch complete, loading:", false); // Debug log
      }
    },
    []
  );

  const setSelectedVersion = useCallback(
    (version: number | null) => {
      console.log(`Setting selected version to: ${version}`); // Debug log
      if (version !== null && !versions.includes(version)) {
        console.warn(`Version ${version} not in available versions:`, versions); // Debug log
        return;
      }
      setSelectedVersionState(version);
    },
    [versions]
  );

  const saveTimetableData = useCallback(
    async (data: TimetableData, version?: number): Promise<number> => {
      try {
        setLoading(true);
        console.log("Saving timetable data, version:", version || "new"); // Debug log
        let newVersion: number;

        if (version !== undefined) {
          // Update existing version
          const { error } = await supabase
            .from("timetable_data")
            .update({ data, updated_at: new Date().toISOString() })
            .eq("version_number", version);

          if (error) throw error;
          newVersion = version;
        } else {
          // Create new version
          const { data: maxVersionData, error: maxVersionError } =
            await supabase
              .from("timetable_data")
              .select("version_number")
              .order("version_number", { ascending: false })
              .limit(1)
              .single();

          if (maxVersionError && maxVersionError.code !== "PGRST116")
            throw maxVersionError;

          newVersion = maxVersionData ? maxVersionData.version_number + 1 : 1;

          const { error } = await supabase.from("timetable_data").insert({
            version_number: newVersion,
            data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (error) throw error;

          setVersions((prev) => {
            const newVersions = [...prev, newVersion].sort((a, b) => a - b);
            console.log("Updated versions:", newVersions); // Debug log
            return newVersions;
          });
        }

        // Fetch the saved version to ensure server consistency
        await fetchTimetableData(newVersion);
        setSelectedVersion(newVersion);
        console.log(`Selected newest version after save: ${newVersion}`); // Debug log
        toast.success(`Timetable saved as Version ${newVersion}`);
        return newVersion;
      } catch (err) {
        console.error("Save timetable error:", err);
        toast.error("Failed to save timetable");
        throw err;
      } finally {
        setLoading(false);
        console.log("Save complete, loading:", false); // Debug log
      }
    },
    [setSelectedVersion, fetchTimetableData]
  );

  const deleteVersion = useCallback(
    async (version: number) => {
      try {
        setLoading(true);
        console.log(
          `Deleting version: ${version}, current selectedVersion: ${selectedVersion}`
        ); // Debug log
        const { error } = await supabase
          .from("timetable_data")
          .delete()
          .eq("version_number", version);

        if (error) throw error;

        const remainingVersions = versions
          .filter((v) => v !== version)
          .sort((a, b) => a - b); // Ascending order
        setVersions(remainingVersions);
        setAllVersionData((prev) => {
          const newData = { ...prev };
          delete newData[version];
          console.log("Updated allVersionData after delete:", newData); // Debug log
          return newData;
        });

        // If deleting the selected version, shift to the previous version
        if (selectedVersion === version) {
          const currentIndex = versions.indexOf(version);
          const prevVersion =
            currentIndex > 0 ? versions[currentIndex - 1] : null;
          setSelectedVersion(prevVersion);
          console.log(
            `Deleted selected version ${version}, shifted to previous version: ${prevVersion}`
          ); // Debug log
        } else {
          console.log(
            `Deleted non-selected version ${version}, selectedVersion unchanged: ${selectedVersion}`
          ); // Debug log
        }

        toast.success(`Version ${version} deleted`);
      } catch (err) {
        console.error("Delete version error:", err);
        toast.error("Failed to delete version");
        throw err;
      } finally {
        setLoading(false);
        console.log("Delete complete, loading:", false); // Debug log
      }
    },
    [versions, selectedVersion, setSelectedVersion]
  );

  const value: TimetableVersionContextType = {
    versions,
    selectedVersion,
    timetableData,
    loading,
    error,
    setSelectedVersion,
    saveTimetableData,
    deleteVersion,
  };

  return (
    <TimetableVersionContext.Provider value={value}>
      {children}
    </TimetableVersionContext.Provider>
  );
};

export const useTimetableVersion = () => {
  const context = useContext(TimetableVersionContext);
  if (!context) {
    throw new Error(
      "useTimetableVersion must be used within a TimetableVersionProvider"
    );
  }
  return context;
};
