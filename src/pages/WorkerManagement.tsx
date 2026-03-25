import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile, Hospital } from "../types";
import { Users, Hospital as HospitalIcon, CheckCircle, XCircle, Trash2, ShieldCheck, Clock } from "lucide-react";
import { motion } from "motion/react";
import Modal from "../components/Modal";

const WorkerManagement = () => {
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string, type: "confirm" | "error" | "success", onConfirm?: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm"
  });

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "worker"));
    const unsubWorkers = onSnapshot(q, (snap) => {
      setWorkers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
      setLoading(false);
    });
    const unsubHospitals = onSnapshot(collection(db, "hospitals"), (snap) => {
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital)));
    });
    return () => { unsubWorkers(); unsubHospitals(); };
  }, []);

  const approveWorker = async (workerId: string, hospitalId: string) => {
    if (!hospitalId || hospitalId === "pending") {
      setModalConfig({
        isOpen: true,
        title: "Selection Required",
        message: "Please select a hospital to assign to this worker.",
        type: "info"
      });
      return;
    }
    const hospital = hospitals.find(h => h.id === hospitalId);
    try {
      await updateDoc(doc(db, "users", workerId), { 
        hospitalId,
        hospitalName: hospital?.name || ""
      });
    } catch (err) {
      console.error("Approval failed:", err);
    }
  };

  const deleteWorker = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Remove Worker",
      message: "Are you sure you want to remove this worker from the system?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "users", id));
        } catch (err) {
          console.error("Delete failed:", err);
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Worker Management</h1>
        <p className="text-slate-500">Verify and assign hospital staff to facilities</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold">Staff Verification Queue</h3>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            {workers.length} Total Workers
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-50">
                <th className="px-8 py-4 font-medium">Worker Name</th>
                <th className="px-8 py-4 font-medium">Requested Hospital</th>
                <th className="px-8 py-4 font-medium">Current Assignment</th>
                <th className="px-8 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {workers.map((worker) => (
                <tr key={worker.uid} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                        {worker.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{worker.name}</p>
                        <p className="text-xs text-slate-500">{worker.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm text-slate-600 font-medium italic">
                      {worker.hospitalName || "Not specified"}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <select
                      value={worker.hospitalId || "pending"}
                      onChange={(e) => approveWorker(worker.uid, e.target.value)}
                      className="text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="pending">Pending Approval</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                      {worker.hospitalId && worker.hospitalId !== "pending" ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <ShieldCheck className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      )}
                      <button 
                        onClick={() => deleteWorker(worker.uid)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">
                    No workers found in the system
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkerManagement;
