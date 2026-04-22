import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/api/authService';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = location.state?.email || '';

  const [formData, setFormData] = useState({
    email: initialEmail,
    code: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateResetForm = () => {
    const { email, code, newPassword, confirmPassword } = formData;
    
    if (!email) return "Email is required.";
    if (code.length !== 6) return "Please enter the 6-digit verification code.";
    
    // Strict Password Validation: Min 8 chars, 1 upper, 1 lower, 1 number, 1 special
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
    }
    
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    
    return null;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const validationError = validateResetForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(formData.email, formData.code, formData.newPassword);
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2500);
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : "Reset failed. Please check the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendCode = async () => {
    if (!formData.email || resendLoading || resendCooldown > 0) return;
    setError('');
    setSuccessMsg('');
    setResendLoading(true);
    try {
      const message = await authService.resendResetCode(formData.email);
      setSuccessMsg(typeof message === 'string' ? message : 'A new reset code has been sent.');
      setResendCooldown(30);
    } catch (err) {
      setError(typeof err.response?.data === 'string' ? err.response.data : "Could not resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex bg-gradient-to-br from-zinc-50 via-violet-50/90 to-fuchsia-100/80 font-sans text-zinc-800 antialiased dark:from-zinc-950 dark:via-violet-950/30 dark:to-zinc-950 dark:text-zinc-100">
      
      {/* Left Pane - Branding & Welcome */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-20 relative overflow-hidden bg-violet-600 dark:bg-violet-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-8">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Secure your account</h1>
          <p className="text-violet-200 text-lg leading-relaxed">
            Enter the code we sent to your email and choose a strong new password to regain access to your hub.
          </p>
        </div>
      </div>

      {/* Right Pane - Form Container */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8 relative backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl border border-violet-200/90 bg-white/85 p-8 shadow-2xl shadow-violet-500/[0.12] backdrop-blur-md dark:border-violet-500/25 dark:bg-zinc-900/75 dark:shadow-violet-900/20">
          
          <div className="lg:hidden flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-inner mb-6 mx-auto">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Almost there! Just one more step.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium rounded-xl dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleReset}>
            {!location.state?.email && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  placeholder="you@university.edu"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                6-Digit Code
              </label>
              <input
                name="code"
                type="text"
                maxLength="6"
                required
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.replace(/\D/g, '')})}
                className="block w-full text-center tracking-[0.5em] text-xl font-bold rounded-xl border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-300 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                placeholder="000000"
              />
            </div>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={!formData.email || isLoading || resendLoading || resendCooldown > 0}
              className="flex w-full justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/60"
            >
              {resendLoading
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
            </button>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    placeholder="••••••••"
                  />
                  {formData.newPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    placeholder="••••••••"
                  />
                  {formData.confirmPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/30 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-70 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <Link to="/" className="font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400">
              Cancel and go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
