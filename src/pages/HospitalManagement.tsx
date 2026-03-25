import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Hospital } from "../types";
import { Plus, Edit, Trash2, MapPin, Bed, Activity, Wind, Droplet, Search, X, Check, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../App";
import Modal from "../components/Modal";

const HospitalManagement = () => {
  const { isAdmin } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "beds" | "icu" | "oxygen">("all");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "beds">("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    area: "",
    beds: 0,
    icu: 0,
    oxygen: 0,
    facilities: "",
    lat: 0,
    lng: 0
  });
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, title: string, message: string, type: "confirm" | "error" | "success", onConfirm?: () => void }>({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm"
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "hospitals"), (snap) => {
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital)));
    });
    return unsub;
  }, []);

  const filteredHospitals = hospitals
    .filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           h.area.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === "all" || 
                           (filter === "beds" && h.beds > 0) ||
                           (filter === "icu" && h.icu > 0) ||
                           (filter === "oxygen" && h.oxygen > 0);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "beds") return b.beds - a.beds;
      return 0;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      facilities: formData.facilities.split(",").map(f => f.trim()),
      blood: { "A+": 10, "B+": 10, "O+": 10, "AB+": 5 }, // Default blood stock
      rating: 4.5,
      reviewCount: 0
    };

    try {
      if (editingHospital) {
        await updateDoc(doc(db, "hospitals", editingHospital.id), data);
      } else {
        await addDoc(collection(db, "hospitals"), data);
        await addDoc(collection(db, "notifications"), {
          text: `New hospital "${data.name}" added to network`,
          type: "success",
          role: "admin",
          timestamp: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingHospital(null);
      setFormData({ name: "", location: "", area: "", beds: 0, icu: 0, oxygen: 0, facilities: "", lat: 0, lng: 0 });
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: "Error",
        message: "Failed to save hospital details.",
        type: "error"
      });
    }
  };

  const handleEdit = (h: Hospital) => {
    setEditingHospital(h);
    setFormData({
      name: h.name,
      location: h.location,
      area: h.area,
      beds: h.beds,
      icu: h.icu,
      oxygen: h.oxygen,
      facilities: h.facilities.join(", "),
      lat: h.lat,
      lng: h.lng
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Hospital",
      message: "Are you sure you want to remove this hospital from the network?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "hospitals", id));
        } catch (err) {
          setModalConfig({
            isOpen: true,
            title: "Error",
            message: "Failed to delete hospital.",
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
          <h1 className="text-3xl font-bold text-slate-900">Hospital Management</h1>
          <p className="text-slate-500">Add, edit, and monitor hospital facilities</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingHospital(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Hospital
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by name or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
          <Filter className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          {(["all", "beds", "icu", "oxygen"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-all ${filter === f ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
            >
              {f === "all" ? "All" : `${f} available`}
            </button>
          ))}
        </div>
        <select 
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 w-full md:w-auto"
        >
          <option value="name">Sort by Name</option>
          <option value="rating">Sort by Rating</option>
          <option value="beds">Sort by Beds</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHospitals.map((h) => (
          <motion.div
            layout
            key={h.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:border-slate-300 transition-all"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-slate-400" />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(h)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(h.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{h.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mb-6">
                <MapPin className="w-4 h-4" /> {h.location}, {h.area}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Beds</p>
                  <p className="text-lg font-bold text-blue-900">{h.beds}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">ICU</p>
                  <p className="text-lg font-bold text-red-900">{h.icu}</p>
                </div>
                <div className="bg-cyan-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1">Oxygen</p>
                  <p className="text-lg font-bold text-cyan-900">{h.oxygen}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Facilities</p>
                  <p className="text-lg font-bold text-emerald-900">{h.facilities.length}</p>
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
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">{editingHospital ? "Edit Hospital" : "Add New Hospital"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hospital Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                      placeholder="City General Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                      placeholder="Downtown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Area / City</label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">General Beds</label>
                    <input
                      type="number"
                      required
                      value={formData.beds}
                      onChange={(e) => setFormData({ ...formData, beds: parseInt(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ICU Beds</label>
                    <input
                      type="number"
                      required
                      value={formData.icu}
                      onChange={(e) => setFormData({ ...formData, icu: parseInt(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Facilities (comma separated)</label>
                    <input
                      type="text"
                      value={formData.facilities}
                      onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                      placeholder="Emergency, ICU, Pharmacy, Radiology"
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
                    {editingHospital ? "Update Hospital" : "Create Hospital"}
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

export default HospitalManagement;
