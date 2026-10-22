import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { buildDataset, type MemoryDataset, type StoredImport } from "./memory-engine";
import { type Memory, type Source, type Briefing } from "./memory";
import { type DriftEvent } from "./temporal-drift";
import { executeLocalMemoryTool } from "./memory-tools";
import { useAccount } from "@/components/account";
import { listImports } from "./imports.functions";
import { type Extraction } from "./extraction";

interface MemoryStoreContextType {
  dataset: MemoryDataset;
  memories: Memory[];
  sources: Source[];
  briefing: Briefing[];
  driftEvents: DriftEvent[];
  importCount: number;
  isLoading: boolean;
  getMemory: (id: string) => Memory | undefined;
  getSource: (id: string) => Source | undefined;
  executeTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  addImport: (title: string, conversation: string, extraction: Extraction) => Promise<void>;
  resetToDefault: () => void;
  refreshVault: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = "recallos_user_imports";

function localStorageKey(userId?: string) {
  return `${LOCAL_STORAGE_KEY}:${userId ?? "anonymous"}`;
}

const MemoryStoreContext = createContext<MemoryStoreContextType | null>(null);

export function MemoryStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAccount();
  const [dataset, setDataset] = useState<MemoryDataset>(() => buildDataset([]));
  const [isLoading, setIsLoading] = useState(false);

  const loadAllImports = useCallback(async () => {
    setIsLoading(true);
    let localImports: StoredImport[] = [];
    let cloudImports: StoredImport[] = [];

    // 1. Read local storage
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(localStorageKey(session?.user.id));
        if (raw) {
          localImports = JSON.parse(raw);
        }
      } catch (e) {
        console.warn("Failed to read local memory imports:", e);
      }
    }

    // 2. Read cloud imports if signed in
    if (session) {
      try {
        const remote = await listImports();
        if (remote && Array.isArray(remote)) {
          cloudImports = remote as StoredImport[];
        }
      } catch (e) {
        console.warn("Failed to load cloud imports:", e);
      }
    }

    // Combine and build unified reactive dataset
    const combined = [...localImports, ...cloudImports];
    setDataset(buildDataset(combined));
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    loadAllImports();
  }, [loadAllImports]);

  const getMemory = useCallback(
    (id: string) => dataset.memories.find((m) => m.id === id),
    [dataset.memories],
  );

  const getSource = useCallback(
    (id: string) => dataset.sources.find((s) => s.id === id),
    [dataset.sources],
  );

  const executeTool = useCallback(
    async (name: string, args: Record<string, unknown> = {}) => {
      return executeLocalMemoryTool(name, args, dataset);
    },
    [dataset],
  );

  const addImport = useCallback(
    async (title: string, conversation: string, extraction: Extraction) => {
      const newImport: StoredImport = {
        id: `local-${Date.now()}`,
        title,
        conversation,
        extraction,
        created_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        const existing = JSON.parse(
          localStorage.getItem(localStorageKey(session?.user.id)) ?? "[]",
        ) as StoredImport[];
        existing.unshift(newImport);
        localStorage.setItem(localStorageKey(session?.user.id), JSON.stringify(existing));
      }

      await loadAllImports();
    },
    [loadAllImports, session],
  );

  const resetToDefault = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(localStorageKey(session?.user.id));
    }
    setDataset(buildDataset([]));
  }, [session]);

  return (
    <MemoryStoreContext.Provider
      value={{
        dataset,
        memories: dataset.memories,
        sources: dataset.sources,
        briefing: dataset.briefing,
        driftEvents: dataset.driftEvents,
        importCount: dataset.importCount,
        isLoading,
        getMemory,
        getSource,
        executeTool,
        addImport,
        resetToDefault,
        refreshVault: loadAllImports,
      }}
    >
      {children}
    </MemoryStoreContext.Provider>
  );
}

export function useMemoryStore() {
  const ctx = useContext(MemoryStoreContext);
  if (!ctx) {
    // Graceful fallback to static demo dataset if rendered outside provider
    const fallback = buildDataset([]);
    return {
      dataset: fallback,
      memories: fallback.memories,
      sources: fallback.sources,
      briefing: fallback.briefing,
      driftEvents: fallback.driftEvents,
      importCount: 0,
      isLoading: false,
      getMemory: (id: string) => fallback.memories.find((m) => m.id === id),
      getSource: (id: string) => fallback.sources.find((s) => s.id === id),
      executeTool: async (name: string, args: Record<string, unknown> = {}) =>
        executeLocalMemoryTool(name, args, fallback),
      addImport: async () => {},
      resetToDefault: () => {},
      refreshVault: async () => {},
    };
  }
  return ctx;
}
