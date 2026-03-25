import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Doctor, Hospital } from "../types";
import { Plus, Edit, Trash2, Stethoscope, Hospital as HospitalIcon, Clock, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";
import Modal from "../components/Modal";

const DoctorManagement = () => {
  const { isAdmin } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    hospitalId: "",
    experience: 0,
    availability: true
  });
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string, type: "confirm" | "error" | "success", onConfirm?: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm"
  });

  useEffect(() => {
    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snap) => {
      setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
    });
    const unsubHospitals = onSnapshot(collection(db, "hospitals"), (snap) => {
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital)));
    });
    return () => { unsubDoctors(); unsubHospitals(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hospital = hospitals.find(h => h.id === formData.hospitalId);
    const data = {
      ...formData,
      hospitalName: hospital?.name || ""
    };

    try {
      if (editingDoctor) {
        await updateDoc(doc(db, "doctors", editingDoctor.id), data);
      } else {
        await addDoc(collection(db, "doctors"), data);
        await addDoc(collection(db, "notifications"), {
          text: `New doctor "${data.name}" (${data.specialization}) added to directory`,
          type: "info",
          role: "admin",
          timestamp: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingDoctor(null);
      setFormData({ name: "", specialization: "", hospitalId: "", experience: 0, availability: true });
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: "Error",
        message: "Failed to save doctor details. Please try again.",
        type: "error"
      });
    }
  };

  const handleEdit = (d: Doctor) => {
    setEditingDoctor(d);
    setFormData({
      name: d.name,
      specialization: d.specialization,
      hospitalId: d.hospitalId,
      experience: d.experience,
      availability: d.availability
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Doctor",
      message: "Are you sure you want to remove this doctor from the directory?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "doctors", id));
        } catch (err) {
          setModalConfig({
            isOpen: true,
            title: "Error",
            message: "Failed to delete doctor.",
            type: "error"
          });
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <Modal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Doctor Directory</h1>
          <p className="text-slate-500">Manage medical professionals and their availability</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingDoctor(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Doctor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((d) => (
          <motion.div
            layout
            key={d.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:border-slate-300 transition-all"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-slate-400" />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(d)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{d.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                <HospitalIcon className="w-4 h-4" /> {d.hospitalName}
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Specialization</span>
                  <span className="font-bold text-slate-900">{d.specialization}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Experience</span>
                  <span className="font-bold text-slate-900">{d.experience} Years</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${d.availability ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {d.availability ? "Available" : "Busy"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
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
                <h2 className="text-xl font-bold">{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    placeholder="Cardiologist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Hospital</label>
                  <select
                    required
                    value={formData.hospitalId}
                    onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">Select Hospital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    required
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="availability"
                    checked={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.checked })}
                    className="w-5 h-5 accent-slate-900"
                  />
                  <label htmlFor="availability" className="text-sm font-bold text-slate-700">Currently Available</label>
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
                    {editingDoctor ? "Update Doctor" : "Create Doctor"}
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

export default DoctorManagement;
