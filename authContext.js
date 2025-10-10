import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import database from './database';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedUser, storedToken] = await Promise.all([
        AsyncStorage.getItem('userInfo'),
        AsyncStorage.getItem('userToken')
      ]);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, authToken) => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
      await AsyncStorage.setItem('userToken', authToken);
      setUser(userData);
      setToken(authToken);
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw error;
    }
  };

  // 사용자 데이터 저장 (노트, 플랜, 타이머 등)
  const saveUserNote = async (noteData) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.saveNote(user.id, noteData);
  };

  const getUserNotes = async () => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.getUserNotes(user.id);
  };

  const deleteUserNote = async (noteId) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.deleteNote(user.id, noteId);
  };

  const saveUserPlan = async (planData) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.savePlan(user.id, planData);
  };

  const getUserPlans = async () => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.getUserPlans(user.id);
  };

  const saveTimerRecord = async (timerData) => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.saveTimerRecord(user.id, timerData);
  };

  const getUserTimers = async () => {
    if (!user?.id) throw new Error('로그인이 필요합니다.');
    return await database.getUserTimers(user.id);
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userInfo', 'userToken']);
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  };

  const updateUser = async (userData) => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      updateUser,
      // 데이터베이스 함수들
      saveUserNote,
      getUserNotes,
      deleteUserNote,
      saveUserPlan,
      getUserPlans,
      saveTimerRecord,
      getUserTimers
    }}>
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
