import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function OAuth2RedirectHandler() {
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');

        if (token) {
            localStorage.setItem('jwt_token', token);
            navigate('/dashboard', { replace: true });
        } else {
            const errorParam = queryParams.get('error');
            if (errorParam) {
                setError(errorParam);
            } else {
                setError('Login failed. No token mechanism provided.');
            }
            
            setTimeout(() => {
                 navigate('/login', { replace: true });
            }, 3000);
        }
    }, [location, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center space-y-4">
               {error ? (
                   <div className="bg-red-500/20 text-red-400 p-4 rounded-xl border border-red-500/30">
                       <p className="font-semibold">Authentication Error</p>
                       <p className="text-sm">{error}</p>
                       <p className="text-xs pt-2">Redirecting back...</p>
                   </div>
               ) : (
                   <div className="space-y-4 flex flex-col items-center">
                       <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                       <h2 className="text-xl font-medium text-slate-300 animate-pulse">Authenticating with Smart Campus...</h2>
                   </div>
               )}
            </div>
        </div>
    );
}
