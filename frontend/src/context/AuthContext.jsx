import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on mount
    api.getMe()
      .then(userData => {
        if (userData && userData.user) {
          setUser(userData.user);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (data.success) {
      setUser(data.user);
    }
    return data;
  };

  const register = async (email, password, name) => {
    return await api.register(email, password, name);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    window.location.href = '/'; // Simple redirect on logout
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
