# 🔒 StudyTime 백엔드 보안 가이드

## 보안 기능 개요

### 1. 인증 및 권한 관리
- **bcrypt 비밀번호 해시화**: Salt rounds 12
- **강력한 비밀번호 정책**: 8자 이상, 대소문자+숫자+특수문자 필수
- **타이밍 공격 방지**: 사용자 존재 여부 노출 방지
- **세션 관리**: 안전한 사용자 세션 처리

### 2. Rate Limiting (속도 제한)
- **로그인 시도 제한**: 15분간 최대 5회
- **인증코드 요청 제한**: 5분간 최대 3회
- **IP 기반 제한**: 동일 IP에서 과도한 요청 차단

### 3. 입력 검증 및 Sanitization
- **이메일 검증**: validator 라이브러리 사용
- **XSS 방지**: HTML 이스케이프 처리
- **SQL/NoSQL Injection 방지**: Mongoose ODM + 입력 검증
- **파일 업로드 보안**: 파일 타입 및 크기 제한

### 4. 보안 헤더
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Strict-Transport-Security**: HTTPS 강제 (프로덕션)

## 설치 및 설정

### 1. 필수 패키지 설치
```bash
npm install bcrypt express-rate-limit validator
```

### 2. 환경 변수 설정
`.env.example`을 `.env`로 복사하고 실제 값으로 수정:
```bash
cp .env.example .env
```

### 3. Gmail 앱 비밀번호 설정
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. `.env` 파일에 설정

## API 보안 가이드

### 인증이 필요한 엔드포인트
- 모든 사용자 데이터 관련 API
- 파일 업로드 API
- 관리자 기능 API

### Rate Limiting 적용 엔드포인트
- `POST /api/email-login` (15분/5회)
- `POST /api/email-register` (5분/3회)
- `POST /api/send-verification-code` (5분/3회)

### 입력 검증 규칙
- **이메일**: Gmail 주소만 허용, RFC 5321 준수
- **비밀번호**: 8-128자, 복잡성 요구사항
- **사용자명**: 2-20자, 특수문자 제한
- **파일 업로드**: 5MB 제한, 이미지 파일만

## 보안 모니터링

### 로그 기록
- 로그인 실패 시도
- Rate limit 초과
- 파일 업로드 실패
- 인증 오류

### 보안 이벤트 알림
```javascript
// 로그인 실패 로그
console.log(`🚫 로그인 실패 시도: ${email} at ${timestamp}`);

// Rate limit 초과 로그
console.log(`⚠️ Rate limit 초과: ${ip} - ${endpoint}`);
```

## 프로덕션 배포 시 주의사항

### 1. 환경 변수 보안
- `.env` 파일을 Git에 커밋하지 않기
- 프로덕션에서는 환경 변수로 직접 설정
- 강력한 JWT_SECRET 사용

### 2. HTTPS 설정
- SSL/TLS 인증서 설정
- HTTP → HTTPS 리다이렉트
- HSTS 헤더 활성화

### 3. 데이터베이스 보안
- MongoDB 인증 활성화
- 네트워크 접근 제한
- 정기적인 백업

### 4. 서버 보안
- 방화벽 설정
- 불필요한 포트 차단
- 정기적인 보안 업데이트

## 보안 체크리스트

- [ ] bcrypt로 비밀번호 해시화
- [ ] Rate limiting 설정
- [ ] 입력 검증 및 sanitization
- [ ] 보안 헤더 설정
- [ ] CORS 정책 설정
- [ ] 파일 업로드 보안
- [ ] 환경 변수 보안
- [ ] 로그 모니터링 설정
- [ ] HTTPS 설정 (프로덕션)
- [ ] 데이터베이스 보안 설정

## 보안 업데이트

정기적으로 다음을 확인하고 업데이트하세요:
- npm 패키지 보안 취약점 (`npm audit`)
- Node.js 버전 업데이트
- 의존성 패키지 업데이트
- 보안 정책 검토

## 문의 및 신고

보안 취약점을 발견하신 경우:
1. 즉시 개발팀에 연락
2. 상세한 재현 방법 제공
3. 공개적으로 공유하지 않기

---

**⚠️ 주의**: 이 보안 설정은 기본적인 보안 수준을 제공합니다. 실제 프로덕션 환경에서는 추가적인 보안 조치가 필요할 수 있습니다.
