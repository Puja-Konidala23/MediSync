import React from "react";
import { X, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "info" | "error" | "success" | "confirm";
  onConfirm?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, message, type = "info", onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  type === "error" ? "bg-red-50 text-red-600" :
                  type === "success" ? "bg-emerald-50 text-emerald-600" :
                  type === "confirm" ? "bg-orange-50 text-orange-600" :
                  "bg-blue-50 text-blue-600"
                }`}>
                  {type === "error" && <AlertCircle className="w-6 h-6" />}
                  {type === "success" && <CheckCircle2 className="w-6 h-6" />}
                  {type === "confirm" && <AlertCircle className="w-6 h-6" />}
                  {type === "info" && <Info className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                {type === "confirm" ? (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { onConfirm?.(); onClose(); }}
                      className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Got it
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
