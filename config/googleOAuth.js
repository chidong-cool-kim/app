// Google OAuth 설정
import { Platform } from 'react-native';

// Google Cloud Console에서 발급받은 클라이언트 ID
// https://console.cloud.google.com/apis/credentials 에서 생성
export const GOOGLE_OAUTH_CONFIG = {
  // Android 클라이언트 ID (나중에 실제 빌드 시 필요)
  androidClientId: '395130382912-57mdir02cj5p408r7tj36rjrr8k2si4k.apps.googleusercontent.com',
  
  // iOS 클라이언트 ID (나중에 실제 빌드 시 필요)
  iosClientId: '395130382912-57mdir02cj5p408r7tj36rjrr8k2si4k.apps.googleusercontent.com',
  
  // Web 클라이언트 ID (Expo Go 개발 시 사용 - 현재 사용 중)
  webClientId: '395130382912-57mdir02cj5p408r7tj36rjrr8k2si4k.apps.googleusercontent.com',
  
  // Expo Client ID
  expoClientId: '395130382912-57mdir02cj5p408r7tj36rjrr8k2si4k.apps.googleusercontent.com',
};

// 플랫폼별 클라이언트 ID 반환
export const getGoogleClientId = () => {
  if (Platform.OS === 'android') {
    return GOOGLE_OAUTH_CONFIG.androidClientId;
  } else if (Platform.OS === 'ios') {
    return GOOGLE_OAUTH_CONFIG.iosClientId;
  } else if (Platform.OS === 'web') {
    return GOOGLE_OAUTH_CONFIG.webClientId;
  }
  return GOOGLE_OAUTH_CONFIG.expoClientId;
};

// OAuth 스코프 설정
export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
];

// Redirect URI 설정
export const getRedirectUri = () => {
  // Expo의 경우 자동으로 생성되는 redirect URI 사용
  // 형식: exp://127.0.0.1:19000/--/
  return undefined; // expo-auth-session이 자동으로 처리
};
