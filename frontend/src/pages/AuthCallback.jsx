import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Parse the URL parameters
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (status === '2FA_REQUIRED' && userId) {
      navigate('/verify-2fa', {
        replace: true,
        state: { userId, email: email || '' }
      });
      return;
    }

    if (token) {
      // Decode the JWT payload (base64) to read the role claim
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        const role = payload?.role || 'USER';

        login(token);

        // Route based on role
        if (role === 'ADMIN') {
          navigate('/admin/users', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (e) {
        // Fallback if decoding fails
        login(token);
        navigate('/dashboard', { replace: true });
      }
    } else if (error) {
      // Handle authentication error
      setErrorMsg(error);
    } else {
      // No token or error found, invalid callback
      setErrorMsg("Invalid Authentication Callback.");
    }
  }, [location, login, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-950/20">
         <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl border border-red-200 dark:border-red-900/50 text-center">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Failed</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">{errorMsg}</p>
            <button 
              onClick={() => navigate('/')}
              className="text-white bg-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-700"
            >
              Back to Login
            </button>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-zinc-500 dark:text-zinc-400 font-medium">Authenticating your session...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
