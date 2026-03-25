import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { ShieldAlert, Mail, User, Hospital, Phone, Lock, UserPlus, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { UserRole } from "../types";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [hospitalName, setHospitalName] = useState("");
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Prevent unauthorized admin registration
      if (role === "admin" && email !== "pujakonidela23@gmail.com") {
        setError("Only authorized administrators can register with the 'Admin' role.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profileData: any = {
        uid: user.uid,
        name,
        email: user.email,
        role,
        createdAt: new Date().toISOString(),
      };

      if (role === "worker") {
        profileData.hospitalName = hospitalName;
        profileData.hospitalId = "pending";
      } else if (role === "patient") {
        profileData.familyEmail = familyEmail;
        profileData.familyPhone = familyPhone;
      }

      await setDoc(doc(db, "users", user.uid), profileData);
      navigate("/");
    } catch (err: any) {
      console.error("Registration Error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password registration is not enabled in Firebase Console. Please enable it.");
      } else {
        setError(err.message || "Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-center border-b border-slate-800">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="text-red-500 w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join SmartHealth</h1>
          <p className="text-slate-400 text-sm mt-2">Complete your profile to get started</p>
        </div>
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 appearance-none font-medium"
                >
                  <option value="patient">Patient</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {role === "worker" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hospital Name</label>
                <div className="relative">
                  <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="City General Hospital"
                  />
                </div>
              </motion.div>
            )}

            {role === "patient" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Family Contact Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      required
                      value={familyEmail}
                      onChange={(e) => setFamilyEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="family@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Family Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="tel"
                      required
                      value={familyPhone}
                      onChange={(e) => setFamilyPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-slate-900 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
