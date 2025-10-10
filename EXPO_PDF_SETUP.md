# Expo PDF 기능 설정 가이드

Expo 환경에서 PDF 노트 기능을 사용하기 위한 설정입니다.

## 필수 라이브러리 설치

```bash
# Expo 문서 선택기 (이미 설치됨)
npx expo install expo-document-picker

# Expo 파일 시스템 (이미 설치됨)
npx expo install expo-file-system

# WebView (PDF 뷰어용 - 필수)
npx expo install react-native-webview

# Expo 공유 기능 (선택사항 - PDF 공유용)
npx expo install expo-sharing
```

## app.json 설정 확인

`app.json` 파일에 다음 설정이 포함되어 있는지 확인:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-document-picker",
        {
          "iCloudContainerEnvironment": "Production"
        }
      ]
    ],
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## 사용법

1. **PDF 파일 선택**: 
   - `expo-document-picker`를 사용하여 기기에서 PDF 파일 선택
   - 자동으로 앱 캐시 디렉토리에 복사됨

2. **PDF 파일 열기**:
   - `Linking.openURL()`을 사용하여 외부 PDF 뷰어로 열기
   - 지원되지 않는 경우 파일 공유 옵션 제공

3. **노트 저장**:
   - 선택한 PDF 파일 정보를 JSON으로 저장
   - 메인 화면에서 "PDF" 배지로 표시

## 주요 변경사항

- `react-native-document-picker` → `expo-document-picker`
- `react-native-fs` → `expo-file-system`
- 권한 관리 간소화 (Expo가 자동 처리)
- 플랫폼별 파일 처리 최적화

## 문제 해결

### PDF가 열리지 않는 경우:
1. 기기에 PDF 뷰어 앱 설치 확인
2. 파일 권한 확인
3. 앱 재시작 후 다시 시도

### 파일 선택이 안 되는 경우:
```bash
# 캐시 정리 후 재시작
npx expo start --clear
```

## 지원 플랫폼

- ✅ Android (API 21+)
- ✅ iOS (13.0+)
- ✅ Expo Go
- ✅ Development Build
