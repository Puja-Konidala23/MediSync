import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ShieldAlert, Mail, Lock, LogIn, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { UserRole } from "../types";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify role matches Firestore data
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.role !== role) {
          setError(`This account is registered as a ${userData.role}. Please select the correct role.`);
          setLoading(false);
          return;
        }
      } else if (email === "pujakonidela23@gmail.com" && role === "admin") {
        // Allow admin to bypass if profile doesn't exist yet (bootstrap)
        navigate("/");
        return;
      } else {
        setError("Account profile not found. Please register first.");
        setLoading(false);
        return;
      }

      navigate("/");
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please register.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password login is not enabled in Firebase Console. Please enable it.");
      } else {
        setError(err.message || "Failed to login. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-center border-b border-slate-800">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="text-red-500 w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white">SmartHealth</h1>
          <p className="text-slate-400 text-sm mt-2">Emergency Assistance Platform</p>
        </div>
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
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

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  placeholder="name@example.com"
                />
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-slate-900 font-bold hover:underline">
              Register Now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
