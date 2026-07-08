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

/** Profit-Loss Report — 2-min cache */
export function useProfitLoss() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/finance/reports/profit-loss",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    profit:        data?.data ?? null,
    profitLoading: isLoading,
    profitError:   error,
    refreshProfit: mutate,
  };
}

/** Attendance Summary — 2-min cache */
export function useAttendanceSummary() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/attendance/summary",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    attendance:       data?.data ?? null,
    attendanceLoading: isLoading,
    attendanceError:   error,
    refreshAttendance: mutate,
  };
}

/** Notifications Unread Count — 30-sec cache */
export function useNotificationsUnread() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/notifications/unread-count",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  return {
    unread:        data?.data?.unread ?? 0,
    unreadLoading: isLoading,
    unreadError:   error,
    refreshUnread: mutate,
  };
}

/** Recent Online Payments — 1-min cache */
export function useRecentTransactions(limit = 8) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/finance/paystack/transactions?status=SUCCESS&limit=${limit}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  return {
    transactions:       data?.data ?? [],
    transactionsLoading: isLoading,
    transactionsError:   error,
    refreshTransactions: mutate,
  };
}

/** Total Students Count — 5-min cache */
export function useStudentsCount() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/students/?limit=1",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    count:        data?.pagination?.total ?? 0,
    countLoading: isLoading,
    countError:    error,
    refreshCount: mutate,
  };
}

/** Total Classes Count — 5-min cache */
export function useClassesCount() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/classes/?limit=1",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    count:        data?.pagination?.total ?? 0,
    countLoading: isLoading,
    countError:    error,
    refreshCount: mutate,
  };
}

/** Total Staff Count — 5-min cache */
export function useStaffCount() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/staff/?limit=1",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    count:        data?.pagination?.total ?? 0,
    countLoading: isLoading,
    countError:    error,
    refreshCount: mutate,
  };
}

/** Announcements list — 2-min cache */
export function useAnnouncements(includeAll = false) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/announcements?include_all=${includeAll}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    announcements:       (data?.data ?? []) as any[],
    announcementsLoading: isLoading,
    announcementsError:   error,
    refreshAnnouncements: mutate,
  };
}

/** Invoices Stats — 2-min cache */
export function useInvoicesStats() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/finance/invoices?limit=500",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    invoicesData:  (data?.data ?? []) as any[],
    invoicesTotal: data?.pagination?.total ?? 0,
    loading:       isLoading,
    error:         error,
    refreshStats:  mutate,
  };
}

/** Students list with pagination, search, and status — 30-sec cache */
export function useStudentsList(page: number, limit: number, search: string, status: string) {
  const query = `/api/v1/students/?skip=${(page - 1) * limit}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}${status ? `&status=${status}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return {
    students: (data?.data ?? []) as any[],
    total: data?.pagination?.total ?? 0,
    loading: isLoading,
    error,
    refreshStudents: mutate,
  };
}

/** Invoices list by session and term — 30-sec cache */
export function useInvoicesList(sessionId: string, termId: string) {
  const query = sessionId && termId
    ? `/api/v1/finance/invoices?session_id=${sessionId}&term_id=${termId}&limit=500`
    : null;
  const { data, error, isLoading, mutate } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return {
    invoices: (data?.data ?? []) as any[],
    loading: isLoading,
    error,
    refreshInvoices: mutate,
  };
}

/** Active students list — 1-min cache */
export function useActiveStudents() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/students/?limit=500&status=ACTIVE",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  return {
    students: (data?.data ?? []) as any[],
    loading: isLoading,
    error,
    refreshStudents: mutate,
  };
}

/** Current Session — 5-min cache */
export function useCurrentSession() {
  const { data, error, isLoading } = useSWR(
    "/api/v1/academic/sessions/current",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    currentSession: data?.data ?? null,
    loading: isLoading,
    error,
  };
}

/** Logged-in Teacher Profile — 5-min cache */
export function useTeacherProfile() {
  const { data, error, isLoading } = useSWR(
    "/api/v1/staff/me",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: FIVE_MIN }
  );
  return {
    staff: data?.data ?? null,
    loading: isLoading,
    error,
  };
}

/** Class Students — 1-min cache */
export function useClassStudents(classId?: number) {
  const query = classId ? `/api/v1/students/?class_id=${classId}&limit=200` : null;
  const { data, error, isLoading } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  return {
    students: (data?.data ?? []) as any[],
    loading: isLoading,
    error,
  };
}

/** Class Attendance by Date — 10-sec cache */
export function useClassAttendance(classId?: number, date?: string) {
  const query = classId && date ? `/api/v1/attendance/class/${classId}?date=${date}` : null;
  const { data, error, isLoading, mutate } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
  return {
    records: (data?.data ?? []) as any[],
    loading: isLoading,
    error,
    refreshAttendance: mutate,
  };
}

/** Fee Structures list — 2-min cache */
export function useFeeStructures() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/finance/fee-structures",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    feeStructures: (data?.data ?? []) as any[],
    fsLoading: isLoading,
    fsError: error,
    refreshFeeStructures: mutate,
  };
}

/** Optional Fees list — 2-min cache */
export function useOptionalFees() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/v1/finance/optional-fees",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );
  return {
    optFees: (data?.data ?? []) as any[],
    optLoading: isLoading,
    optError: error,
    refreshOptFees: mutate,
  };
}

/** Teacher's Assigned Classes — 5-min cache */
export function useTeacherClasses(teacherId?: number) {
  const query = teacherId ? `/api/v1/classes/?class_teacher_id=${teacherId}&limit=10` : null;
  const { data, error, isLoading } = useSWR(query, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: FIVE_MIN,
  });
  return {
    teacherClasses: (data?.data ?? []) as any[],
    loading: isLoading,
    error,
  };
}
