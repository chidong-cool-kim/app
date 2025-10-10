// Gmail을 통한 인증코드 발송 서비스
class EmailService {
  constructor() {
    // 백엔드 API 설정
    this.backendUrl = 'http://192.168.45.53:5000/api';
  }

  // 6자리 랜덤 인증코드 생성
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Gmail로 인증코드 발송 - 백엔드 API 호출
  async sendVerificationCode(email) {
    try {
      console.log('백엔드 API 호출 시작:', email);
      
      const response = await fetch(`${this.backendUrl}/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      console.log('백엔드 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('백엔드 API 오류:', errorText);
        throw new Error(`인증코드 발송 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('백엔드 응답 데이터:', data);
      
      return { success: true, message: data.message };
    } catch (error) {
      console.error('인증코드 발송 실패:', error);
      return { success: false, error: error.message };
    }
  }


  // 인증코드 검증 - 백엔드 API 호출
  async verifyCode(email, inputCode) {
    try {
      console.log('인증코드 검증 API 호출:', email, inputCode);
      
      const response = await fetch(`${this.backendUrl}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: inputCode
        })
      });

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
