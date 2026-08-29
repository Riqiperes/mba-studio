import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import {
  createInstructor,
  listInstructors,
  setInstructorActive,
  updateInstructor,
} from "../services/instructorsService";
import type { Instructor } from "../types/Instructor";

type InstructorInput = { fullName: string; bio?: string | null; photoUrl?: string | null };

export function useInstructors() {
  const { profile } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInstructors(await listInstructors());
    } catch (err) {
      setError("No se pudieron cargar los instructores.");
      console.error("[instructors] listInstructors fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: InstructorInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await createInstructor(profile.businessId, input);
    await reload();
  }

  async function update(id: string, input: InstructorInput) {
    await updateInstructor(id, input);
    await reload();
  }

  async function setActive(id: string, active: boolean) {
    await setInstructorActive(id, active);
    await reload();
  }

  return { instructors, loading, error, reload, create, update, setActive };
}
