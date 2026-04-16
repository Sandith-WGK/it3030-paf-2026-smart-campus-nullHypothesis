import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api/authService';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, ArrowLeft, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const { logout } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoggedOut = React.useRef(false);

  useEffect(() => {
    // Aggressively clear session on entry to avoid PrivateRoute collisions
    if (!hasLoggedOut.current) {
      console.log("Cleaning up session for verification landing...");
      logout();
      hasLoggedOut.current = true;
    }
    
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError("No email address provided. Please check your link.");
    }
  }, [location, logout]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`Attempting verification for: ${email}`);
      await authService.verifyEmail(email, code);
      console.log("Verification successful!");
      
      setSuccess(true);
      
      // Fast redirect with a secondary manual option
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (err) {
      console.error("Verification error:", err);
      const msg = err.response?.data?.message || 
                  (typeof err.response?.data === 'string' ? err.response.data : null) || 
                  "Verification failed. Please check your connection and the code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setError('');
    try {
      await authService.resendVerification(email);
      setResendCooldown(30);
    } catch (err) {
      const msg = err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        "Failed to resend code. Please try again.";
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-10 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-violet-600"></div>

        <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-8">
          {success ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
              <CheckCircle className="text-emerald-500" size={32} />
            </motion.div>
          ) : (
            <ShieldCheck className="text-violet-600" size={32} />
          )}
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Identity Verified!</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
                  Your email has been successfully authenticated. <br />
                  <span className="font-medium text-violet-600">Redirecting to login in 2 seconds...</span>
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  onClick={() => navigate('/', { replace: true })}
                  className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-500 transition-colors"
                >
                  Click here if not redirected <ExternalLink size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Email Verification</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Enter the 6-digit code sent to:<br />
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{email || 'your inbox'}</span>
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl border border-red-100 dark:border-red-900/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Verification Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.6em] text-4xl font-black rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-6 text-zinc-900 dark:text-white focus:border-violet-600 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all shadow-inner"
                    placeholder="000000"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6 || !email}
                  className="w-full py-4 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={20} /> Authenticating...</>
                  ) : (
                    'Confirm Identity'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!email || loading || resendLoading || resendCooldown > 0}
                  className="w-full py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <><Loader2 className="animate-spin" size={18} /> Sending...</>
                  ) : resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    'Resend code'
                  )}
                </button>

                <Link 
                  to="/" 
                  className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
