# Android APK 빌드 체크리스트

## ✅ 완료된 수정 사항

### Gradle 설정
- [x] `android/build.gradle` - AGP 8.7.3, Kotlin 2.1.0, SDK 버전 설정
- [x] `android/app/build.gradle` - Java 17, Kotlin 17, MultiDex, BuildConfig 활성화
- [x] `android/gradle.properties` - 메모리 최적화 (4GB), 캐싱, 병렬 빌드
- [x] `android/gradle/wrapper/gradle-wrapper.properties` - Gradle 8.14.3 (확인됨)

### Android 설정
- [x] `android/app/src/main/AndroidManifest.xml` - intent-filter 구조 수정
- [x] `android/app/proguard-rules.pro` - ProGuard 규칙 추가

### Kotlin 코드
- [x] `MainActivity.kt` - BuildConfig.IS_NEW_ARCHITECTURE_ENABLED → fabricEnabled
- [x] `MainApplication.kt` - isNewArchEnabled = false 설정

### 리소스 파일
- [x] `res/drawable/notification_icon.xml` - 알림 아이콘 생성
- [x] `res/values-night/colors.xml` - 다크모드 색상 추가

### 프로젝트 설정
- [x] `package.json` - 빌드 스크립트 추가
- [x] `.gitignore` - .env 파일 보안 설정
- [x] `.env.example` - 환경변수 템플릿 생성

### 문서
- [x] `ANDROID_BUILD_GUIDE.md` - 상세 빌드 가이드
- [x] `BUILD_CHECKLIST.md` - 이 체크리스트

---

## 📋 빌드 전 필수 작업

### 1. Android SDK 설정
```bash
# android/local.properties 파일 생성 필요
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

**또는 환경변수 설정:**
```
ANDROID_HOME=C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
```

### 2. JDK 17 확인
```bash
java -version
# 출력: openjdk version "17.x.x" 또는 java version "17.x.x"
```

JDK 17이 없으면 설치:
- https://adoptium.net/ (Eclipse Temurin 17 권장)

### 3. 환경변수 설정 (선택사항)
```bash
# .env 파일 생성 (.env.example 참고)
cp .env.example .env
# 그리고 실제 API 키로 수정
```

---

## 🚀 빌드 명령어

### Debug APK (개발/테스트용)
```bash
npm run android:build-debug
```
**출력:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (배포용)
```bash
npm run android:build
```
**출력:** `android/app/build/outputs/apk/release/app-release.apk`

### Clean 빌드
```bash
npm run android:clean
```

---

## 🔧 예상 오류 및 해결방법

### 오류 1: SDK location not found
```
❌ SDK location not found. Define location with an ANDROID_HOME environment variable
   or by setting the sdk.dir path in your project's local properties file
```

**해결:**
```bash
# android/local.properties 파일 생성
echo "sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk" > android/local.properties
```

### 오류 2: Java version 불일치
```
❌ Unsupported Java version
```

**해결:**
- JDK 17 설치
- JAVA_HOME 환경변수 설정

### 오류 3: Gradle daemon 메모리 부족
```
❌ OutOfMemoryError
```

**해결:** 이미 `gradle.properties`에서 4GB로 설정됨. 더 필요하면:
```properties
org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=1536m
```

### 오류 4: 의존성 다운로드 실패
```bash
cd android
.\gradlew --refresh-dependencies
.\gradlew clean
.\gradlew assembleDebug
```

### 오류 5: BuildConfig 생성 안됨
**해결:** 이미 `buildFeatures { buildConfig = true }` 추가됨

---

## 🎯 빌드 성공 확인

빌드가 성공하면:
```
BUILD SUCCESSFUL in XXs
```

APK 위치:
- **Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📱 APK 설치 및 테스트

### 에뮬레이터에 설치
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 실제 기기에 설치
1. 기기의 USB 디버깅 활성화
2. USB 연결
3. 위 명령어 실행 또는 APK 파일을 기기로 전송하여 설치

---

## ⚠️ 프로덕션 배포 시 주의사항

### 1. Release Keystore 생성 (필수)
현재는 debug keystore 사용 중. 프로덕션 배포 전:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. build.gradle 수정
```gradle
signingConfigs {
    release {
        storeFile file('my-release-key.keystore')
        storePassword 'YOUR_PASSWORD'
        keyAlias 'my-key-alias'
        keyPassword 'YOUR_PASSWORD'
    }
}
```

### 3. API 키 보안
- ❌ 코드에 하드코딩 금지
- ✅ 환경변수 사용
- ✅ .env 파일 gitignore 처리됨

### 4. ProGuard/R8 최적화
- 이미 ProGuard 규칙 설정됨
- Release 빌드 시 자동 적용

---

## 📊 빌드 설정 요약

| 항목 | 값 |
|------|-----|
| Gradle | 8.14.3 |
| AGP | 8.7.3 |
| Kotlin | 2.1.0 |
| Java | 17 |
| compileSdk | 35 |
| targetSdk | 35 |
| minSdk | 23 |
| React Native | 0.81.4 |
| Expo | 54.0.13 |
| New Architecture | Disabled |
| Hermes | Disabled (JSC 사용) |

---

## 🆘 추가 도움이 필요한 경우

1. **Gradle 로그 확인**
```bash
cd android
.\gradlew assembleDebug --stacktrace --info
```

2. **캐시 완전 삭제**
```bash
cd android
.\gradlew clean
rm -rf .gradle
rm -rf app/build
```

3. **Node modules 재설치**
```bash
rm -rf node_modules
npm install
```

---

## ✨ 수정된 파일 목록

```
android/
├── build.gradle ✅ 수정
├── gradle.properties ✅ 수정
├── app/
│   ├── build.gradle ✅ 수정
│   ├── proguard-rules.pro ✅ 수정
│   └── src/main/
│       ├── AndroidManifest.xml ✅ 수정
│       ├── java/com/studytime/app/
│       │   ├── MainActivity.kt ✅ 수정
│       │   └── MainApplication.kt ✅ 수정
│       └── res/
│           ├── drawable/
│           │   └── notification_icon.xml ✅ 생성
│           └── values-night/
│               └── colors.xml ✅ 수정

프로젝트 루트/
├── package.json ✅ 수정
├── .gitignore ✅ 수정
├── .env.example ✅ 생성
├── ANDROID_BUILD_GUIDE.md ✅ 생성
└── BUILD_CHECKLIST.md ✅ 생성
```

---

**모든 수정 완료! 이제 빌드를 시작할 수 있습니다.** 🎉
