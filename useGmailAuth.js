import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 에러 메시지
const ERROR_MESSAGES = {
  AUTH_FAILED: 'Gmail 인증에 실패했습니다.',
  CODE_EXPIRED: '인증코드가 만료되었습니다. 다시 요청해주세요.',
  CODE_INVALID: '인증코드가 올바르지 않습니다.',
  EMAIL_SEND_FAILED: '인증코드 발송에 실패했습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.'
};

export const useGmailAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState('');

  // Gmail 인증코드 발송
  const sendVerificationCode = async (emailAddress) => {
    try {
      setLoading(true);
      setError(null);
      
      // 백엔드 API 호출하여 인증코드 발송
      console.log('API 호출 시작:', emailAddress);
      
      const response = await fetch('http://192.168.45.53:5000/api/signup/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress
        })
      });

      console.log('API 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 오류:', errorText);
        throw new Error(`인증코드 발송 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      setEmail(emailAddress);
      setCodeSent(true);
      
      return { success: true, message: '인증코드가 발송되었습니다.' };
    } catch (error) {
      console.error('인증코드 발송 실패:', error);
      setError(ERROR_MESSAGES.EMAIL_SEND_FAILED);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 인증코드 확인
  const verifyCode = async (code) => {
    try {
      setLoading(true);
      setError(null);

      // 백엔드 API 호출하여 인증코드 확인
      console.log('인증코드 검증 시작:', email, code);
      
      const response = await fetch('http://192.168.45.53:5000/api/signup/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code
        })
      });

      console.log('인증코드 검증 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('인증코드 검증 API 오류:', errorText);
        throw new Error('인증코드가 올바르지 않습니다.');
      }

      const data = await response.json();
      console.log('인증코드 검증 응답 데이터:', data);
      
      // 백엔드에서 받은 사용자 정보 저장
      if (!data.user) {
        throw new Error('사용자 정보를 받지 못했습니다.');
      }

      const userInfo = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        username: data.user.username,
        isEmailVerified: data.user.isEmailVerified,
        createdAt: data.user.createdAt,
        verified: true,
        verifiedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(userInfo));
      await AsyncStorage.setItem('is_authenticated', 'true');
      
      setUserInfo(userInfo);
      setIsAuthenticated(true);
      
      return { success: true, userInfo };
    } catch (error) {
      console.error('인증코드 확인 실패:', error);
      const errorMessage = error.message || ERROR_MESSAGES.CODE_INVALID;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      setLoading(true);
      
      await AsyncStorage.multiRemove(['currentUser', 'is_authenticated']);
      
      setIsAuthenticated(false);
      setUserInfo(null);
      setError(null);
      setCodeSent(false);
      setEmail('');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setError('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 저장된 인증 정보 확인
  const checkStoredAuth = async () => {
    try {
      const [storedUserInfo, isAuth] = await Promise.all([
        AsyncStorage.getItem('currentUser'),
        AsyncStorage.getItem('is_authenticated')
      ]);
      
      if (isAuth === 'true' && storedUserInfo) {
        const userInfo = JSON.parse(storedUserInfo);
        setUserInfo(userInfo);
        setIsAuthenticated(true);
        setEmail(userInfo.email);
      }
    } catch (error) {
      console.error('저장된 인증 정보 확인 실패:', error);
    }
  };

  // 인증코드 재발송
  const resendCode = async () => {
    if (email) {
      return await sendVerificationCode(email);
    }
    return { success: false, error: '이메일 주소가 없습니다.' };
  };

  // 닉네임 업데이트
  const updateUsername = async (newUsername) => {
    try {
      setLoading(true);
      setError(null);

      if (!userInfo?.email) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const response = await fetch('http://192.168.45.53:5000/api/update-username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userInfo.email,
          username: newUsername
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '닉네임 업데이트 실패');
      }

      const data = await response.json();
      
      // 업데이트된 사용자 정보 저장
      const updatedUserInfo = {
        ...userInfo,
        name: data.user.name,
        username: data.user.username
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUserInfo));
      setUserInfo(updatedUserInfo);
      
      return { success: true, userInfo: updatedUserInfo };
    } catch (error) {
      console.error('닉네임 업데이트 실패:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 에러 초기화
  const clearError = () => {
    setError(null);
  };

  return {
    // 상태
    isAuthenticated,
    userInfo,
    loading,
    error,
    codeSent,
    email,
    
    // 인증 관련 함수
    sendVerificationCode,
    verifyCode,
    resendCode,
    signOut,
    checkStoredAuth,
    updateUsername,
    
    // 유틸리티 함수
    clearError
  };
};
