import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, CheckCircle, Mail, User as UserIcon, Lock, ShieldCheck, AlertCircle, Save, Eye, EyeOff
} from 'lucide-react';
import { userService } from '../services/api/userService';
import Layout from '../components/layout/Layout';

const Profile = () => {
  const { user, login, updateUserLocal } = useAuth();
  const navigate = useNavigate();
  const provider = (user?.provider || '').toUpperCase();
  const isLocalUser = provider === 'LOCAL';
  const isGoogleUser = provider === 'GOOGLE';
  const canEditNameAndPicture = isLocalUser || isGoogleUser;
  const _CanEditRole = false;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER',
    password: '',
    confirmPassword: '',
    picture: ''
  });

  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'USER',
        picture: user.picture || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const pw = formData.password;
    setPasswordCriteria({
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    });
  }, [formData.password]);

  const handleImageUpload = (e) => {
    if (!canEditNameAndPicture) {
      alert("Profile image updates are not available for this account.");
      return;
    }

    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image is too large. Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, picture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canEditNameAndPicture) {
      alert("Profile editing is not available for this account.");
      return;
    }
    
    if (formData.password && (!passwordCriteria.minLength || !passwordCriteria.hasUpper || !passwordCriteria.hasNumber || !passwordCriteria.hasSpecial)) {
      alert("Please ensure your new password meets all security requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      const updatePayload = {
        name: formData.name,
        picture: formData.picture,
      };
      
      if (isLocalUser) {
        updatePayload.email = formData.email;
      }

      if (isLocalUser && formData.password) {
        updatePayload.password = formData.password;
      }

      // The backend now returns { token, user } on update
      const targetId = user?.id || user?.userId || user?.sub;
      const { user: updatedUser, token: newToken } = await userService.updateUser(targetId, updatePayload);
      
      // If email was changed, user is now disabled and needs re-verification
      // Comparison is case-insensitive and ensures user.email exists to avoid false-positives
      const isEmailChanged = isLocalUser && user.email && formData.email.toLowerCase() !== user.email.toLowerCase();
      
      if (isEmailChanged) {
        console.log("Email change detected. Redirecting to verification...");
        navigate(`/verify-email?email=${encodeURIComponent(formData.email.toLowerCase())}`);
        return;
      }

      // Sync the new token into our session so changes persist on refresh
      if (newToken) {
        // Pass updated user data so large fields (like base64 picture) aren't lost
        // because the backend intentionally omits huge images from the JWT.
        login(newToken, updatedUser);
      } else {
        // Fallback for immediate UI reflection if token wasn't provided
        updateUserLocal({
          name: formData.name,
          role: formData.role,
          picture: formData.picture,
          email: formData.email
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      console.error('Profile update failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to update profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordStrong = !isLocalUser || !formData.password || (
    passwordCriteria.minLength && 
    passwordCriteria.hasUpper && 
    passwordCriteria.hasNumber && 
    passwordCriteria.hasSpecial
  );


  return (
    <Layout>
      <div className="py-6 transition-colors duration-300">

      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Account Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your identity and security preferences.</p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-violet-100 dark:border-violet-900/30 flex flex-col items-center">
              <div className="relative group mb-6">
                <img 
                  src={formData.picture || `https://ui-avatars.com/api/?name=${formData.name}&background=random`} 
                  alt="Profile" 
                  referrerPolicy="no-referrer"
                  className="w-32 h-32 rounded-full object-cover border-4 border-violet-100 dark:border-violet-900/30 shadow-2xl group-hover:scale-105 transition-transform duration-500 ring-4 ring-violet-100/70 dark:ring-violet-900/30"
                />
                {canEditNameAndPicture && (
                  <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all bg-black/40 rounded-full backdrop-blur-[2px]">
                    <Camera className="text-white" size={28} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{formData.name || 'Your Name'}</h2>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm mb-6">{formData.email}</p>
              
              <div className="w-full pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <ShieldCheck size={18} className="text-violet-500" />
                  <span>Role: <span className="text-violet-600 dark:text-violet-400">{user?.role}</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <Mail size={18} className="text-violet-500" />
                  <span>Standard Auth</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Password */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Section */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-violet-100 dark:border-violet-900/30">
              <div className="flex items-center gap-2 mb-6">
                <UserIcon className="text-violet-600" size={20} />
                <h3 className="font-bold text-lg">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    disabled={!canEditNameAndPicture}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-300 dark:focus:border-violet-700 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isGoogleUser && (
                    <p className="text-[10px] text-violet-500 font-medium mt-2 px-1 flex items-center gap-1">
                      <ShieldCheck size={10} /> Google account: name and photo are editable
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled={!isLocalUser}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-300 dark:focus:border-violet-700 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isLocalUser ? (
                    <p className="text-[10px] text-zinc-400 mt-2 px-1 italic">※ Changing email requires re-verification.</p>
                  ) : isGoogleUser ? (
                    <p className="text-[10px] text-violet-500 font-medium mt-2 px-1 flex items-center gap-1">
                      <ShieldCheck size={10} /> Managed by Google account (email is locked)
                    </p>
                  ) : null}
                </div>
              </div>
              {isGoogleUser && (
                <div className="mt-4">
                  <p className="text-[11px] text-zinc-500 px-1">
                    Google users can update full name and profile picture only.
                  </p>
                </div>
              )}
            </div>

            {/* Password Section - Only for LOCAL users */}
            {isLocalUser && (
              <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="text-violet-600" size={20} />
                  <h3 className="font-bold text-lg">Update Password</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">New Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full p-3.5 pr-11 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-300 dark:focus:border-violet-700 outline-none transition-all"
                      />
                      {formData.password?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-violet-500 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                      placeholder="Verify new password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full p-3.5 pr-11 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-300 dark:focus:border-violet-700 outline-none transition-all"
                      />
                      {formData.confirmPassword?.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-violet-500 transition-colors"
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicators */}
                {formData.password && (
                  <div className="bg-gradient-to-r from-violet-50/70 to-fuchsia-50/60 dark:from-violet-900/20 dark:to-fuchsia-900/10 p-6 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 border border-violet-100 dark:border-violet-900/20">
                    <div className={`flex items-center gap-2 text-xs font-bold ${passwordCriteria.minLength ? 'text-green-600' : 'text-zinc-400'}`}>
                      <CheckCircle size={14} className={passwordCriteria.minLength ? 'opacity-100' : 'opacity-20'} /> 8+ Characters
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-bold ${passwordCriteria.hasUpper ? 'text-green-600' : 'text-zinc-400'}`}>
                      <CheckCircle size={14} className={passwordCriteria.hasUpper ? 'opacity-100' : 'opacity-20'} /> One Uppercase
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-bold ${passwordCriteria.hasNumber ? 'text-green-600' : 'text-zinc-400'}`}>
                      <CheckCircle size={14} className={passwordCriteria.hasNumber ? 'opacity-100' : 'opacity-20'} /> One Number
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-bold ${passwordCriteria.hasSpecial ? 'text-green-600' : 'text-zinc-400'}`}>
                      <CheckCircle size={14} className={passwordCriteria.hasSpecial ? 'opacity-100' : 'opacity-20'} /> Special Character
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
               <AnimatePresence>
                {success && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-bold flex items-center gap-2">
                    <CheckCircle size={18} /> Profile updated successfully!
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                type="submit" 
                disabled={loading || !isPasswordStrong || !canEditNameAndPicture}
                className="ml-auto flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/30 active:scale-95 transition-all"
              >
                {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </Layout>
);
};

export default Profile;
