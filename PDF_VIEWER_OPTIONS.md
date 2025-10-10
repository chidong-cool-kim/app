# 앱 내부에서 PDF 보기 옵션들

## 1. 📱 PDF 뷰어 앱 설치 후 연동

### Android 추천 PDF 뷰어:
- **Adobe Acrobat Reader** - 가장 호환성 좋음
- **Google PDF Viewer** - 안드로이드 기본
- **WPS Office** - 무료, 빠름
- **Foxit PDF Reader** - 가벼움

### iOS 추천 PDF 뷰어:
- **Adobe Acrobat Reader**
- **PDF Expert** - 유료, 고성능
- **GoodReader** - 전문가용
- **Safari** - iOS 기본 브라우저

## 2. 🔧 앱 내부 연동 방법들

### A. Intent/URL Scheme 방식
```javascript
// Android Intent
const androidIntent = `intent:${pdfUri}#Intent;type=application/pdf;action=android.intent.action.VIEW;end`;
await Linking.openURL(androidIntent);

// iOS URL Scheme
const iosScheme = `adobereader://pdf?url=${encodeURIComponent(pdfUri)}`;
await Linking.openURL(iosScheme);
```

### B. 파일 공유 방식
```javascript
import * as Sharing from 'expo-sharing';

// 파일 공유로 PDF 뷰어 선택
await Sharing.shareAsync(pdfUri, {
  mimeType: 'application/pdf',
  dialogTitle: 'PDF 뷰어 선택'
});
```

### C. WebView + PDF.js 방식
```javascript
// PDF.js 온라인 뷰어 사용
const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUri)}`;
```

## 3. 🚀 추천 구현 방법

### 방법 1: 다중 PDF 뷰어 지원
```javascript
const openPdfWithMultipleOptions = async (pdfUri) => {
  const options = [
    { name: 'Adobe Reader', scheme: `adobereader://pdf?url=${pdfUri}` },
    { name: 'WPS Office', scheme: `wps://openfile?path=${pdfUri}` },
    { name: '기본 뷰어', scheme: pdfUri }
  ];
  
  for (const option of options) {
    try {
      const supported = await Linking.canOpenURL(option.scheme);
      if (supported) {
        await Linking.openURL(option.scheme);
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  Alert.alert('알림', 'PDF 뷰어 앱을 설치해주세요.');
};
```

### 방법 2: 파일 공유 방식 (가장 안전)
```javascript
import * as Sharing from 'expo-sharing';

const sharePdf = async (pdfUri) => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'PDF로 열기'
      });
    }
  } catch (error) {
    Alert.alert('오류', 'PDF를 공유할 수 없습니다.');
  }
};
```

## 4. 📋 설치 가이드

### 필요한 패키지:
```bash
# 파일 공유용
npx expo install expo-sharing

# 문서 선택용 (이미 설치됨)
npx expo install expo-document-picker

# WebView용 (이미 설치됨)
npx expo install react-native-webview
```

### app.json 권한 설정:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## 5. 🎯 사용자 가이드

### Android 사용자:
1. **Google Play Store**에서 "Adobe Acrobat Reader" 설치
2. 또는 "WPS Office" 설치 (무료)
3. 앱에서 PDF 선택 → "PDF 열기" 버튼 클릭
4. 설치된 PDF 뷰어에서 자동 열림

### iOS 사용자:
1. **App Store**에서 "Adobe Acrobat Reader" 설치
2. 또는 Safari 기본 사용
3. 앱에서 PDF 선택 → "PDF 열기" 버튼 클릭
4. 설치된 PDF 뷰어에서 자동 열림

## 6. ⚡ 최적화 팁

### 빠른 PDF 열기:
- Adobe Reader가 가장 빠르고 안정적
- WPS Office는 가볍고 무료
- Google PDF Viewer는 안드로이드 기본

### 호환성 최대화:
- 여러 PDF 뷰어 앱 지원
- 실패 시 다음 앱으로 자동 전환
- 최후에는 시스템 기본 뷰어 사용

## 7. 🔍 문제 해결

### PDF가 안 열릴 때:
1. PDF 뷰어 앱 설치 확인
2. 파일 권한 확인
3. 파일 경로 확인
4. 앱 재시작

### 권장 해결 순서:
1. Adobe Acrobat Reader 설치
2. 앱 권한 허용
3. PDF 파일 다시 선택
4. "PDF 열기" 버튼 클릭
