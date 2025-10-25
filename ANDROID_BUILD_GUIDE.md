# Android APK 빌드 가이드

## 수정된 주요 사항

### 1. Gradle 설정
- **AGP 버전**: 8.7.3
- **Kotlin 버전**: 2.1.0
- **Gradle 버전**: 8.14.3
- **compileSdk/targetSdk**: 35
- **minSdk**: 23
- **Java 버전**: 17

### 2. 수정된 파일 목록
- ✅ `android/build.gradle` - 버전 정보 추가
- ✅ `android/app/build.gradle` - Java/Kotlin 호환성 설정
- ✅ `android/gradle.properties` - 빌드 최적화
- ✅ `android/app/proguard-rules.pro` - ProGuard 규칙 추가
- ✅ `android/app/src/main/AndroidManifest.xml` - intent-filter 수정
- ✅ `android/app/src/main/java/com/studytime/app/MainActivity.kt` - BuildConfig 오류 수정
- ✅ `android/app/src/main/java/com/studytime/app/MainApplication.kt` - New Architecture 설정
- ✅ `android/app/src/main/res/drawable/notification_icon.xml` - 알림 아이콘 생성
- ✅ `android/app/src/main/res/values-night/colors.xml` - 다크모드 색상

### 3. 빌드 전 필수 작업

#### 3.1 Android SDK 경로 설정
`android/local.properties` 파일을 생성하고 다음 내용을 추가하세요:

```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

또는 환경변수 설정:
```
ANDROID_HOME=C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
```

#### 3.2 필요한 도구 설치
- **Android Studio** 또는 **Android SDK Command-line Tools**
- **JDK 17** (필수)
- **Node.js** (이미 설치됨)

### 4. 빌드 명령어

#### Debug APK 빌드
```bash
npm run android:build-debug
```
또는
```bash
cd android
.\gradlew assembleDebug
```

생성 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK 빌드
```bash
npm run android:build
```
또는
```bash
cd android
.\gradlew assembleRelease
```

생성 위치: `android/app/build/outputs/apk/release/app-release.apk`

#### Clean 빌드
```bash
npm run android:clean
```

### 5. 빌드 오류 해결

#### 오류 1: SDK 경로를 찾을 수 없음
```
Solution: android/local.properties 파일 생성 및 sdk.dir 설정
```

#### 오류 2: Java 버전 불일치
```
Solution: JDK 17 설치 및 JAVA_HOME 환경변수 설정
```

#### 오류 3: 메모리 부족
```
Solution: gradle.properties에서 org.gradle.jvmargs 메모리 증가 (이미 4GB로 설정됨)
```

#### 오류 4: 의존성 다운로드 실패
```bash
cd android
.\gradlew --refresh-dependencies
```

### 6. 릴리즈 빌드 서명 (선택사항)

현재는 debug keystore를 사용하고 있습니다. 프로덕션 배포를 위해서는:

1. **Keystore 생성**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **android/app/build.gradle 수정**
```gradle
signingConfigs {
    release {
        storeFile file('my-release-key.keystore')
        storePassword 'YOUR_PASSWORD'
        keyAlias 'my-key-alias'
        keyPassword 'YOUR_PASSWORD'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...
    }
}
```

### 7. 빌드 최적화 설정 (이미 적용됨)

- ✅ MultiDex 활성화
- ✅ Gradle 캐싱 활성화
- ✅ Parallel 빌드 활성화
- ✅ ProGuard 규칙 설정
- ✅ AndroidX 활성화
- ✅ Jetifier 활성화

### 8. 테스트 실행

```bash
# 에뮬레이터 실행
npm run android

# 또는 직접 설치
cd android
.\gradlew installDebug
```

### 9. 주의사항

1. **API 키 보안**: 제공하신 API 키는 환경변수로 관리하세요
2. **Release 빌드**: 프로덕션 배포 전 반드시 자체 keystore 생성
3. **권한 확인**: AndroidManifest.xml의 권한이 필요한 기능과 일치하는지 확인
4. **테스트**: 실제 기기에서 테스트 권장

### 10. 문제 발생 시 체크리스트

- [ ] `android/local.properties` 파일 존재 및 SDK 경로 확인
- [ ] JDK 17 설치 확인 (`java -version`)
- [ ] Android SDK 설치 확인
- [ ] `node_modules` 재설치 (`npm install`)
- [ ] Gradle 캐시 정리 (`cd android && .\gradlew clean`)
- [ ] 빌드 도구 버전 확인 (Android SDK Build-Tools 35.0.0)

## 빌드 성공 후

APK 파일 위치:
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

이 APK를 Android 기기에 설치하여 테스트할 수 있습니다.
