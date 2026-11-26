import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const INITIAL_USERS = [
  {
    id: 'usr_admin_01',
    name: 'Asad Imran',
    email: 'admin@threatlens.io',
    password: 'Admin@123',
    role: 'admin',
    status: 'active',
    workspace: 'My Workspace',
    scanLimit: 25,
    profileCompletion: 100,
    lastActive: 'Just now',
  },
  {
    id: 'usr_analyst_02',
    name: 'Security Analyst',
    email: 'analyst@threatlens.io',
    password: 'User@123',
    role: 'user',
    status: 'active',
    workspace: 'My Workspace',
    scanLimit: 5,
    profileCompletion: 75,
    lastActive: '2 hours ago',
  },
];

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('threatlens_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('threatlens_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('threatlens_audit_logs');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'log_1',
              timestamp: '2026-11-25 18:10',
              actor: 'admin@threatlens.io',
              action: 'Workspace initialized with role-based access control',
            },
          ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('threatlens_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('threatlens_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('threatlens_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('threatlens_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const recordLog = (actor, action) => {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      actor,
      action,
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  const login = (email, password) => {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    if (found.status !== 'active') {
      return { ok: false, error: 'This account is suspended. Contact an administrator.' };
    }
    const updated = { ...found, lastActive: 'Just now' };
    setUsers((prev) => prev.map((u) => (u.id === found.id ? updated : u)));
    setCurrentUser(updated);
    recordLog(found.email, 'Signed in');
    return { ok: true, user: updated };
  };

  const register = ({ name, email, password }) => {
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'user',
      status: 'active',
      workspace: 'My Workspace',
      scanLimit: 5,
      profileCompletion: 50,
      lastActive: 'Just now',
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    recordLog(newUser.email, 'Registered new account');
    return { ok: true, user: newUser };
  };

  const logout = () => {
    if (currentUser) {
      recordLog(currentUser.email, 'Signed out');
    }
    setCurrentUser(null);
  };

  const createUserByAdmin = ({ name, email, password, role, scanLimit }) => {
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'Email already registered.' };
    }
    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password || 'ChangeMe@123',
      role: role || 'user',
      status: 'active',
      workspace: 'My Workspace',
      scanLimit: Number(scanLimit) || 5,
      profileCompletion: 60,
      lastActive: 'Never',
    };
    setUsers((prev) => [...prev, newUser]);
    recordLog(currentUser?.email || 'admin', `Provisioned user ${newUser.email} (${newUser.role})`);
    return { ok: true };
  };

  const updateUserByAdmin = (userId, updates) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const next = { ...u, ...updates };
        if (currentUser?.id === userId) setCurrentUser(next);
        return next;
      })
    );
    recordLog(currentUser?.email || 'admin', `Updated user ${userId}`);
  };

  const deleteUserByAdmin = (userId) => {
    if (userId === currentUser?.id) return;
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    recordLog(currentUser?.email || 'admin', `Deleted user ${target?.email || userId}`);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        auditLogs,
        login,
        register,
        logout,
        recordLog,
        createUserByAdmin,
        updateUserByAdmin,
        deleteUserByAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);