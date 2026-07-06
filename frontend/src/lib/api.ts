import axios from "axios";
import Cookies from "js-cookie";
import { logger } from "@/lib/logger";
import { clearTokens, setRole, storeAccessToken } from "@/lib/auth";

const API_URL = "/api/v1";

const api = axios.create({
  // Keep browser traffic same-origin. The Next /api/v1/* route proxies to FastAPI
  // server-side, so backend hosts and payment secrets stay out of client bundles.
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof config.url === "string" && config.url.startsWith("http://")) {
    // Defensive production guard: old env/build values must not create mixed-content XHRs.
    config.url = `https://${config.url.slice("http://".length)}`;
  }
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Attach request timestamp for response timing.
  (config as any)._t = Date.now();
  logger.request(config.method || "GET", config.url || "");
  return config;
});

api.interceptors.response.use(
  (res) => {
    const ms = Date.now() - ((res.config as any)._t || Date.now());
    logger.response(res.config.method || "GET", res.config.url || "", res.status, ms, res.data);
    return res;
  },
  async (err) => {
    const cfg = err.config || {};
    const ms  = Date.now() - ((cfg as any)._t || Date.now());
    const status = err.response?.status ?? "network";
    const requestUrl = String(cfg.url || "");
    // Never try to refresh the refresh request itself, and only retry each request once.
    const isRefreshCall = requestUrl.includes("/auth/refresh");

    if (status === 401 && !cfg._retry && !isRefreshCall) {
      const refresh = Cookies.get("refresh_token");
      if (refresh) {
        try {
          cfg._retry = true;
          logger.auth("token_refresh");
          const { data } = await axios.post(
            `${API_URL}/auth/refresh`,
            { refresh_token: refresh },
            { headers: { "Content-Type": "application/json" } }
          );
          storeAccessToken(data.data.access_token);
          if (data.data.role) setRole(data.data.role);
          cfg.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api.request(cfg);
        } catch {
          logger.auth("refresh_failed");
          clearTokens();
          logger.auth("redirect_login");
          if (typeof window !== "undefined") window.location.href = "/login";
        }
      } else {
        logger.auth("redirect_login", "no refresh token");
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }

    logger.error(cfg.method || "GET", cfg.url || "", status, err.response?.data ?? err.message);
    void ms; // used above in non-401 path via logger.error (timing not critical for errors)
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post("/api/v1/auth/login", { email, password });
export const getMe = () => api.get("/api/v1/auth/me");

// Students
export const getStudents = (params?: object) => api.get("/api/v1/students/", { params });
export const createStudent = (data: object) => api.post("/api/v1/students/", data);
export const updateStudent = (id: number, data: object) => api.put(`/api/v1/students/${id}`, data);
export const graduateStudent = (id: number) => api.post(`/api/v1/students/${id}/graduate`);
export const withdrawStudent = (id: number) => api.post(`/api/v1/students/${id}/withdraw`);

// Staff
export const getStaff = (params?: object) => api.get("/api/v1/staff/", { params });
export const createStaff = (data: object) => api.post("/api/v1/staff/", data);

// Classes
export const getClasses = (params?: object) => api.get("/api/v1/classes/", { params });
export const createClass = (data: object) => api.post("/api/v1/classes/", data);

// Finance
export const getInvoices = (params?: object) => api.get("/api/v1/finance/invoices", { params });
export const getPayments = (params?: object) => api.get("/api/v1/finance/payments", { params });
export const recordPayment = (data: object) => api.post("/api/v1/finance/payments", data);
export const getDebtors = (session_id: number, term_id: number) =>
  api.get("/api/v1/finance/invoices/debtors", { params: { session_id, term_id } });
export const getProfitLoss = (params?: object) =>
  api.get("/api/v1/finance/reports/profit-loss", { params });
export const initializePaystackPayment = (invoice_id: number, payment_option: 50 | 100 = 100) =>
  api.post("/api/v1/finance/paystack/initialize", { invoice_id, payment_option });
export const verifyPaystackPayment = (reference: string) =>
  api.get(`/api/v1/finance/paystack/verify/${reference}`);
export const getPaystackTransactions = (params?: object) =>
  api.get("/api/v1/finance/paystack/transactions", { params });
export const getMyPaystackTransactions = (params?: object) =>
  api.get("/api/v1/finance/paystack/transactions/mine", { params });

// Results
export const getResults = (class_id: number, term_id: number, session_id: number) =>
  api.get(`/api/v1/results/class/${class_id}`, { params: { term_id, session_id } });

// Attendance
export const getStudentAttendance = (student_id: number) =>
  api.get(`/api/v1/attendance/student/${student_id}`);

// Notifications
export const getNotifications = () => api.get("/api/v1/notifications");
export const getNotificationUnreadCount = () => api.get("/api/v1/notifications/unread-count");
export const markNotificationRead = (id: number) => api.post(`/api/v1/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post("/api/v1/notifications/read-all");
export const clearNotification = (id: number) => api.delete(`/api/v1/notifications/${id}`);
export const clearReadNotifications = () => api.delete("/api/v1/notifications/clear-read");

// Messages
export const getInbox = (params?: object) => api.get("/api/v1/messages/inbox", { params });
export const getSent = (params?: object) => api.get("/api/v1/messages/sent", { params });
export const getMessage = (id: number) => api.get(`/api/v1/messages/${id}`);
export const sendMessage = (data: object) => api.post("/api/v1/messages/", data);
export const replyMessage = (id: number, data: object) => api.post(`/api/v1/messages/${id}/reply`, data);
export const getUnreadCount = () => api.get("/api/v1/messages/unread/count");

// Announcements
export const getAnnouncements = (params?: object) => api.get("/api/v1/announcements", { params });

// Audit logs
export const getAuditLogs = (params?: object) => api.get("/api/v1/audit-logs", { params });

// Student class assignment (teacher-accessible)
export const assignStudentToClass = (student_id: number, class_id: number) =>
  api.patch(`/api/v1/students/${student_id}/assign-class`, null, { params: { class_id } });

// Calendar / School Events
export const getCalendarEvents = (params?: { year?: number; month?: number }) =>
  api.get("/api/v1/calendar/", { params });
export const createCalendarEvent = (data: object) => api.post("/api/v1/calendar/", data);
export const updateCalendarEvent = (id: number, data: object) => api.put(`/api/v1/calendar/${id}`, data);
export const deleteCalendarEvent = (id: number) => api.delete(`/api/v1/calendar/${id}`);
