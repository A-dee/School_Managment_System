import useSWR from "swr";
import api from "./api";

const fetcher = (url: string) => api.get(url).then(r => r.data);

const FIVE_MIN = 300_000;

/** Classes list — shared across pages, 5-min cache */
export function useClasses() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/classes/?limit=200",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    classes:       (data?.data ?? []) as any[],
    classesLoading: isLoading,
    classesError:   error,
    refreshClasses: mutate,
  };
}

/** Sessions list — shared across pages, 5-min cache */
export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/academic/sessions?limit=100",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    sessions:       (data?.data ?? []) as any[],
    sessionsLoading: isLoading,
    sessionsError:   error,
    refreshSessions: mutate,
  };
}

/** Staff list — shared across pages, 5-min cache */
export function useStaff() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/staff/?limit=500",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    staff:        (data?.data ?? []) as any[],
    staffLoading:  isLoading,
    staffError:    error,
    refreshStaff:  mutate,
  };
}
