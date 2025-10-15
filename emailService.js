import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Gmail을 통한 인증코드 발송 서비스
class EmailService {
  constructor() {
    // 백엔드 API 설정
    const devServerUrl = 'http://192.168.45.53:5000/api';
    this.backendUrl = devServerUrl;
    
    // 디버깅을 위한 서버 URL 로깅
    console.log('📡 Backend URL:', this.backendUrl);
    
    // 연결 테스트
    this.testConnection();
  }
  
  // 서버 연결 테스트
  async testConnection() {
    try {
      const response = await fetch(`${this.backendUrl}/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('🔌 서버 연결 테스트:', response.status === 200 ? '성공' : '실패');
    } catch (error) {
      console.error('❌ 서버 연결 테스트 실패:', error.message);
    }
  }

  // 6자리 랜덤 인증코드 생성
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Gmail로 인증코드 발송 - 백엔드 API 호출
  async sendVerificationCode(email) {
    try {
      if (!this.validateEmail(email)) {
        return { success: false, error: '유효하지 않은 이메일 주소입니다.' };
      }

      if (!this.isGmailAddress(email)) {
        return { success: false, error: 'Gmail 주소만 사용 가능합니다.' };
      }

      console.log('백엔드 API 호출 시작:', email);
      
      // 서버 연결 테스트
      try {
        const pingResponse = await fetch(`${this.backendUrl}/ping`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('서버 연결 상태:', pingResponse.status);
        if (!pingResponse.ok) {
          throw new Error('서버 연결 실패');
        }
      } catch (pingError) {
        console.error('서버 연결 테스트 실패:', pingError);
        return { success: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' };
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.backendUrl}/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('백엔드 응답 상태:', response.status);

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        console.error('백엔드 API 오류:', data);
        throw new Error(data.message || `서버 오류 (${response.status})`);
      }

      console.log('백엔드 응답 데이터:', data);
      
      return { 
        success: true, 
        message: data.message || '인증코드가 발송되었습니다.' 
      };
    } catch (error) {
      console.error('인증코드 발송 실패:', error);
      if (error.name === 'AbortError') {
        return { 
          success: false, 
          error: '요청 시간이 초과되었습니다. 다시 시도해주세요.' 
        };
      }
      if (error.name === 'TypeError' && error.message.includes('Network')) {
        return { 
          success: false, 
          error: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.' 
        };
      }
      return { 
        success: false, 
        error: error.message || '인증코드 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      };
    }
  }

  // 인증코드 검증 - 백엔드 API 호출
  async verifyCode(email, inputCode) {
    try {
      console.log('인증코드 검증 API 호출:', email, inputCode);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.backendUrl}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: inputCode
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('인증코드 검증 응답 상태:', response.status);

      const data = await response.json();
      console.log('인증코드 검증 응답 데이터:', data);

      if (!response.ok) {
        console.error('인증코드 검증 API 오류:', data);
        return { success: false, error: data.message || `서버 오류: ${response.status}` };
      }
      
      return { success: true, data: data };
    } catch (error) {
      console.error('인증코드 검증 실패:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: '요청 시간이 초과되었습니다.' };
      }
      return { success: false, error: '네트워크 연결 오류가 발생했습니다.' };
    }
  }

  // 이메일 형식 검증
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Gmail 도메인 검증
  isGmailAddress(email) {
    return email.toLowerCase().endsWith('@gmail.com');
  }
}

// 싱글톤 인스턴스
const emailService = new EmailService();
export default emailService;