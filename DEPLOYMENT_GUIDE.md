# 📱 StudyTime 앱 배포 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [Android 배포 (Google Play)](#android-배포)
3. [iOS 배포 (App Store)](#ios-배포)
4. [체크리스트](#최종-체크리스트)

---

## 🔧 사전 준비

### 1. 필수 계정 생성
- ✅ **Google Play Console** 계정 ($25 일회성 등록비)
  - https://play.google.com/console
- ✅ **Apple Developer** 계정 ($99/년)
  - https://developer.apple.com

### 2. 필수 파일 준비
- ✅ 앱 아이콘 (1024x1024px)
- ✅ 스플래시 스크린
- ✅ 스크린샷 (최소 2개, 각 화면 크기별)
- ✅ 앱 설명 (한국어/영어)
- ✅ 개인정보 처리방침 URL
- ✅ 서비스 이용약관 URL

### 3. 앱 정보
- **앱 이름**: StudyTime
- **패키지명**: com.studytime.app
- **버전**: 1.0.0
- **카테고리**: 교육

---

## 📦 Android 배포 (Google Play)

### Step 1: EAS 설정

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인
eas login

# 프로젝트 설정
eas build:configure
```

### Step 2: Keystore 생성

```bash
# Android Keystore 생성
eas credentials
```

선택 사항:
- Select platform: **Android**
- What do you want to do?: **Set up a new keystore**

### Step 3: 빌드 실행

```bash
# Production APK 빌드
eas build --platform android --profile production

# 또는 AAB (Google Play 권장)
eas build --platform android --profile production:aab
```

### Step 4: Google Play Console 업로드

1. **Google Play Console** 접속
2. **앱 만들기** 클릭
3. 앱 정보 입력:
   - 앱 이름: StudyTime
   - 기본 언어: 한국어
   - 앱 유형: 앱
   - 무료/유료: 무료

4. **앱 콘텐츠** 섹션 작성:
   - 개인정보 처리방침
   - 앱 액세스 권한
   - 광고 포함 여부
   - 콘텐츠 등급

5. **프로덕션** 트랙에 AAB 업로드

6. **출시 검토 제출**

---

## 🍎 iOS 배포 (App Store)

### Step 1: Apple Developer 설정

1. **Apple Developer** 계정 가입
2. **Certificates, Identifiers & Profiles** 설정
3. **App ID** 생성: com.studytime.app

### Step 2: App Store Connect 설정

1. **App Store Connect** 접속
2. **새로운 앱** 생성
3. 앱 정보 입력:
   - 플랫폼: iOS
   - 이름: StudyTime
   - 기본 언어: 한국어
   - 번들 ID: com.studytime.app
   - SKU: studytime-001

### Step 3: iOS 빌드

```bash
# iOS 빌드 (Apple 계정 필요)
eas build --platform ios --profile production
```

### Step 4: TestFlight 업로드

빌드 완료 후 자동으로 TestFlight에 업로드됩니다.

### Step 5: App Store 제출

1. **App Store Connect**에서 앱 선택
2. **버전 정보** 입력
3. **스크린샷** 업로드 (각 디바이스 크기별)
4. **앱 설명** 작성
5. **키워드** 설정
6. **가격 및 배포** 설정
7. **심사 제출**

---

## ⚙️ eas.json 설정

프로젝트 루트에 `eas.json` 파일 생성:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    },
    "production:aab": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 📸 스크린샷 가이드

### Android (Google Play)
- **Phone**: 1080 x 1920px (최소 2개)
- **7인치 태블릿**: 1200 x 1920px
- **10인치 태블릿**: 1600 x 2560px

### iOS (App Store)
- **6.5" iPhone**: 1242 x 2688px
- **5.5" iPhone**: 1242 x 2208px
- **12.9" iPad Pro**: 2048 x 2732px

---

## 📝 앱 설명 템플릿

### 짧은 설명 (80자)
```
공부 시간 관리와 AI 학습 도우미가 함께하는 스마트 학습 앱
```

### 상세 설명
```
📚 StudyTime - 당신의 스마트 학습 파트너

StudyTime은 학생들을 위한 올인원 학습 관리 앱입니다.

✨ 주요 기능

⏱️ 스마트 타이머
- 공부 시간 자동 추적
- 일일/주간/월간 통계
- 레벨 시스템으로 동기부여

📅 플래너
- 일정 관리
- 할일 체크리스트
- 알림 기능

🤖 AI 학습 도우미
- GPT-4o 기반 질문 답변
- 맞춤형 학습 조언
- 다양한 AI 스타일 선택

📝 노트 작성
- 텍스트/그림 노트
- 클라우드 동기화
- 폴더 정리 기능

👥 스터디 그룹
- 친구들과 함께 공부
- 그룹 채팅
- 학습 진도 공유

💎 프리미엄 기능
- 무제한 AI 질문
- 더 많은 노트 생성
- 프로필 커스터마이징
- 광고 제거

📊 학습 통계
- 과목별 공부 시간
- 주간/월간 리포트
- 목표 달성률

🎯 이런 분들께 추천합니다
- 체계적인 학습 관리가 필요한 학생
- 공부 시간을 기록하고 싶은 분
- AI 학습 도우미가 필요한 분
- 친구들과 함께 공부하고 싶은 분

지금 바로 StudyTime과 함께 효율적인 학습을 시작하세요! 🚀
```

---

## ✅ 최종 체크리스트

### 배포 전 확인사항

- [ ] 모든 기능 테스트 완료
- [ ] 버그 수정 완료
- [ ] 개인정보 처리방침 작성
- [ ] 서비스 이용약관 작성
- [ ] 앱 아이콘 준비 (1024x1024)
- [ ] 스크린샷 준비 (각 크기별)
- [ ] 앱 설명 작성 (한글/영문)
- [ ] 서버 API URL 프로덕션으로 변경
- [ ] 결제 시스템 실제 연동
- [ ] 푸시 알림 테스트
- [ ] 크래시 리포팅 설정 (Sentry 등)
- [ ] 앱 버전 확인

### 보안 체크

- [ ] API 키 환경변수 처리
- [ ] 민감한 정보 암호화
- [ ] HTTPS 통신 확인
- [ ] 사용자 데이터 보호

### 성능 최적화

- [ ] 이미지 최적화
- [ ] 번들 크기 최소화
- [ ] 로딩 속도 개선
- [ ] 메모리 누수 확인

---

## 🚀 빠른 배포 명령어

```bash
# 1. 의존성 설치
npm install

# 2. EAS 로그인
eas login

# 3. Android 빌드
eas build --platform android --profile production:aab

# 4. iOS 빌드
eas build --platform ios --profile production

# 5. 자동 제출 (설정 후)
eas submit --platform android
eas submit --platform ios
```

---

## 📞 문제 해결

### 빌드 실패 시
1. `node_modules` 삭제 후 재설치
2. 캐시 클리어: `expo start -c`
3. EAS 재로그인: `eas logout && eas login`

### 심사 거부 시
- 거부 사유 확인
- 수정 후 재제출
- 필요시 심사팀에 답변

---

## 📚 참고 자료

- [Expo 공식 문서](https://docs.expo.dev)
- [EAS Build 가이드](https://docs.expo.dev/build/introduction/)
- [Google Play 출시 가이드](https://support.google.com/googleplay/android-developer)
- [App Store 심사 가이드라인](https://developer.apple.com/app-store/review/guidelines/)

---

**배포 성공을 기원합니다! 🎉**
