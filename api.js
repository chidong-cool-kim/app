import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Base URL - 실제 서버 IP 주소로 변경하세요
export const API_URL = Platform.select({
  ios: 'http://192.168.45.53:5000',
  android: 'http://192.168.45.53:5000',
  default: 'http://localhost:5000'
});

// 토큰 가져오기
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

// 인증 헤더 생성
export const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API 요청 래퍼
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const headers = await getAuthHeaders();
    const url = `${API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// 회원가입 API
export const signupAPI = {
  sendVerificationCode: async (email) => {
    return apiRequest('/api/signup/send-verification-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyCode: async (email, code) => {
    return apiRequest('/api/signup/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  signup: async (userData) => {
    return apiRequest('/api/signup/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// 인증 API
export const authAPI = {
  login: async (email, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  oauthLogin: async (oauthData) => {
    return apiRequest('/api/auth/oauth-login', {
      method: 'POST',
      body: JSON.stringify(oauthData),
    });
  },

  setUsername: async (userId, username) => {
    return apiRequest('/api/auth/set-username', {
      method: 'POST',
      body: JSON.stringify({ userId, username }),
    });
  },

  verifyToken: async () => {
    return apiRequest('/api/auth/verify', {
      method: 'GET',
    });
  },

  getMe: async () => {
    return apiRequest('/api/auth/me', {
      method: 'GET',
    });
  },
};

// 커뮤니티 API
export const communityAPI = {
  getPosts: async (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/api/community/posts${query}`, {
      method: 'GET',
    });
  },

  getPost: async (postId) => {
    return apiRequest(`/api/community/posts/${postId}`, {
      method: 'GET',
    });
  },

  createPost: async (postData) => {
    return apiRequest('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  likePost: async (postId) => {
    return apiRequest(`/api/community/posts/${postId}/like`, {
      method: 'POST',
    });
  },

  addComment: async (postId, content) => {
    return apiRequest(`/api/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  likeComment: async (postId, commentId) => {
    return apiRequest(`/api/community/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
    });
  },

  deletePost: async (postId) => {
    return apiRequest(`/api/community/posts/${postId}`, {
      method: 'DELETE',
    });
  },
};
