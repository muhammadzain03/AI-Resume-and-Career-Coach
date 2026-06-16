import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearAuthSession,
  getMe,
  getStoredUser,
  googleAuth as apiGoogleAuth,
  loginUser as apiLogin,
  registerUser as apiRegister,
  setAuthSession,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((data) => {
    if (data?.user) {
      setUser(data.user);
      setAuthSession(data);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const stored = getStoredUser();
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const data = await getMe();
      setUser(data.user);
      setAuthSession({ user: data.user });
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await apiRegister(name, email, password);
    setUser(data.user);
    return data;
  };

  const googleLogin = async (credential) => {
    const data = await apiGoogleAuth(credential);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    googleLogin,
    logout,
    refreshUser: bootstrap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
