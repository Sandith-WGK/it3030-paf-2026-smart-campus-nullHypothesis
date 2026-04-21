import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/api/userService';
import { useAuth } from '../context/AuthContext';

import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { 
  Moon, Sun, Search, FileDown, Plus, Edit2, Trash2, X, Brain, CheckCircle, Camera, Lock, AlertCircle,
  Eye, EyeOff, Shield, KeyRound, Sparkles, Users
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { getRoleLabel } from '../utils/auth';

const COLORS = ['#8b5cf6', '#f59e0b', '#3b82f6', '#10b981'];

export default function AdminDashboard() {
  const { user, login } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserData, setNewUserData] = useState({ email: '', name: '', role: 'UNDERGRADUATE_STUDENT', password: '', confirmPassword: '' });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const editingProvider = (editingUser?.provider || '').toUpperCase();
  const isEditingLocalUser = editingProvider === 'LOCAL';
  const editPassword = editingUser?.password || '';
  const editPasswordCriteria = {
    minLength: editPassword.length >= 8,
    hasUpper: /[A-Z]/.test(editPassword),
    hasNumber: /[0-9]/.test(editPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(editPassword),
  };
  const isEditPasswordStrong =
    editPasswordCriteria.minLength &&
    editPasswordCriteria.hasUpper &&
    editPasswordCriteria.hasNumber &&
    editPasswordCriteria.hasSpecial;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      if (data && Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('API did not return a user array:', data);
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await userService.deleteUser(id);
      fetchUsers();
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    // Validate password if provided
    if (newUserData.password) {
      const pw = newUserData.password;
      const strong = pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[!@#$%^&*(),.?":{}|<>]/.test(pw);
      if (!strong) {
        alert("Password must be at least 8 characters with uppercase, number, and special character.");
        return;
      }
      if (pw !== newUserData.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
    }
    await userService.createUser({
      email: newUserData.email,
      name: newUserData.name,
      role: newUserData.role,
      password: newUserData.password || null
    });
    setIsCreateModalOpen(false);
    setNewUserData({ email: '', name: '', role: 'UNDERGRADUATE_STUDENT', password: '', confirmPassword: '' });
    setShowCreatePassword(false);
    setShowCreateConfirmPassword(false);
    fetchUsers();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingLocalUser && editPassword) {
        if (!isEditPasswordStrong) {
          alert("Please ensure the new password meets all security requirements.");
          return;
        }
        if (editPassword !== editConfirmPassword) {
          alert("Passwords do not match.");
          return;
        }
      }

      const updatePayload = {
        name: editingUser.name,
        role: editingUser.role,
        picture: editingUser.picture
      };

      if (isEditingLocalUser) {
        updatePayload.email = editingUser.email;
        if (editingUser.password) {
          updatePayload.password = editingUser.password;
        }
      }

      const response = await userService.updateUser(editingUser.id, updatePayload);
      
      const currentUserId = user?.userId || user?.sub || user?.id;
      if (currentUserId && editingUser.id === currentUserId && response?.token) {
        login(response.token, response.user);
      }

      setIsEditModalOpen(false);
      setShowEditPassword(false);
      setShowEditConfirmPassword(false);
      setEditConfirmPassword('');
      fetchUsers();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update user. Email might already be taken.');
    }
  };

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 efficiency
        alert("Image is too large. Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'new') {
          setNewUserData({...newUserData, picture: reader.result});
        } else {
          setEditingUser({...editingUser, picture: reader.result});
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const exportToPDF = async () => {
    if (users.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const now = new Date();

      // ── Header banner ──────────────────────────────────────────
      doc.setFillColor(109, 40, 217);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Smart Campus — User Management Report', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 20);

      // ── Summary ────────────────────────────────────────────────
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 38);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Users: ${users.length}`, 14, 46);
      const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
      const roleText = Object.entries(roleCounts).map(([r, c]) => `${r}: ${c}`).join('   |   ');
      doc.text(`Role Breakdown: ${roleText}`, 14, 53);
      doc.text(`Active Roles: ${Object.keys(roleCounts).length}`, 14, 60);

      // ── Analytics header ───────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Analytics Overview', 14, 72);

      const roleChartColors = [[139, 92, 246], [245, 158, 11], [59, 130, 246], [16, 185, 129]];

      // ── LEFT: Role Distribution (horizontal proportion bars) ───
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Role Distribution', 14, 80);
      let legendY = 85;
      roleDistribution.forEach((item, idx) => {
        const pct = item.value / users.length;
        const barW = Math.max(5, 80 * pct);
        doc.setFillColor(...roleChartColors[idx % roleChartColors.length]);
        doc.roundedRect(14, legendY, barW, 8, 1, 1, 'F');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.name}: ${item.value} (${Math.round(pct * 100)}%)`, 14 + barW + 3, legendY + 5.5);
        legendY += 12;
      });

      // ── RIGHT: Registrations Over Time (bar chart) ─────────────
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Registrations Over Time', 115, 80);
      if (registrationsByDate.length > 0) {
        const maxCount = Math.max(...registrationsByDate.map(d => d.count));
        const chartLeft = 115;
        const chartWidth = 80;
        const chartHeight = 45;
        const chartTop = 84;
        const slotW = chartWidth / registrationsByDate.length;
        const barW = slotW * 0.6;
        registrationsByDate.forEach((item, idx) => {
          const barH = (item.count / maxCount) * chartHeight;
          const x = chartLeft + idx * slotW + (slotW - barW) / 2;
          const y = chartTop + chartHeight - barH;
          doc.setFillColor(139, 92, 246);
          doc.roundedRect(x, y, barW, barH, 1, 1, 'F');
          doc.setFontSize(6);
          doc.setTextColor(120);
          doc.text(item.date, x + barW / 2, chartTop + chartHeight + 5, { align: 'center' });
        });
        doc.setDrawColor(210, 210, 210);
        doc.line(chartLeft, chartTop + chartHeight, chartLeft + chartWidth, chartTop + chartHeight);
      }

      // ── Divider between charts and table ───────────────────────
      const sectionEnd = Math.max(legendY, 142);
      doc.setDrawColor(210, 210, 210);
      doc.line(14, sectionEnd, 196, sectionEnd);

      // ── User table ─────────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('User Details', 14, sectionEnd + 8);

      const tableRows = users.map((u, idx) => [
        idx + 1, u.name || '—', u.email, u.role,
        u.provider || 'GOOGLE',
        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
      ]);

      autoTable(doc, {
        startY: sectionEnd + 13,
        head: [['#', 'Name', 'Email', 'Role', 'Provider', 'Joined']],
        body: tableRows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
        },
      });

      // ── Footer ─────────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Smart Campus Operations Hub  •  Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 8
        );
      }

      doc.save(`SmartCampus_UserReport_${now.toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Derived state
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users.filter(user => {
      if (!user) return false;
      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchSearch = (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, searchTerm, roleFilter]);

  const roleDistribution = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    const dist = users.reduce((acc, user) => {
      if (!user || !user.role) return acc;
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(dist).map(key => ({ name: key, value: dist[key] }));
  }, [users]);

  const registrationsByDate = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    const dist = users.reduce((acc, user) => {
      if(!user || !user.createdAt) return acc;
      const date = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(dist).map(key => ({ date: key, count: dist[key] })).slice(-7); 
  }, [users]);

  const generateAIAssessment = () => {
    if (!users || !Array.isArray(users) || users.length === 0) return "Gathering data...";
    const managers = users.filter(u => u && u.role === 'MANAGER').length;
    const techs = users.filter(u => u && u.role === 'TECHNICIAN').length;
    
    if (managers > users.length / 2) return "⚠️ High number of Managers. Consider reviewing access controls.";
    if (techs === 0) return "💡 You have no Technicians. Operations may stall.";
    return "✅ System health is optimal. Role distribution looks balanced.";
  }

  return (
    <Layout title="User Management">
      <div className="space-y-8">
        
        {/* Top Widgets */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* AI Widget */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="col-span-1 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain size={100} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="text-violet-500" size={24} />
              <h2 className="text-lg font-semibold">AI Insights</h2>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 relative z-10 font-medium">
              {generateAIAssessment()}
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
              <CheckCircle size={16} className="text-green-500" /> System running smoothly
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="col-span-2 grid grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><Users size={16} className="text-violet-500" /><h3 className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Total Users</h3></div>
              <p className="text-4xl font-bold text-violet-600 dark:text-violet-400">{users.length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><KeyRound size={16} className="text-blue-500" /><h3 className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Local Auth</h3></div>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{users.filter(u => u.provider === 'LOCAL').length}</p>
              <p className="text-xs text-zinc-400 mt-1">Email + Password</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><Shield size={16} className="text-green-500" /><h3 className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Google SSO</h3></div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">{users.filter(u => u.provider !== 'LOCAL').length}</p>
              <p className="text-xs text-zinc-400 mt-1">OAuth 2.0</p>
            </motion.div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 h-[350px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Role Distribution</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {roleDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 h-[350px] flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Registrations Over Time</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrationsByDate}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* User Table Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          
          {/* Table Tools */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-2 px-4 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="ALL">All Roles</option>
                <option value="UNDERGRADUATE_STUDENT">Undergraduate Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="LECTURER">Lecturer</option>
                <option value="MANAGER">Manager</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={exportToPDF} 
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Generating PDF...
                  </>
                ) : (
                  <><FileDown size={16} /> Export PDF Report</>
                )}
              </button>
              <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-600/20">
                <Plus size={16} /> Add User
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Provider</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-zinc-500">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-zinc-500">No users found.</td></tr>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <motion.tr 
                      key={user.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name || user.email}&background=random`} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
                            {user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 86400000 && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                                <Sparkles size={12} className="text-amber-500 animate-pulse" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user.name || 'Unnamed User'}</span>
                              {user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 86400000 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider">New</span>
                              )}
                            </div>
                            <div className="text-zinc-500 text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'MANAGER' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400' :
                          user.role === 'TECHNICIAN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                          user.role === 'LECTURER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          user.role === 'INSTRUCTOR' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.provider === 'LOCAL' 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
                            : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        }`}>
                          {user.provider === 'LOCAL' ? <KeyRound size={12} /> : <Shield size={12} />}
                          {user.provider === 'LOCAL' ? 'Local' : 'Google'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser({ ...user, password: '' });
                              setShowEditPassword(false);
                              setShowEditConfirmPassword(false);
                              setEditConfirmPassword('');
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
        </motion.div>

      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-lg">Add New User</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700" placeholder="jane@smartcampus.edu" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input required type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assign Role</label>
                  <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700">
                    <option value="UNDERGRADUATE_STUDENT">Undergraduate Student</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="LECTURER">Lecturer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="TECHNICIAN">Technician</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium mb-1"><Lock size={14} /> Password <span className="text-zinc-400 text-xs">(optional)</span></label>
                  <div className="relative">
                    <input 
                      type={showCreatePassword ? "text" : "password"} 
                      value={newUserData.password} 
                      onChange={e => setNewUserData({...newUserData, password: e.target.value})} 
                      className="w-full p-2.5 pr-10 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700" 
                      placeholder="Leave blank for Google-only user" 
                    />
                    {newUserData.password.length > 0 && (
                      <button type="button" onClick={() => setShowCreatePassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors">
                        {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
                {newUserData.password && (
                  <>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium mb-1"><Lock size={14} /> Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showCreateConfirmPassword ? "text" : "password"} 
                          value={newUserData.confirmPassword} 
                          onChange={e => setNewUserData({...newUserData, confirmPassword: e.target.value})} 
                          className="w-full p-2.5 pr-10 rounded-xl border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700" 
                          placeholder="Verify password" 
                        />
                        {newUserData.confirmPassword.length > 0 && (
                          <button type="button" onClick={() => setShowCreateConfirmPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors">
                            {showCreateConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-3 space-y-1.5">
                      <div className={`flex items-center gap-2 text-xs font-medium ${newUserData.password.length >= 8 ? 'text-green-600' : 'text-zinc-400'}`}>
                        <CheckCircle size={13} className={newUserData.password.length >= 8 ? 'opacity-100' : 'opacity-20'} /> 8+ characters
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-medium ${/[A-Z]/.test(newUserData.password) ? 'text-green-600' : 'text-zinc-400'}`}>
                        <CheckCircle size={13} className={/[A-Z]/.test(newUserData.password) ? 'opacity-100' : 'opacity-20'} /> One uppercase
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-medium ${/[0-9]/.test(newUserData.password) ? 'text-green-600' : 'text-zinc-400'}`}>
                        <CheckCircle size={13} className={/[0-9]/.test(newUserData.password) ? 'opacity-100' : 'opacity-20'} /> One number
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-medium ${/[!@#$%^&*(),.?":{}|<>]/.test(newUserData.password) ? 'text-green-600' : 'text-zinc-400'}`}>
                        <CheckCircle size={13} className={/[!@#$%^&*(),.?":{}|<>]/.test(newUserData.password) ? 'opacity-100' : 'opacity-20'} /> Special character
                      </div>
                      {newUserData.confirmPassword && newUserData.password !== newUserData.confirmPassword && (
                        <div className="flex items-center gap-2 text-xs font-medium text-red-500">
                          <AlertCircle size={13} /> Passwords do not match
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">Create User</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Edit User Details</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="relative group">
                    <img 
                      src={editingUser?.picture || `https://ui-avatars.com/api/?name=${editingUser?.name || editingUser?.email}&background=random`} 
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 rounded-full object-cover border-4 border-violet-100 dark:border-violet-900/30 shadow-lg group-hover:opacity-75 transition-all"
                    />
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                      <Camera className="text-white" size={24} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'edit')} />
                    </label>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Change Profile Photo</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input 
                      required 
                      type="text" 
                      value={editingUser?.name || ''} 
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                      className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700 transition-all text-sm" 
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      required 
                      type="email" 
                      value={editingUser?.email || ''} 
                      disabled={!isEditingLocalUser}
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                      className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                    {!isEditingLocalUser && (
                      <p className="text-[10px] text-violet-500 mt-2">Google account: email is locked.</p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Role</label>
                    <select 
                      value={editingUser?.role || 'UNDERGRADUATE_STUDENT'} 
                      onChange={e => setEditingUser({...editingUser, role: e.target.value})} 
                      className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700 transition-all text-sm"
                    >
                      <option value="UNDERGRADUATE_STUDENT">Undergraduate Student</option>
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="LECTURER">Lecturer</option>
                      <option value="MANAGER">Manager</option>
                      <option value="TECHNICIAN">Technician</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      <Lock size={12} /> New Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showEditPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={editingUser?.password || ''} 
                        disabled={!isEditingLocalUser}
                        onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                        className="w-full p-3 pr-11 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                      {(editingUser?.password || '').length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors disabled:opacity-40"
                          disabled={!isEditingLocalUser}
                          aria-label={showEditPassword ? "Hide password" : "Show password"}
                        >
                          {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                    {!isEditingLocalUser && (
                      <p className="text-[10px] text-violet-500 mt-2">Google account: password cannot be changed here.</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="flex items-center gap-1 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      <Lock size={12} /> Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showEditConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={editConfirmPassword}
                        disabled={!isEditingLocalUser}
                        onChange={e => setEditConfirmPassword(e.target.value)}
                        className="w-full p-3 pr-11 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none dark:bg-zinc-950 dark:border-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {editConfirmPassword.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowEditConfirmPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-violet-500 transition-colors disabled:opacity-40"
                          disabled={!isEditingLocalUser}
                          aria-label={showEditConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showEditConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isEditingLocalUser && editPassword.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 p-3 space-y-2">
                    <div className={`flex items-center gap-2 text-xs font-medium ${editPasswordCriteria.minLength ? 'text-green-600' : 'text-zinc-500'}`}>
                      <CheckCircle size={14} className={editPasswordCriteria.minLength ? 'opacity-100' : 'opacity-30'} />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-medium ${editPasswordCriteria.hasUpper ? 'text-green-600' : 'text-zinc-500'}`}>
                      <CheckCircle size={14} className={editPasswordCriteria.hasUpper ? 'opacity-100' : 'opacity-30'} />
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-medium ${editPasswordCriteria.hasNumber ? 'text-green-600' : 'text-zinc-500'}`}>
                      <CheckCircle size={14} className={editPasswordCriteria.hasNumber ? 'opacity-100' : 'opacity-30'} />
                      One number
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-medium ${editPasswordCriteria.hasSpecial ? 'text-green-600' : 'text-zinc-500'}`}>
                      <CheckCircle size={14} className={editPasswordCriteria.hasSpecial ? 'opacity-100' : 'opacity-30'} />
                      One special character
                    </div>
                    {editConfirmPassword.length > 0 && editPassword !== editConfirmPassword && (
                      <div className="flex items-center gap-2 text-xs font-medium text-red-500">
                        <AlertCircle size={14} />
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-all">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-md shadow-violet-600/20 active:scale-95">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Layout>
  );
}
