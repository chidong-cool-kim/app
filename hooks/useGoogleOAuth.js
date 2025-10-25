import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOOGLE_OAUTH_CONFIG } from '../config/googleOAuth';
import { apiCall, API_ENDPOINTS } from '../config/api';

// WebBrowser 완료 처리 (필수)
WebBrowser.maybeCompleteAuthSession();

export const useGoogleOAuth = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Google OAuth 요청 설정
  // Expo Go에서는 webClientId만 사용
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_OAUTH_CONFIG.webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  // OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleSignIn(authentication);
    } else if (response?.type === 'error') {
      setError('Google 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  // Google 사용자 정보 가져오기 및 백엔드 처리
  const handleGoogleSignIn = async (authentication) => {
    try {
      setLoading(true);
      setError(null);

      if (!authentication?.accessToken) {
        throw new Error('액세스 토큰을 받지 못했습니다.');
      }

      // Google API로 사용자 정보 가져오기
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${authentication.accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('사용자 정보를 가져오는데 실패했습니다.');
      }

      const googleUserInfo = await userInfoResponse.json();
      console.log('Google 사용자 정보:', googleUserInfo);

      // 백엔드로 Google 로그인 요청
      const backendResponse = await apiCall(API_ENDPOINTS.GOOGLE_LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          googleId: googleUserInfo.sub,
          picture: googleUserInfo.picture,
          accessToken: authentication.accessToken,
        }),
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok) {
        throw new Error(backendData.message || '로그인에 실패했습니다.');
      }

      // 사용자 정보 저장
      const userData = {
        id: backendData.user.id,
        email: backendData.user.email,
        name: backendData.user.name,
        username: backendData.user.username,
        picture: backendData.user.picture,
        provider: 'google',
        createdAt: backendData.user.createdAt,
        notesCount: backendData.user.notesCount || 0,
        dailyStudyMinutes: backendData.user.dailyStudyMinutes || 0,
        plannersCount: backendData.user.plannersCount || 0,
      };

      await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
      await AsyncStorage.setItem('is_authenticated', 'true');
      await AsyncStorage.setItem('google_access_token', authentication.accessToken);

      setUserInfo(userData);
      setLoading(false);

      return {
        success: true,
        user: userData,
        needsUsername: !backendData.user.username,
      };
    } catch (err) {
      console.error('Google 로그인 오류:', err);
      setError(err.message);
      setLoading(false);
      return {
        success: false,
        error: err.message,
      };
    }
  };

  // Google 로그인 시작
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await promptAsync();
    } catch (err) {
      console.error('Google 로그인 시작 오류:', err);
      setError('Google 로그인을 시작할 수 없습니다.');
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove([
        'currentUser',
        'is_authenticated',
        'google_access_token',
      ]);
      setUserInfo(null);
      setError(null);
    } catch (err) {
      console.error('로그아웃 오류:', err);
      setError('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 저장된 인증 정보 확인
  const checkStoredAuth = async () => {
    try {
      const [storedUserInfo, isAuth] = await Promise.all([
        AsyncStorage.getItem('currentUser'),
        AsyncStorage.getItem('is_authenticated'),
      ]);

      if (isAuth === 'true' && storedUserInfo) {
        const userData = JSON.parse(storedUserInfo);
        setUserInfo(userData);
        return userData;
      }
      return null;
    } catch (err) {
      console.error('저장된 인증 정보 확인 오류:', err);
      return null;
    }
  };

  // 에러 초기화
  const clearError = () => {
    setError(null);
  };

  return {
    // 상태
    userInfo,
    loading,
    error,
    request,

    // 함수
    signInWithGoogle,
    signOut,
    checkStoredAuth,
    clearError,
  };
};
