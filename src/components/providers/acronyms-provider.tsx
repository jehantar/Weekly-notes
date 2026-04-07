"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Acronym } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

type AcronymsContextType = {
  acronyms: Acronym[];
  addAcronym: (acronym: string, definition: string) => Promise<Acronym | null>;
  updateAcronym: (id: string, updates: Partial<Pick<Acronym, "acronym" | "definition">>) => Promise<void>;
  deleteAcronym: (id: string) => void;
};

const AcronymsContext = createContext<AcronymsContextType | undefined>(undefined);

export function AcronymsProvider({
  children,
  initialAcronyms,
}: {
  children: ReactNode;
  initialAcronyms: Acronym[];
}) {
  const supabase = useSupabase();
  const [acronyms, setAcronyms] = useState(initialAcronyms);

  const acronymsRef = useRef(acronyms);
  useEffect(() => { acronymsRef.current = acronyms; }, [acronyms]);

  const addAcronym = useCallback(
    async (acronym: string, definition: string): Promise<Acronym | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("acronyms")
        .insert({ user_id: user.id, acronym: acronym.trim(), definition: definition.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Acronym already exists");
        } else {
          toast.error("Failed to add acronym");
        }
        return null;
      }

      const newAcronym = data as Acronym;
      setAcronyms((prev) => [...prev, newAcronym]);
      return newAcronym;
    },
    [supabase]
  );

  const updateAcronym = useCallback(
    async (id: string, updates: Partial<Pick<Acronym, "acronym" | "definition">>) => {
      const prev = acronymsRef.current.find((a) => a.id === id);
      if (!prev) return;

      setAcronyms((items) =>
        items.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );

      const { error } = await supabase
        .from("acronyms")
        .update(updates)
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          setAcronyms((items) => items.map((a) => (a.id === id ? prev : a)));
          toast.error("Acronym already exists");
        } else {
          setAcronyms((items) => items.map((a) => (a.id === id ? prev : a)));
          toast.error("Failed to update acronym");
        }
      }
    },
    [supabase]
  );

  const deleteAcronym = useCallback(
    (id: string) => {
      const item = acronymsRef.current.find((a) => a.id === id);
      if (!item) return;

      setAcronyms((prev) => prev.filter((a) => a.id !== id));

      const timeout = setTimeout(async () => {
        const { error } = await supabase.from("acronyms").delete().eq("id", id);
        if (error) {
          setAcronyms((prev) => [...prev, item]);
          toast.error("Failed to delete acronym");
        }
      }, UNDO_TIMEOUT);

      toast("Acronym deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setAcronyms((prev) => [...prev, item]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [supabase]
  );

  return (
    <AcronymsContext.Provider value={{ acronyms, addAcronym, updateAcronym, deleteAcronym }}>
      {children}
    </AcronymsContext.Provider>
  );
}

export function useAcronyms() {
  const context = useContext(AcronymsContext);
  if (!context) {
    throw new Error("useAcronyms must be used within AcronymsProvider");
  }
  return context;
}
