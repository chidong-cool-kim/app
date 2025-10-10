import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gmail OAuth 설정
const GMAIL_CONFIG = {
  // Google OAuth 클라이언트 ID들
  iosClientId: '414463656562-qdps7r5qcpqf69k7cip6d1q0dtlttfpa.apps.googleusercontent.com',
  webClientId: '414463656562-lkr963sctfq7bac02u8avb55ki60ipq8.apps.googleusercontent.com',
  
  // Gmail API 접근을 위한 스코프
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  
  // 리다이렉트 URI
  redirectUri: 'com.cutecatmong.my-app://redirect',
  
  // Gmail API 베이스 URL
  gmailApiBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
  
  // Google 사용자 정보 API URL
  userInfoApiUrl: 'https://www.googleapis.com/userinfo/v2/me'
};

// Gmail API 엔드포인트들
const GMAIL_ENDPOINTS = {
  messages: '/users/me/messages',
  send: '/users/me/messages/send',
  profile: '/users/me/profile',
  labels: '/users/me/labels',
  threads: '/users/me/threads'
};

// 에러 메시지
const ERROR_MESSAGES = {
  AUTH_FAILED: 'Gmail 인증에 실패했습니다.',
  TOKEN_EXPIRED: '인증 토큰이 만료되었습니다. 다시 로그인해주세요.',
  API_ERROR: 'Gmail API 요청 중 오류가 발생했습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  PERMISSION_DENIED: 'Gmail 접근 권한이 필요합니다.'
};


class GmailAuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userInfo = null;
  }

  // Gmail OAuth 요청 설정 생성
  createAuthRequest() {
    return Google.useAuthRequest({
      iosClientId: GMAIL_CONFIG.iosClientId,
      webClientId: GMAIL_CONFIG.webClientId,
      redirectUri: GMAIL_CONFIG.redirectUri,
      scopes: GMAIL_CONFIG.scopes,
      responseType: 'code',
      additionalParameters: {
        access_type: 'offline', // 리프레시 토큰을 받기 위해 필요
        prompt: 'consent'
      }
    });
  }

  // 인증 토큰 저장
  async saveTokens(accessToken, refreshToken = null) {
    try {
      await AsyncStorage.setItem('gmail_access_token', accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem('gmail_refresh_token', refreshToken);
      }
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('토큰 저장 실패:', error);
      throw new Error(ERROR_MESSAGES.AUTH_FAILED);
    }
  }

  // 저장된 토큰 불러오기
  async loadStoredTokens() {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('gmail_access_token'),
        AsyncStorage.getItem('gmail_refresh_token')
      ]);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('토큰 불러오기 실패:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  // 사용자 정보 가져오기
  async fetchUserInfo(accessToken) {
    try {
      const response = await fetch(GMAIL_CONFIG.userInfoApiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const userInfo = await response.json();
      this.userInfo = userInfo;
      
      // 사용자 정보 저장
      await AsyncStorage.setItem('gmail_user_info', JSON.stringify(userInfo));
      
      return userInfo;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  // 액세스 토큰 갱신
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: GMAIL_CONFIG.webClientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`토큰 갱신 실패: ${response.status}`);
      }

      const data = await response.json();
      await this.saveTokens(data.access_token, this.refreshToken);
      
      return data.access_token;
    } catch (error) {
      console.error('토큰 갱신 실패:', error);
      throw new Error(ERROR_MESSAGES.TOKEN_EXPIRED);
    }
  }

  // Gmail API 요청 헬퍼
  async makeGmailApiRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error(ERROR_MESSAGES.AUTH_FAILED);
    }

    const url = `${GMAIL_CONFIG.gmailApiBaseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // 토큰이 만료된 경우 갱신 시도
      if (response.status === 401) {
        await this.refreshAccessToken();
        requestOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, requestOptions);
        
        if (!retryResponse.ok) {
          throw new Error(`API 요청 실패: ${retryResponse.status}`);
        }
        
        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Gmail API 요청 실패:', error);
      throw new Error(ERROR_MESSAGES.API_ERROR);
    }
  }

  // 메일 목록 가져오기
  async getMessages(query = '', maxResults = 10) {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });
    
    return await this.makeGmailApiRequest(`${GMAIL_ENDPOINTS.messages}?${params}`);
  }

  // 특정 메일 내용 가져오기
  async getMessage(messageId) {
    return await this.makeGmailApiRequest(`${GMAIL_ENDPOINTS.messages}/${messageId}`);
  }

  // 메일 보내기
  async sendMessage(to, subject, body) {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return await this.makeGmailApiRequest(GMAIL_ENDPOINTS.send, {
      method: 'POST',
      body: JSON.stringify({
        raw: encodedEmail
      })
    });
  }

  // 사용자 프로필 정보 가져오기
  async getProfile() {
    return await this.makeGmailApiRequest(GMAIL_ENDPOINTS.profile);
  }

  // 라벨 목록 가져오기
  async getLabels() {
    return await this.makeGmailApiRequest(GMAIL_ENDPOINTS.labels);
  }

  // 로그아웃 (토큰 삭제)
  async logout() {
    try {
      await AsyncStorage.multiRemove([
        'gmail_access_token',
        'gmail_refresh_token',
        'gmail_user_info'
      ]);
      
      this.accessToken = null;
      this.refreshToken = null;
      this.userInfo = null;
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw new Error('로그아웃 중 오류가 발생했습니다.');
    }
  }

  // 인증 상태 확인
  isAuthenticated() {
    return !!this.accessToken;
  }
}

// 싱글톤 인스턴스 생성
const gmailAuthService = new GmailAuthService();

export default gmailAuthService;
