export type UserRole = "admin" | "worker" | "patient";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
  hospitalName?: string;
  familyEmail?: string;
  familyPhone?: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  area: string;
  facilities: string[];
  beds: number;
  icu: number;
  oxygen: number;
  blood: Record<string, number>;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospitalId: string;
  hospitalName: string;
  experience: number;
  availability: boolean;
}

export interface PatientRecord {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  status: "critical" | "moderate" | "normal";
  reports: {
    name: string;
    url: string;
    timestamp: string;
  }[];
  lastUpdated: string;
}

export interface Review {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  hospitalId: string;
  date: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}
