import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { PatientRecord, UserProfile } from "../types";
import { ClipboardList, Plus, Edit, FileText, Activity, AlertCircle, CheckCircle2, Clock, X, Send, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";
import axios from "axios";

const PatientRecords = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatientRecord | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    status: "normal" as any,
  });

  useEffect(() => {
    if (!profile) return;

    let q;
    if (profile.role === "admin") {
      q = collection(db, "patient_records");
    } else if (profile.role === "worker") {
      q = query(collection(db, "patient_records"), where("hospitalId", "==", profile.hospitalId));
    } else {
      q = query(collection(db, "patient_records"), where("patientId", "==", profile.uid));
    }

    const unsubRecords = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientRecord)));
    });

    const fetchPatients = async () => {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "patient")));
      setPatients(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    };
    fetchPatients();

    return unsubRecords;
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.hospitalId) return;

    const patient = patients.find(p => p.uid === formData.patientId);
    const data = {
      ...formData,
      patientName: patient?.name || "",
      hospitalId: profile.hospitalId,
      lastUpdated: new Date().toISOString(),
      reports: editingRecord ? editingRecord.reports : []
    };

    try {
      if (editingRecord) {
        await updateDoc(doc(db, "patient_records", editingRecord.id), data);
      } else {
        await addDoc(collection(db, "patient_records"), data);
      }
      
      // Notify family if status is critical
      if (formData.status === "critical" && patient?.familyEmail) {
        await axios.post("/api/notify", {
          to: patient.familyEmail,
          subject: `CRITICAL UPDATE: ${patient.name}`,
          text: `Emergency update for ${patient.name}. Status changed to CRITICAL. Please contact the hospital immediately.`
        });
      }

      setIsModalOpen(false);
      setEditingRecord(null);
      setFormData({ patientId: "", status: "normal" });
    } catch (err) {
      alert("Error saving record");
    }
  };

  const handleEdit = (r: PatientRecord) => {
    setEditingRecord(r);
    setFormData({ patientId: r.patientId, status: r.status });
    setIsModalOpen(true);
  };

  const isWorker = profile?.role === "worker";

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Records</h1>
          <p className="text-slate-500">Monitor health status and medical reports</p>
        </div>
        {isWorker && (
          <button
            onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Admission
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {records.map((r) => (
          <motion.div
            layout
            key={r.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-slate-300 transition-all"
          >
            <div className="flex gap-6 items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${r.status === 'critical' ? 'bg-red-50 text-red-500' : r.status === 'moderate' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{r.patientName}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Updated: {new Date(r.lastUpdated).toLocaleString()}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.status === 'critical' ? 'bg-red-50 text-red-600' : r.status === 'moderate' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              {isWorker && (
                <button 
                  onClick={() => handleEdit(r)}
                  className="flex-1 md:flex-none bg-slate-50 text-slate-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Update Status
                </button>
              )}
              <button className="flex-1 md:flex-none bg-slate-50 text-slate-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                View Reports ({r.reports?.length || 0})
              </button>
            </div>
          </motion.div>
        ))}
        {records.length === 0 && (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 italic">
            No patient records found
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
                <h2 className="text-xl font-bold">{editingRecord ? "Update Record" : "New Admission"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Patient</label>
                  <select
                    required
                    disabled={!!editingRecord}
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Select Patient</option>
                    {patients.map(p => (
                      <option key={p.uid} value={p.uid}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["normal", "moderate", "critical"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s as any })}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold capitalize ${formData.status === s ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-200"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Changing status to <strong>Critical</strong> will automatically notify the patient's family via email and phone.
                  </p>
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
                    className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {editingRecord ? "Update" : "Admit"}
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

export default PatientRecords;
