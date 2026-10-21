export type Role = "patient" | "staff" | "admin";
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  birth_date: string | null;
  phone: string;
  address: string;
  role: Role;
};
export type Area = { id: string; name: string; active: boolean };
export type Service = {
  id: string;
  area_id: string;
  name: string;
  description: string;
  preparation: string;
  price: number | null;
  active: boolean;
};
export type Doctor = {
  id: string;
  area_id: string;
  name: string;
  active: boolean;
};
export type Schedule = {
  id: string;
  doctor_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
};
export type AppointmentStatus =
  "pending" | "confirmed" | "completed" | "cancelled";
export type Appointment = {
  id: string;
  patient_id: string;
  service_id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
  services: Pick<Service, "name"> | null;
  doctors: Pick<Doctor, "name"> | null;
  profiles?: Pick<Profile, "full_name" | "phone"> | null;
};
export type Result = {
  id: string;
  appointment_id: string;
  patient_id: string;
  title: string;
  file_path: string;
  created_at: string;
};
export type Feedback = {
  id: string;
  patient_id: string;
  message: string;
  created_at: string;
  resolved: boolean;
};
export type Clinic = {
  name: string;
  phone: string;
  address: string;
  email: string;
  timezone: string;
};
