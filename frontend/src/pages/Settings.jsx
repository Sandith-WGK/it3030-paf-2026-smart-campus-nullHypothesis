import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Sun, Monitor, Bell, Volume2, Mail, 
  Smartphone, ShieldCheck, User as UserIcon,
  Calendar, Wrench, Shield, Megaphone, CheckCircle, Database
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api/userService';

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

const CategoryCard = ({ enabled, onClick, icon: Icon, label, description, color }) => {
  const colorMap = {
    violet: { border: 'border-violet-300 dark:border-violet-700', bg: 'bg-violet-50 dark:bg-violet-900/20', iconBg: 'bg-violet-100 dark:bg-violet-800/40', iconText: 'text-violet-600', toggle: 'bg-violet-500' },
    amber:  { border: 'border-amber-300 dark:border-amber-700',   bg: 'bg-amber-50 dark:bg-amber-900/20',   iconBg: 'bg-amber-100 dark:bg-amber-800/40',  iconText: 'text-amber-600',  toggle: 'bg-amber-400' },
    red:    { border: 'border-red-300 dark:border-red-700',       bg: 'bg-red-50 dark:bg-red-900/20',       iconBg: 'bg-red-100 dark:bg-red-800/40',      iconText: 'text-red-600',    toggle: 'bg-red-500' },
    green:  { border: 'border-green-300 dark:border-green-700',   bg: 'bg-green-50 dark:bg-green-900/20',   iconBg: 'bg-green-100 dark:bg-green-800/40',  iconText: 'text-green-600',  toggle: 'bg-green-500' },
    blue:   { border: 'border-blue-300 dark:border-blue-700',     bg: 'bg-blue-50 dark:bg-blue-900/20',     iconBg: 'bg-blue-100 dark:bg-blue-800/40',    iconText: 'text-blue-600',    toggle: 'bg-blue-500' },
  };
  const c = colorMap[color] || colorMap.violet;
  const offStyle = 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30';
  
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${enabled ? `${c.border} ${c.bg}` : offStyle}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${enabled ? c.iconBg : 'bg-zinc-200 dark:bg-zinc-700'}`}>
          {Icon && <Icon size={18} className={enabled ? c.iconText : 'text-zinc-400'} />}
        </div>
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-zinc-400">{description}</p>
        </div>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${enabled ? c.toggle : 'bg-zinc-300 dark:bg-zinc-600'}`}>
        <div className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-all duration-300 ${enabled ? 'left-[22px]' : 'left-[3px]'}`} />
      </div>
    </div>
  );
};

export default function Settings() {
  const { theme, setTheme, preferences, updatePreferences } = useTheme();
  const { user, updateUser } = useAuth();
  
  const userTouched = React.useRef(false);

  const [localPrefs, setLocalPrefs] = React.useState({
    enableSounds: true,
    enablePushNotifications: true,
    enableEmailNotifications: true
  });

  const [notifPrefs, setNotifPrefs] = React.useState({
    bookings: true, tickets: true, security: true, announcements: true, resources: true
  });

  // Sync delivery preferences from context
  React.useEffect(() => {
    if (userTouched.current) return;
    if (preferences) {
      setLocalPrefs({
        enableSounds: preferences.enableSounds ?? true,
        enablePushNotifications: preferences.enablePushNotifications ?? true,
        enableEmailNotifications: preferences.enableEmailNotifications ?? true
      });
    }
  }, [preferences]);

  // Load notification category preferences from user object (synced globally)
  React.useEffect(() => {
    if (user?.notificationPreferences) {
      setNotifPrefs({
        bookings: user.notificationPreferences.bookings ?? true,
        tickets: user.notificationPreferences.tickets ?? true,
        security: user.notificationPreferences.security ?? true,
        announcements: user.notificationPreferences.announcements ?? true,
        resources: user.notificationPreferences.resources ?? true,
      });
    }
  }, [user]);

  const handleToggleDelivery = (key, value) => {
    userTouched.current = true;
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    updatePreferences({ [key]: value });
  };

  const handleToggleCategory = async (key) => {
    const newVal = !notifPrefs[key];
    const updatedPrefs = { ...notifPrefs, [key]: newVal };
    
    // 1. Update UI immediately
    setNotifPrefs(updatedPrefs);
    
    // 2. Persist to backend
    const userId = user?.userId || user?.sub || user?.id;
    if (!userId) return;
    
    try {
      const updatedUser = await userService.updateNotificationPreferences(userId, updatedPrefs);
      // 3. Sync global Auth state so refresh/navigation works
      updateUser(updatedUser);
    } catch (err) {
      console.error(`Failed to auto-save ${key} preference:`, err);
      // Revert UI on failure
      if (user?.notificationPreferences) {
        setNotifPrefs(user.notificationPreferences);
      }
      alert(`Failed to save ${key} preference. Please try again.`);
    }
  };

  return (
    <Layout title="Settings">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 italic">Preferences &amp; Experience</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Customize how Smart Campus looks and behaves for you.
          </p>
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

        {/* ── Notification Delivery Section ── */}
        <SettingSection 
          title="Notification Delivery" 
          description="Manage how and when you want to be alerted about campus activity."
        >
          <div className="space-y-4">
            <Toggle 
              label="Notification Sounds" 
              description="Play audible alerts for real-time notifications based on type."
              icon={Volume2}
              enabled={localPrefs.enableSounds}
              onChange={(val) => handleToggleDelivery('enableSounds', val)}
            />
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
            <Toggle 
              label="Push Notifications" 
              description="Allow browser push notifications for instant updates."
              icon={Smartphone}
              enabled={localPrefs.enablePushNotifications}
              onChange={(val) => handleToggleDelivery('enablePushNotifications', val)}
            />
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2"></div>
            <Toggle 
              label="Email Notifications" 
              description="Receive critical alerts and updates in your inbox."
              icon={Mail}
              enabled={localPrefs.enableEmailNotifications}
              onChange={(val) => handleToggleDelivery('enableEmailNotifications', val)}
            />
          </div>
        </SettingSection>

        {/* ── Notification Categories Section ── */}
        <SettingSection 
          title="Notification Categories" 
          description="Choose which types of notifications you want to receive. Changes save automatically."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CategoryCard 
              enabled={notifPrefs.bookings} 
              onClick={() => handleToggleCategory('bookings')} 
              icon={Calendar} 
              label="Booking Updates" 
              description="Confirmations, approvals & rejections" 
              color="violet" 
            />
            <CategoryCard 
              enabled={notifPrefs.tickets} 
              onClick={() => handleToggleCategory('tickets')} 
              icon={Wrench} 
              label="Ticket Updates" 
              description="Maintenance ticket status changes" 
              color="amber" 
            />
            <CategoryCard 
              enabled={notifPrefs.security} 
              onClick={() => handleToggleCategory('security')} 
              icon={Shield} 
              label="Security Alerts" 
              description="Login & password change alerts" 
              color="red" 
            />

            <CategoryCard 
              enabled={notifPrefs.resources} 
              onClick={() => handleToggleCategory('resources')} 
              icon={Database} 
              label="Resource Updates" 
              description="New rooms, labs & equipment alerts" 
              color="blue" 
            />
          </div>
        </SettingSection>

        {/* ── Security & Account ── */}
        <SettingSection 
          title="Account & Security" 
          description="Manage your identity and authentication settings."
        >
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm">
              <img 
                src={user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                alt="user" 
                referrerPolicy="no-referrer"
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
      </motion.div>
    </Layout>
  );
}
