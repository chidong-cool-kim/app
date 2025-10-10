# PDF 기능 설정 가이드

PDF 노트 기능을 사용하기 위해 다음 라이브러리들을 설치해야 합니다.

## 필수 라이브러리 설치

```bash
# 문서 선택기 (PDF 파일 선택용)
npm install react-native-document-picker

# 파일 시스템 (파일 관리용)
npm install react-native-fs

# PDF 뷰어 (선택사항 - 더 나은 PDF 보기 경험을 위해)
npm install react-native-pdf
```

## iOS 설정

### 1. Podfile 업데이트
```bash
cd ios && pod install
```

### 2. Info.plist 권한 추가
`ios/YourApp/Info.plist`에 다음 권한을 추가하세요:

```xml
<key>NSDocumentPickerUsageDescription</key>
<string>PDF 파일을 선택하기 위해 문서 접근 권한이 필요합니다.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>PDF 파일을 저장하기 위해 사진 라이브러리 접근 권한이 필요합니다.</string>
```

## Android 설정

### 1. android/app/src/main/AndroidManifest.xml 권한 추가
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 2. Proguard 설정 (필요시)
`android/app/proguard-rules.pro`에 추가:
```
-keep class com.** { *; }
```

## 사용법

1. **새 PDF 노트 생성**: 메인 화면에서 "+" 버튼 → "PDF 노트" 선택
2. **PDF 파일 선택**: "PDF 파일 선택" 버튼을 눌러 기기에서 PDF 파일 선택
3. **노트 저장**: 선택한 PDF 파일이 노트로 저장됩니다
4. **PDF 보기**: 저장된 PDF 노트를 클릭하면 PDF 뷰어에서 확인 가능

## 주의사항

- PDF 파일은 앱 내부 저장소에 복사되어 저장됩니다
- 큰 PDF 파일의 경우 로딩 시간이 걸릴 수 있습니다
- iOS와 Android에서 PDF 보기 방식이 다를 수 있습니다

## 문제 해결

### 라이브러리 설치 후 빌드 오류가 발생하는 경우:
```bash
# 캐시 정리
npx react-native start --reset-cache

# iOS
cd ios && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..

# 다시 빌드
npx react-native run-ios
# 또는
npx react-native run-android
```
