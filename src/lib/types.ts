export interface Schedule {
  schedule_id: number;
  id?: number;
  event_id: number;
  event_name: string;
  event_price: string | number;
  type_name: string;
  event_type_id: number;
  unit_name: string;
  unit_id: number;
  scheduled_at: string;
  duration_minutes: string | number;
  vacancies: number;
  status?: string;
}

export interface NamedOption {
  id: number;
  name: string;
  price?: string | number;
}

export interface CheckPaymentPendencia {
  payment_id: number | string;
}

export interface CheckPaymentResult {
  has_paid: boolean;
  rejected?: boolean;
  status?: string;
  pendencias?: CheckPaymentPendencia[];
}

export interface CheckoutPayResponse {
  init_point?: string;
  error?: string;
  mensagem?: string;
  payment_id?: number | string;
}

export interface Subscriber {
  person_id?: number;
  subscribed_id: number;
  full_name?: string;
  payer_email?: string;
  email?: string;
  phone?: string;
  activity_professional?: string;
  city?: string;
  neighborhood?: string;
  transacao_gateway?: string;
  event_name?: string;
  type_name?: string;
  unit_name?: string;
  event_date?: string;
  created_at?: string;
  createdPay?: string;
  valor_evento?: string | number;
  payment_status?: string;
  enrollment_status?: string;
  is_medium?: number;
  is_tule_member?: number;
  first_time?: number;
  religion_mention?: string;
  course_reason?: string;
  who_recomended?: string;
}

export interface RegistrationPayload {
  student_full_name: FormDataEntryValue | undefined;
  student_phone: FormDataEntryValue | undefined;
  activity_professional: FormDataEntryValue | undefined;
  neighborhood: FormDataEntryValue | undefined;
  city: FormDataEntryValue | undefined;
  schedule_id: number;
  payment_id: string;
  is_medium: number;
  is_tule_member: number;
  first_time: number;
  religion_mention: FormDataEntryValue | undefined;
  course_reason: FormDataEntryValue | undefined;
  who_recomended: FormDataEntryValue | undefined;
}

export type CrudTarget = 'events' | 'units' | 'event-types';

export type Step = 'selection' | 'auth' | 'otp' | 'waiting' | 'registration';

export type AdminTab = 'inicio' | 'agenda' | 'inscricoes' | 'configuracao';
