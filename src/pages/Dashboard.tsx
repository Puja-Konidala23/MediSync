import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../App";
import { Hospital, Doctor, PatientRecord, UserProfile } from "../types";
import { 
  Activity, Bed, Thermometer, Droplet, Wind, 
  Users, UserCog, ClipboardList, ShieldAlert,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  MapPin, Star, Search, Navigation, Plus, Edit, FileText, Hospital as HospitalIcon, X
} from "lucide-react";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import axios from "axios";

import { GoogleGenAI, Type } from "@google/genai";

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case "admin":
      return <AdminDashboard />;
    case "worker":
      return <WorkerDashboard />;
    case "patient":
      return <PatientDashboard />;
    default:
      return <div>Invalid Role</div>;
  }
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
  >
    <div className={`p-4 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({ hospitals: 0, doctors: 0, workers: 0, patients: 0 });
  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const hSnap = await getDocs(collection(db, "hospitals"));
      const dSnap = await getDocs(collection(db, "doctors"));
      const uSnap = await getDocs(collection(db, "users"));
      
      const users = uSnap.docs.map(d => d.data());
      setStats({
        hospitals: hSnap.size,
        doctors: dSnap.size,
        workers: users.filter((u: any) => u.role === "worker").length,
        patients: users.filter((u: any) => u.role === "patient").length
      });

      setHospitalData(hSnap.docs.map(d => ({ name: d.data().name, beds: d.data().beds, icu: d.data().icu })));
    };
    fetchData();

    const unsubActivities = onSnapshot(
      query(collection(db, "notifications"), where("role", "==", "admin")),
      (snap) => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);
        setActivities(sorted);
      }
    );

    return () => unsubActivities();
  }, []);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        Generate a high-level executive summary of the healthcare system status based on:
        - Total Hospitals: ${stats.hospitals}
        - Total Doctors: ${stats.doctors}
        - Active Workers: ${stats.workers}
        - Registered Patients: ${stats.patients}
        - Hospital Capacity: ${JSON.stringify(hospitalData)}
        
        Provide a professional summary with key insights and recommendations.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setReport(response.text || "Report generation failed.");
    } catch (err) {
      console.error(err);
      setReport("Failed to generate report using AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">System-wide healthcare analytics and management</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Generate AI Report"}
          </button>
        </div>
      </div>

      {report && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <button onClick={() => setReport("")} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Executive System Report
          </h3>
          <div className="prose prose-invert max-w-none text-indigo-100 text-sm leading-relaxed whitespace-pre-wrap">
            {report}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Hospitals" value={stats.hospitals} icon={HospitalIcon} color="bg-blue-500" />
        <StatCard title="Total Doctors" value={stats.doctors} icon={UserCog} color="bg-indigo-500" />
        <StatCard title="Active Workers" value={stats.workers} icon={Users} color="bg-emerald-500" />
        <StatCard title="Registered Patients" value={stats.patients} icon={ClipboardList} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Hospital Capacity Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="beds" fill="#3b82f6" radius={[4, 4, 0, 0]} name="General Beds" />
                <Bar dataKey="icu" fill="#ef4444" radius={[4, 4, 0, 0]} name="ICU Beds" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6">Recent System Activity</h3>
          <div className="space-y-6">
            {activities.length > 0 ? activities.map((item, i) => (
              <div key={i} className="flex gap-4 items-start pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                <div className={`p-2 rounded-lg ${item.type === 'alert' ? 'bg-red-50 text-red-500' : item.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                  {item.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : item.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.text}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No recent activity found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkerDashboard = () => {
  const { profile } = useAuth();
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", status: "Stable", age: "", gender: "Male" });

  useEffect(() => {
    if (profile?.hospitalId) {
      const unsubHosp = onSnapshot(doc(db, "hospitals", profile.hospitalId), (doc) => {
        setHospital({ id: doc.id, ...doc.data() });
        setLoading(false);
      });

      const q = query(collection(db, "patient_records"), where("hospitalId", "==", profile.hospitalId));
      const unsubPatients = onSnapshot(q, (snap) => {
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubHosp(); unsubPatients(); };
    }
  }, [profile]);

  const updateResource = async (field: string, value: number) => {
    if (!hospital) return;
    await updateDoc(doc(db, "hospitals", hospital.id), { [field]: value });
  };

  const handleAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital) return;
    try {
      await addDoc(collection(db, "patient_records"), {
        ...newPatient,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        admittedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      });
      
      // Update hospital bed count
      if (hospital.beds > 0) {
        await updateDoc(doc(db, "hospitals", hospital.id), { beds: hospital.beds - 1 });
      }

      await addDoc(collection(db, "notifications"), {
        text: `New patient "${newPatient.name}" admitted to ${hospital.name}`,
        type: "info",
        role: "admin",
        timestamp: new Date().toISOString()
      });

      setIsAdmissionModalOpen(false);
      setNewPatient({ name: "", status: "Stable", age: "", gender: "Male" });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading hospital data...</div>;

  return (
    <div className="space-y-8">
      {isAdmissionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAdmissionModalOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-6">Patient Admission</h3>
            <form onSubmit={handleAdmission} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Patient Name</label>
                <input 
                  required
                  type="text" 
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Age</label>
                  <input 
                    required
                    type="number" 
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                  <select 
                    value={newPatient.status}
                    onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsAdmissionModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Admit Patient</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">{hospital?.name}</h1>
        <p className="text-slate-500">Resource Management & Patient Status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ResourceCard title="Available Beds" value={hospital?.beds} icon={Bed} onUpdate={(v) => updateResource('beds', v)} color="text-blue-600" />
        <ResourceCard title="ICU Availability" value={hospital?.icu} icon={Activity} onUpdate={(v) => updateResource('icu', v)} color="text-red-600" />
        <ResourceCard title="Oxygen Cylinders" value={hospital?.oxygen} icon={Wind} onUpdate={(v) => updateResource('oxygen', v)} color="text-cyan-600" />
        <ResourceCard title="Blood Units" value={Object.values(hospital?.blood || {}).reduce((a: any, b: any) => a + b, 0)} icon={Droplet} color="text-rose-600" />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold">Active Patient Records</h3>
          <button 
            onClick={() => setIsAdmissionModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Admission
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-50">
                <th className="pb-4 font-medium">Patient Name</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Last Update</th>
                <th className="pb-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patients.map((p) => (
                <tr key={p.id} className="group">
                  <td className="py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      p.status === 'Critical' ? 'bg-red-50 text-red-600' : 
                      p.status === 'Moderate' ? 'bg-orange-50 text-orange-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-500">{new Date(p.lastUpdate).toLocaleString()}</td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">No active patients</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ResourceCard = ({ title, value, icon: Icon, onUpdate, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      {onUpdate && (
        <div className="flex gap-1">
          <button onClick={() => onUpdate(value - 1)} className="p-1 hover:bg-slate-100 rounded">-</button>
          <button onClick={() => onUpdate(value + 1)} className="p-1 hover:bg-slate-100 rounded">+</button>
        </div>
      )}
    </div>
    <p className="text-sm text-slate-500 font-medium">{title}</p>
    <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
  </div>
);

const PatientDashboard = () => {
  const { profile } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState("normal");
  const [budget, setBudget] = useState("5000");
  const [userLocation, setUserLocation] = useState("");
  const [aiExplanation, setAiExplanation] = useState("");

  useEffect(() => {
    const fetchHospitals = async () => {
      const snap = await getDocs(collection(db, "hospitals"));
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchHospitals();
  }, []);

  const getRecommendations = async () => {
    if (!userLocation) {
      alert("Please enter your location first");
      return;
    }
    setLoading(true);
    setAiExplanation("");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a medical assistant, recommend the best and SHORTEST (closest) hospital from this list for a patient.
        
        Patient Details:
        - Current Location: ${userLocation}
        - Medical Condition: ${condition}
        - Budget: $${budget}
        
        Available Hospitals: ${JSON.stringify(hospitals.map(h => ({ id: h.id, name: h.name, location: h.location, area: h.area, beds: h.beds, icu: h.icu, facilities: h.facilities })))}
        
        Prioritize:
        1. Proximity to ${userLocation} (compare areas and locations).
        2. Availability of required facilities for ${condition} (e.g., ICU for critical).
        3. Budget fit.
        
        Return a JSON object with:
        1. "recommendedIds": array of hospital IDs in order of preference (best/closest first).
        2. "explanation": a brief explanation of why these were chosen, mentioning proximity and facility fit.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              explanation: { type: Type.STRING }
            },
            required: ["recommendedIds", "explanation"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      const sorted = (result.recommendedIds || []).map((id: string) => hospitals.find(h => h.id === id)).filter(Boolean);
      setRecommendations(sorted);
      setAiExplanation(result.explanation || "");
    } catch (err) {
      console.error(err);
      alert("AI recommendation failed. Showing all nearby hospitals.");
      setRecommendations(hospitals);
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
      }, () => {
        alert("Unable to retrieve your location");
      });
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const triggerSOS = async () => {
    if (!profile?.familyEmail) return alert("Please add family contact details in profile");
    
    try {
      await axios.post("/api/notify", {
        to: profile.familyEmail,
        subject: "EMERGENCY ALERT: " + profile.name,
        text: `SOS Triggered by ${profile.name}. Current location: GPS Data. Please check immediately.`
      });
      alert("SOS Alert Sent to Family!");
    } catch (err) {
      alert("Failed to send SOS");
    }
  };

  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean, hospitalId: string, hospitalName: string }>({ isOpen: false, hospitalId: "", hospitalName: "" });
  const [reviewData, setReviewData] = useState({ rating: 5, comment: "" });

  const submitReview = async () => {
    if (!reviewData.comment) return;
    try {
      await addDoc(collection(db, "reviews"), {
        patientId: profile.uid,
        patientName: profile.name,
        hospitalId: reviewModal.hospitalId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        timestamp: new Date().toISOString()
      });
      setReviewModal({ isOpen: false, hospitalId: "", hospitalName: "" });
      setReviewData({ rating: 5, comment: "" });
    } catch (err) {
      console.error("Review failed:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReviewModal({ ...reviewModal, isOpen: false })} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
            <h3 className="text-xl font-bold mb-2">Review {reviewModal.hospitalName}</h3>
            <p className="text-slate-500 text-sm mb-6">Share your experience with others</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button 
                      key={r} 
                      onClick={() => setReviewData({ ...reviewData, rating: r })}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${reviewData.rating >= r ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      <Star className={`w-5 h-5 ${reviewData.rating >= r ? "fill-white" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Comment</label>
                <textarea 
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                  placeholder="Tell us about the service..."
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitReview}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {profile?.name}</h1>
          <p className="text-slate-500">Find the best healthcare assistance near you</p>
        </div>
        <button 
          onClick={triggerSOS}
          className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-3 animate-pulse"
        >
          <ShieldAlert className="w-6 h-6" />
          SOS EMERGENCY
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            AI Recommendation
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="Enter city or address"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                />
                <button 
                  onClick={useCurrentLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                  title="Use My Location"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your Condition</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
              >
                <option value="normal">Normal / Checkup</option>
                <option value="moderate">Moderate / Fever</option>
                <option value="critical">Critical / Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Budget Range ($)</label>
              <input 
                type="range" min="500" max="10000" step="500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full accent-slate-900"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1 font-bold">
                <span>$500</span>
                <span>${budget}</span>
                <span>$10,000</span>
              </div>
            </div>
            <button 
              onClick={getRecommendations}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? "AI Analyzing..." : "Find Best Hospitals"}
            </button>

            {aiExplanation && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-indigo-50 rounded-xl border border-indigo-100"
              >
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">AI Insight</p>
                <p className="text-sm text-indigo-900 leading-relaxed italic">"{aiExplanation}"</p>
              </motion.div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Navigation className="w-5 h-5 text-slate-400" />
            {recommendations.length > 0 ? "Recommended Hospitals" : "Nearby Hospitals"}
          </h3>
          <div className="space-y-4">
            {(recommendations.length > 0 ? recommendations : hospitals).map((h, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={h.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-slate-300 transition-all"
              >
                <div className="flex gap-6 items-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <HospitalIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{h.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {h.location}</span>
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 text-orange-400 fill-orange-400" /> {h.rating || 4.5}</span>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">Beds: {h.beds}</span>
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider">ICU: {h.icu}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                    Book Now
                  </button>
                  <button 
                    onClick={() => setReviewModal({ isOpen: true, hospitalId: h.id, hospitalName: h.name })}
                    className="text-slate-400 hover:text-slate-900 text-[10px] font-bold uppercase tracking-wider text-center"
                  >
                    Write Review
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
