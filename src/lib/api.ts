import type {
  CheckPaymentResult,
  CheckoutPayResponse,
  CrudTarget,
  NamedOption,
  RegistrationPayload,
  Schedule,
  Subscriber,
} from './types';

export const API_BASE_URL =
  window.location.hostname === 'localhost' ? 'http://localhost:8080' : `https://${window.location.hostname}`;

export const APP_VERSION = '2.0.0beta';

// REQ: 401 outside /api/auth/* means the admin session expired — bounce to login.
export const safeFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, options);
  if (response.status === 401 && !url.includes('/api/auth/')) {
    alert('Sessão expirou por falta de atividade');
    localStorage.removeItem('admin_full_name');
    window.location.href = '/login';
  }
  return response;
};

const withCredentials: RequestInit = { credentials: 'include' };
const jsonHeaders = { 'Content-Type': 'application/json' };

// ---------------------------------------------------------------------------
// Sanitizers (cleanup cron endpoints)
// ---------------------------------------------------------------------------

export const cleanupPendingTransactions = async (): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cron/transactions-cleanup`, withCredentials);
    const data = await res.json();
    if (data.deleted > 0) console.log(`🧹 Cleanup: ${data.deleted} expired transaction(s) removed`);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

export const cleanupExpiredCodes = async (): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cron/codes-cleanup`, withCredentials);
    const data = await res.json();
    if (data.deleted > 0) console.log(`🧹 Codes cleanup: ${data.deleted} expired code(s) removed`);
  } catch (err) {
    console.error('Codes cleanup error:', err);
  }
};

export const cleanupExpiredSchedules = async (): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/cron/schedules-cleanup`, withCredentials);
    const data = await res.json();
    if (data.deleted > 0 || data.updated > 0) {
      console.log(`🧹 Schedules cleanup: ${data.updated || data.deleted} expired schedule(s) closed`);
    }
  } catch (err) {
    console.error('Schedules cleanup error:', err);
  }
};

// ---------------------------------------------------------------------------
// Public schedule
// ---------------------------------------------------------------------------

export const fetchSchedules = async (eventSlug = '', typeSlug = ''): Promise<Schedule[]> => {
  const url = `${API_BASE_URL}/api/schedules?slug=${eventSlug}&type=${typeSlug}`;
  const response = await fetch(url, withCredentials);
  return response.json();
};

// ---------------------------------------------------------------------------
// Payment verification & checkout
// ---------------------------------------------------------------------------

export const checkPayment = async (email: string, scheduleId?: number): Promise<CheckPaymentResult> => {
  const res = await fetch(`${API_BASE_URL}/api/check-payment`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, schedule_id: scheduleId }),
  });
  return res.json();
};

export const generateOtpCode = async (email: string, nome: string, telefone: string) =>
  fetch(`${API_BASE_URL}/api/auth/generate-code`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, nome, telefone }),
  });

export const validateOtpCode = async (email: string, code: string, nome: string, phone: string) =>
  fetch(`${API_BASE_URL}/api/auth/validate-code`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, code, nome, phone }),
  });

export const checkoutPay = async (payload: {
  email: string;
  schedule_id: number;
  payer_name: string;
  person_id?: number;
}): Promise<{ status: number; ok: boolean; data: CheckoutPayResponse }> => {
  const res = await fetch(`${API_BASE_URL}/api/checkout/pay`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
};

export const validatePayment = async (paymentId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/payment/validate`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ payment_id: paymentId }),
  });
  const result = await res.json();
  return { ok: res.ok, result };
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export const submitRegistration = async (payload: RegistrationPayload) => {
  const res = await fetch(`${API_BASE_URL}/api/register/subscribers`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  return { ok: res.ok, result };
};

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

export const adminLogin = async (email: string, password: string) =>
  safeFetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

export const adminLogout = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore — we clear local session regardless
  }
};

// ---------------------------------------------------------------------------
// Admin schedules
// ---------------------------------------------------------------------------

export const fetchAdminSchedules = async (): Promise<Schedule[]> => {
  const res = await safeFetch(`${API_BASE_URL}/api/admin/schedules`, withCredentials);
  return res.json();
};

export interface SchedulePayload {
  scheduled_at: string;
  event_id: number;
  unit_id: number;
  event_type_id: number;
  vacancies: number;
  duration_minutes: number;
  status: 'available';
}

export const createSchedule = async (payload: SchedulePayload) =>
  safeFetch(`${API_BASE_URL}/api/admin/schedules`, {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

export const updateSchedule = async (id: number, payload: SchedulePayload) =>
  safeFetch(`${API_BASE_URL}/api/admin/schedules/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

export const deleteSchedule = async (id: number) =>
  safeFetch(`${API_BASE_URL}/api/admin/schedules/${id}`, { method: 'DELETE', credentials: 'include' });

// ---------------------------------------------------------------------------
// Admin form options + CRUD (events / units / event-types)
// ---------------------------------------------------------------------------

export const fetchFormOptions = async () => {
  const [events, units, eventTypes] = await Promise.all([
    safeFetch(`${API_BASE_URL}/api/admin/events`, withCredentials).then((r) => r.json()),
    safeFetch(`${API_BASE_URL}/api/admin/units`, withCredentials).then((r) => r.json()),
    safeFetch(`${API_BASE_URL}/api/admin/event-types`, withCredentials).then((r) => r.json()),
  ]);
  return { events, units, eventTypes } as { events: NamedOption[]; units: NamedOption[]; eventTypes: NamedOption[] };
};

export const fetchCrudList = async (target: CrudTarget): Promise<NamedOption[]> => {
  const res = await safeFetch(`${API_BASE_URL}/api/admin/${target}`, withCredentials);
  return res.json();
};

export const saveCrudItem = async (target: CrudTarget, payload: { name: string; price?: string }) =>
  safeFetch(`${API_BASE_URL}/api/admin/${target}`, {
    method: 'POST',
    headers: jsonHeaders,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

export const deleteCrudItem = async (target: CrudTarget, id: string) =>
  safeFetch(`${API_BASE_URL}/api/admin/${target}/${id}`, { method: 'DELETE', credentials: 'include' });

// ---------------------------------------------------------------------------
// Admin subscribers / inscriptions
// ---------------------------------------------------------------------------

export const fetchSubscribers = async (): Promise<Subscriber[]> => {
  const res = await safeFetch(`${API_BASE_URL}/api/admin/subscribers`, withCredentials);
  return res.json();
};
