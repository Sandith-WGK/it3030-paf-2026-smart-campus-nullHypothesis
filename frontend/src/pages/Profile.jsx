import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, CheckCircle, Mail, User as UserIcon, Lock, ShieldCheck, AlertCircle, Save, Eye, EyeOff,
  History, Smartphone, Monitor, Tablet, Globe, Clock, Shield
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
  const [activeTab, setActiveTab] = useState('general');
  const [activities, setActivities] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'UNDERGRADUATE_STUDENT',
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
        role: user.role || 'UNDERGRADUATE_STUDENT',
        picture: user.picture || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchActivity = async () => {
      // Priority: check all possible ID fields to ensure we don't send undefined
      const targetId = user?.id || user?.userId || user?.sub || user?._id;
      
      if (targetId && activeTab === 'security') {
        try {
          const data = await userService.getUserActivity(targetId);
          setActivities(data);
        } catch (err) {
          console.error("Failed to fetch activity:", err);
        }
      }
    };
    fetchActivity();
  }, [user, activeTab]);

  useEffect(() => {
    const pw = formData.password;
    setPasswordCriteria({
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    });
  }, [formData.password]);

  const isPasswordStrong = !isLocalUser || !formData.password || (
    passwordCriteria.minLength && 
    passwordCriteria.hasUpper && 
    passwordCriteria.hasNumber && 
    passwordCriteria.hasSpecial
  );

  const passwordsMatch = formData.password === formData.confirmPassword;
  const isSubmitDisabled = loading || !isPasswordStrong || !passwordsMatch || !canEditNameAndPicture;

  const getActivityIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone size={16} />;
      case 'tablet': return <Tablet size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return 'Standard Login';
      case 'LOGIN_SUCCESS_2FA': return 'Secure Login (2FA)';
      case 'LOGIN_SUCCESS_SOCIAL': return 'Google Login';
      case 'SECURITY_UPDATE': return 'Password/Security Update';
      default: return action.replace(/_/g, ' ');
    }
  };

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



  return (
    <Layout>
      <div className="py-6 transition-colors duration-300">

      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Account Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your identity and security preferences.</p>
        </header>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-8 p-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl w-fit border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
          <button 
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white dark:bg-zinc-800 text-violet-600 shadow-md ring-1 ring-zinc-200/50 dark:ring-zinc-700/50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            <UserIcon size={16} />
            General Information
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white dark:bg-zinc-800 text-violet-600 shadow-md ring-1 ring-zinc-200/50 dark:ring-zinc-700/50' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
          >
            <Shield size={16} />
            Security & Activity
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'general' ? (
            <motion.form 
              key="general"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit} 
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
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
                      {isGoogleUser ? (
                        <>
                          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          <span>Google Account</span>
                        </>
                      ) : (
                        <>
                          <Mail size={18} className="text-violet-500" />
                          <span>Email & Password</span>
                        </>
                      )}
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
                    </div>
                  </div>
                </div>

                {/* Password Section */}
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
                      <div className="bg-gradient-to-r from-violet-50/70 to-fuchsia-50/60 dark:from-violet-900/10 dark:to-fuchsia-900/10 p-6 rounded-2xl grid grid-cols-2 lg:grid-cols-4 gap-4 border border-violet-100/50 dark:border-violet-900/20 mb-6 transition-all">
                        <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${passwordCriteria.minLength ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                          <CheckCircle size={14} className={passwordCriteria.minLength ? 'opacity-100' : 'opacity-20'} /> 8+ Characters
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${passwordCriteria.hasUpper ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                          <CheckCircle size={14} className={passwordCriteria.hasUpper ? 'opacity-100' : 'opacity-20'} /> One Uppercase
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${passwordCriteria.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                          <CheckCircle size={14} className={passwordCriteria.hasNumber ? 'opacity-100' : 'opacity-20'} /> One Number
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${passwordCriteria.hasSpecial ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                          <CheckCircle size={14} className={passwordCriteria.hasSpecial ? 'opacity-100' : 'opacity-20'} /> Special Char
                        </div>
                      </div>
                    )}

                    {/* Match Warning */}
                    {formData.password && formData.confirmPassword && !passwordsMatch && (
                      <div className="flex items-center gap-2 text-red-500 font-bold text-xs px-2 mb-6 animate-pulse">
                        <AlertCircle size={14} /> Passwords do not match
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
                    disabled={isSubmitDisabled}
                    className="ml-auto flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-600/30 transition-all active:scale-95"
                  >
                    {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                  </button>
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.div 
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-violet-100 dark:border-violet-900/30">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
                      <History size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl tracking-tight">Recent Security Activity</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Review your most recent login events and account modifications.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity, idx) => (
                      <div 
                        key={activity.id || idx} 
                        className="flex items-center justify-between p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 hover:border-violet-200 dark:hover:border-violet-900/30 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all group"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-xl ${activity.action.includes('SUCCESS') ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'}`}>
                            {getActivityIcon(activity.deviceType)}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                              {getActionLabel(activity.action)}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 font-medium">
                              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(activity.timestamp).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Globe size={12} /> {activity.ipAddress}</span>
                            </div>
                          </div>
                        </div>
                        <div className="hidden md:block px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-200/50 dark:border-zinc-700/30">
                          {activity.deviceType || 'Unknown'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 opacity-50">
                      <div className="p-5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full mb-4">
                        <Lock size={40} className="text-zinc-300" />
                      </div>
                      <p className="text-zinc-400 font-medium tracking-tight">No recent security activity found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Tips Banner */}
              <div className="bg-gradient-to-r from-violet-600/10 to-indigo-600/10 dark:from-violet-600/5 dark:to-indigo-600/5 p-8 rounded-3xl border border-violet-200/50 dark:border-violet-900/30 flex items-start gap-5">
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm text-violet-600">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Secure your account</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    If you see a login event that you don't recognize, please change your password immediately and contact campus security. We recommend reviewing this list at least once a month.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </Layout>
);
};

export default Profile;
