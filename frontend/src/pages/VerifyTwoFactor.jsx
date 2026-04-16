import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/api/authService';
import { useAuth } from '../context/AuthContext';

const VerifyTwoFactor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const userId = location.state?.userId || '';
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!userId) {
      setError('2FA session is missing. Please log in again.');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyTwoFactor(userId, otp);
      login(data.token);

      if (data.role === 'ADMIN') {
        navigate('/admin/users', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const payload = err.response?.data;
      const message =
        (typeof payload === 'string' && payload) ||
        payload?.message ||
        payload?.error ||
        '2FA verification failed. Please try again.';
      setError(message);
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

  const handleResendOtp = async () => {
    if (!userId || resendLoading || resendCooldown > 0) return;
    setError('');
    setSuccessMsg('');
    setResendLoading(true);
    try {
      const message = await authService.resendTwoFactor(userId);
      setSuccessMsg(typeof message === 'string' ? message : 'A new 2FA code has been sent.');
      setResendCooldown(30);
    } catch (err) {
      const payload = err.response?.data;
      const message =
        (typeof payload === 'string' && payload) ||
        payload?.message ||
        payload?.error ||
        'Failed to resend 2FA code. Please try again.';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex bg-gradient-to-br from-zinc-50 via-violet-50/90 to-fuchsia-100/80 font-sans text-zinc-800 antialiased dark:from-zinc-950 dark:via-violet-950/30 dark:to-zinc-950 dark:text-zinc-100">
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-20 relative overflow-hidden bg-violet-600 dark:bg-violet-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-8">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Two-Factor Verification</h1>
          <p className="text-violet-200 text-lg leading-relaxed">
            Enter the one-time code sent to your email to complete secure access.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8 relative backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl border border-violet-200/90 bg-white/85 p-10 shadow-2xl shadow-violet-500/[0.12] backdrop-blur-md dark:border-violet-500/25 dark:bg-zinc-900/75 dark:shadow-violet-900/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Verify sign in
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              We sent a 6-digit code to {email || 'your email'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-xl dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleVerify2FA}>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1" htmlFor="otp">
                6-Digit OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                maxLength="6"
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-center tracking-[0.4em] text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-600/30 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-70 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              {isLoading ? 'Verifying...' : 'Verify & Sign in'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!userId || isLoading || resendLoading || resendCooldown > 0}
              className="flex w-full justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/60"
            >
              {resendLoading
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend OTP in ${resendCooldown}s`
                  : 'Resend OTP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyTwoFactor;

