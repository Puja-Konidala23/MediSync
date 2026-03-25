import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Appointment, Doctor, Hospital } from "../types";
import { Calendar, Clock, MapPin, User, Check, X, Plus, AlertCircle, CheckCircle2, Hospital as HospitalIcon, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";

const Appointments = () => {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: "",
    date: "",
    time: "10:00"
  });

  useEffect(() => {
    if (!profile) return;

    let q;
    if (profile.role === "admin") {
      q = collection(db, "appointments");
    } else if (profile.role === "worker") {
      q = query(collection(db, "appointments"), where("hospitalId", "==", profile.hospitalId));
    } else {
      q = query(collection(db, "appointments"), where("patientId", "==", profile.uid));
    }

    const unsubAppointments = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });

    const fetchDoctors = async () => {
      const snap = await getDocs(collection(db, "doctors"));
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    };
    const fetchHospitals = async () => {
      const snap = await getDocs(collection(db, "hospitals"));
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital)));
    };
    fetchDoctors();
    fetchHospitals();

    return unsubAppointments;
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const doctor = doctors.find(d => d.id === formData.doctorId);
    const data = {
      patientId: profile.uid,
      patientName: profile.name,
      doctorId: formData.doctorId,
      doctorName: doctor?.name || "",
      hospitalId: doctor?.hospitalId || "",
      date: `${formData.date}T${formData.time}:00Z`,
      status: "pending"
    };

    try {
      await addDoc(collection(db, "appointments"), data);
      setIsModalOpen(false);
      setFormData({ doctorId: "", date: "", time: "10:00" });
    } catch (err) {
      alert("Error booking appointment");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "appointments", id), { status });
  };

  const isPatient = profile?.role === "patient";

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500">Manage your medical consultations</p>
        </div>
        {isPatient && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            Book Appointment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {appointments.map((a) => (
          <motion.div
            layout
            key={a.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-6 group hover:border-slate-300 transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{a.doctorName}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <HospitalIcon className="w-4 h-4" /> {hospitals.find(h => h.id === a.hospitalId)?.name || "Hospital"}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : a.status === 'pending' ? 'bg-orange-50 text-orange-600' : a.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                {a.status}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-600 border-t border-slate-50 pt-4">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(a.date).toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {!isPatient && a.status === 'pending' && (
              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => updateStatus(a.id, 'confirmed')}
                  className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Confirm
                </button>
                <button 
                  onClick={() => updateStatus(a.id, 'cancelled')}
                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {appointments.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 italic">
            No appointments found
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">Book Appointment</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Doctor</label>
                  <select
                    required
                    value={formData.doctorId}
                    onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Time</label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Appointments;
