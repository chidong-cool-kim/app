// API 설정 파일
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 환경변수에서 API URL 가져오기 (Railway 배포 시 사용)
const PRODUCTION_API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://your-app.railway.app';

// 개발 환경에서 사용할 IP 주소
const DEV_IP = '192.168.45.53'; // 로컬 개발용

// 환경 감지
const isDevelopment = __DEV__;

// API Base URL 설정
export const API_BASE_URL = isDevelopment 
  ? (Platform.OS === 'web' 
      ? 'http://localhost:5000'
      : `http://${DEV_IP}:5000`)
  : PRODUCTION_API_URL;

// API 엔드포인트들
export const API_ENDPOINTS = {
  GMAIL_LOGIN: '/api/auth/gmail-login',
  EMAIL_LOGIN: '/api/auth/login',
  GOOGLE_LOGIN: '/api/auth/google-login',
  GOOGLE_UPDATE_USERNAME: '/api/auth/google-update-username',
};

// API 호출 헬퍼 함수
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    return response;
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
};
