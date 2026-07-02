"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PRIORIDAD_ORDEN } from "@/lib/types";
import type { Prioridad, Task } from "@/lib/types";

// Valida los valores de `prioridad` de la URL contra el dominio real; cualquier
// valor desconocido se ignora (la URL es editable a mano / compartible).
const VALID_PRIORIDADES = new Set<Prioridad>(PRIORIDAD_ORDEN);

function parsePrioridades(raw: string | null): Set<Prioridad> {
  const set = new Set<Prioridad>();
  if (!raw) return set;
  for (const part of raw.split(",")) {
    const v = part.trim() as Prioridad;
    if (VALID_PRIORIDADES.has(v)) set.add(v);
  }
  return set;
}

// Estado de filtro de tareas (prioridad + keystones): la URL es la única fuente
// de verdad (vistas compartibles y persistentes al refrescar). No toca el store
// ni dispara queries. Compartido por la lista (Overview) y el tablero (Board)
// para que ambos filtren idéntico. El orden (`sort`) es concepto solo de la lista
// y lo maneja TaskList sobre `updateQuery`.
export function useTaskFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const selectedPrios = useMemo(
    () => parsePrioridades(searchParams.get("prioridad")),
    [searchParams],
  );
  const keystonesOnly = searchParams.get("keystones") === "1";
  const filtersActive = selectedPrios.size > 0 || keystonesOnly;

  // Reescribe los query params conservando los que no gestionamos aquí.
  const updateQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const togglePrioridad = useCallback(
    (p: Prioridad) => {
      updateQuery((params) => {
        const next = new Set(selectedPrios);
        if (next.has(p)) next.delete(p);
        else next.add(p);
        // Serializamos en el orden canónico para que la URL sea estable/legible.
        if (next.size === 0) params.delete("prioridad");
        else params.set("prioridad", PRIORIDAD_ORDEN.filter((x) => next.has(x)).join(","));
      });
    },
    [updateQuery, selectedPrios],
  );

  const toggleKeystones = useCallback(() => {
    updateQuery((params) => {
      if (keystonesOnly) params.delete("keystones");
      else params.set("keystones", "1");
    });
  }, [updateQuery, keystonesOnly]);

  const clearFilters = useCallback(() => {
    updateQuery((params) => {
      params.delete("prioridad");
      params.delete("keystones");
    });
  }, [updateQuery]);

  // Aplica los filtros sobre una lista ya cargada (no re-consulta).
  const filterTasks = useCallback(
    (tasks: Task[]) => {
      let v = tasks;
      if (selectedPrios.size > 0) v = v.filter((t) => selectedPrios.has(t.prioridad));
      if (keystonesOnly) v = v.filter((t) => t.es_clave);
      return v;
    },
    [selectedPrios, keystonesOnly],
  );

  return {
    searchParams,
    selectedPrios,
    keystonesOnly,
    filtersActive,
    updateQuery,
    togglePrioridad,
    toggleKeystones,
    clearFilters,
    filterTasks,
  };
}
