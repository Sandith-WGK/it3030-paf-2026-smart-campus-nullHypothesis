import React from 'react';
import * as motion from 'framer-motion';
import { 
  Moon, Sun, Monitor, Bell, Volume2, Mail, 
  Smartphone, ShieldCheck, User as UserIcon, Save
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SettingSection = ({ title, description, children }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-6">
    <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const Toggle = ({ enabled, onChange, label, icon: Icon, description }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-4">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
          <Icon size={20} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
        enabled ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export default function Settings() {
  const { theme, setTheme, preferences, updatePreferences } = useTheme();
  const { user } = useAuth();

  const handleSave = () => {
    toast.success('Settings saved and synchronized', {
       icon: '✨',
       style: { borderRadius: '12px', background: '#18181b', color: '#fff' }
    });
  };

  return (
    <Layout title="Settings">
      <motion.motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 italic">Preferences & Experience</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Customize how Smart Campus looks and behaves for you.
            </p>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>

        {/* ── Appearance Section ── */}
        <SettingSection 
          title="Appearance" 
          description="Choose your preferred theme or sync with your system settings."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'LIGHT', label: 'Light Mode', icon: Sun },
              { id: 'DARK', label: 'Dark Mode', icon: Moon },
              { id: 'SYSTEM', label: 'System Sync', icon: Monitor },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                  theme === item.id 
                    ? 'border-violet-600 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' 
                    : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700'
                }`}
              >
                <item.icon size={24} />
                <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>
        </SettingSection>

        {/* ── Notifications Section ── */}
        <SettingSection 
          title="Notifications" 
          description="Manage how and when you want to be alerted about campus activity."
        >
          <div className="space-y-4">
            <Toggle 
              label="Notification Sounds" 
              description="Play audible alerts for real-time notifications based on type."
              icon={Volume2}
              enabled={preferences.enableSounds}
              onChange={(val) => updatePreferences({ enableSounds: val })}
            />
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
            <Toggle 
              label="Email Notifications" 
              description="Receive daily summaries and critical alerts via email."
              icon={Mail}
              enabled={preferences.enableEmailNotifications}
              onChange={(val) => updatePreferences({ enableEmailNotifications: val })}
            />
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
            <Toggle 
              label="Push Notifications" 
              description="Allow browser push notifications for instant updates."
              icon={Smartphone}
              enabled={preferences.enablePushNotifications}
              onChange={(val) => updatePreferences({ enablePushNotifications: val })}
            />
          </div>
        </SettingSection>

        {/* ── Security & Account Placeholder ── */}
        <SettingSection 
          title="Account & Security" 
          description="Manage your identity and authentication settings."
        >
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm">
              <img 
                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                alt="user" 
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
              <ShieldCheck size={12} />
              {user?.role}
            </div>
          </div>
        </SettingSection>

        <div className="text-center pb-12">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Smart Campus Operations Hub v0.4.2</p>
        </div>
      </motion.motion.div>
    </Layout>
  );
}
