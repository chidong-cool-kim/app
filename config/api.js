// API 설정 파일
import { Platform } from 'react-native';

// 개발 환경에서 사용할 IP 주소
// Windows에서 ipconfig, Mac/Linux에서 ifconfig로 확인한 실제 IP 주소를 입력하세요
const DEV_IP = '192.168.45.53'; // 실제 컴퓨터 IP 주소

// API Base URL 설정
export const API_BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000'
  : `http://${DEV_IP}:5000`;

// API 엔드포인트들
export const API_ENDPOINTS = {
  GMAIL_LOGIN: '/api/auth/gmail-login',
  EMAIL_LOGIN: '/api/email-login',
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
