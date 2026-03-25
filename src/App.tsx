import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, limit, orderBy } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { UserProfile } from "./types";
import { LogOut, LayoutDashboard, Hospital, Users, UserCog, ClipboardList, Bell, ShieldAlert, Search, Menu, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAuthReady: false,
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = "pujakonidela23@gmail.com";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const path = `users/${user.uid}`;
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else if (user.email === ADMIN_EMAIL) {
            const adminProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || "Admin",
              email: user.email!,
              role: "admin",
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(docRef, adminProfile);
              setProfile(adminProfile);
            } catch (err) {
              console.error("Failed to bootstrap admin profile:", err);
              // Still set profile locally so app works
              setProfile(adminProfile);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Don't throw here to avoid breaking the auth state
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL || profile?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Components ---

const Sidebar = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["admin", "worker", "patient"] },
    { name: "Hospitals", icon: Hospital, path: "/hospitals", roles: ["admin", "patient"] },
    { name: "Doctors", icon: UserCog, path: "/doctors", roles: ["admin", "patient"] },
    { name: "Workers", icon: Users, path: "/workers", roles: ["admin"] },
    { name: "Patient Records", icon: ClipboardList, path: "/records", roles: ["admin", "worker", "patient"] },
    { name: "Appointments", icon: Calendar, path: "/appointments", roles: ["admin", "worker", "patient"] },
  ];

  const filteredItems = menuItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <ShieldAlert className="text-red-500 w-8 h-8" />
        <span className="font-bold text-lg leading-tight">SmartHealth</span>
      </div>
      <div className="flex-1 py-6">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800 transition-colors"
          >
            <item.icon className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
            {profile?.name?.[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold truncate w-32">{profile?.name}</span>
            <span className="text-xs text-slate-500 capitalize">{profile?.role}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

// ... inside Layout component ...
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "notifications"),
      where("role", "==", profile.role),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Sidebar />
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-slate-400 lg:hidden" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 transition-all w-64"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-slate-50 rounded-xl transition-colors group"
            >
              <Bell className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 z-50">
                <div className="px-6 pb-4 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Notifications</h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold text-slate-500 uppercase tracking-widest">Recent</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div key={n.id} className="px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                      <p className="text-sm text-slate-900 font-medium leading-snug">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                  )) : (
                    <div className="px-6 py-8 text-center">
                      <Bell className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none mb-1">System Status</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">All Systems Operational</p>
            </div>
          </div>
        </div>
      </header>
      <main className="p-8">{children}</main>
    </div>
  );
};

// --- Pages ---
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HospitalManagement from "./pages/HospitalManagement";
import DoctorManagement from "./pages/DoctorManagement";
import WorkerManagement from "./pages/WorkerManagement";
import PatientRecords from "./pages/PatientRecords";
import Appointments from "./pages/Appointments";

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (isAdmin) return <Layout>{children}</Layout>;
  
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/hospitals" element={<ProtectedRoute roles={["admin", "patient"]}><HospitalManagement /></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute roles={["admin", "patient"]}><DoctorManagement /></ProtectedRoute>} />
          <Route path="/workers" element={<ProtectedRoute roles={["admin"]}><WorkerManagement /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><PatientRecords /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
