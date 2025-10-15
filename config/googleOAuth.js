// Google OAuth 설정
import { Platform } from 'react-native';

// Google Cloud Console에서 발급받은 클라이언트 ID
// https://console.cloud.google.com/apis/credentials 에서 생성
export const GOOGLE_OAUTH_CONFIG = {
  // Android 클라이언트 ID
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  
  // iOS 클라이언트 ID
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  
  // Web 클라이언트 ID (Expo Go 개발 시 사용)
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  
  // Expo Client ID (선택사항)
  expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
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
