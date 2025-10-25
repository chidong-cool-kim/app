# 🚀 StudyTime 앱 배포 빠른 시작 가이드

## 📌 전체 흐름 요약

```
1. MongoDB Atlas 설정 (무료 DB)
   ↓
2. Railway 배포 (백엔드 서버)
   ↓
3. 환경변수 설정
   ↓
4. 앱에서 Railway URL 연결
   ↓
5. 앱 빌드 및 스토어 배포
```

---

## ⚡ 1단계: MongoDB Atlas (5분)

### 할 일:
1. https://www.mongodb.com/cloud/atlas 접속
2. 무료 계정 생성
3. **Create Cluster** → **FREE (M0)** 선택
4. Region: **Seoul** 선택
5. **Create** 클릭

### 연결 문자열 얻기:
1. **Connect** 버튼 클릭
2. **Connect your application** 선택
3. 연결 문자열 복사:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studytime
   ```
4. 📋 **메모장에 저장** (나중에 사용)

---

## ⚡ 2단계: Railway 배포 (10분)

### 할 일:
1. https://railway.app 접속
2. **GitHub 계정**으로 로그인
3. **New Project** 클릭
4. **Deploy from GitHub repo** 선택
5. 저장소 선택 후 **Deploy** 클릭

### 중요 설정:
- **Root Directory**: `backend` 입력
- **Start Command**: `node server.js`

---

## ⚡ 3단계: Railway 환경변수 설정 (5분)

Railway 대시보드에서:

1. **Variables** 탭 클릭
2. 다음 변수들 추가:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studytime
JWT_SECRET=my-super-secret-key-12345
PORT=5000
ALLOWED_ORIGINS=*
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
OPENAI_API_KEY=sk-your-openai-key
```

3. **Save** 클릭

---

## ⚡ 4단계: Railway URL 확인 (1분)

1. Railway 대시보드 → **Settings** 탭
2. **Domains** 섹션에서 URL 복사
   - 예: `https://studytime-production.up.railway.app`
3. 📋 **메모장에 저장**

---

## ⚡ 5단계: 앱에서 Railway URL 연결 (2분)

### `app.json` 파일 수정:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://studytime-production.up.railway.app"
    }
  }
}
```

**Railway URL을 여기에 붙여넣기!**

---

## ⚡ 6단계: 테스트 (3분)

### 앱 재시작:
```bash
npm start
```

### 확인 사항:
- [ ] 로그인 작동
- [ ] 데이터 로드
- [ ] AI 기능 작동
- [ ] 스터디그룹 작동

---

## ⚡ 7단계: 앱 빌드 (30분)

### Android APK 빌드:
```bash
# EAS CLI 설치
npm install -g eas-cli

# 로그인
eas login

# 빌드
eas build --platform android --profile production:aab
```

### iOS 빌드:
```bash
eas build --platform ios --profile production
```

---

## 🔧 문제 해결

### "API 연결 실패" 에러
→ `app.json`의 Railway URL 확인

### "Database connection failed" 에러
→ Railway 환경변수의 `MONGODB_URI` 확인

### "CORS 에러"
→ Railway 환경변수에 `ALLOWED_ORIGINS=*` 추가

---

## 📞 도움이 필요하면

1. Railway 로그 확인:
   ```bash
   railway logs
   ```

2. MongoDB Atlas 연결 테스트:
   - Network Access에서 `0.0.0.0/0` 추가

3. 앱 로그 확인:
   ```bash
   npx expo start
   ```

---

## ✅ 최종 체크리스트

배포 전:
- [ ] MongoDB Atlas 클러스터 생성
- [ ] Railway 프로젝트 생성
- [ ] Railway 환경변수 설정
- [ ] `app.json`에 Railway URL 추가
- [ ] 앱에서 테스트 완료

배포 후:
- [ ] Google Play Console 계정 생성
- [ ] Apple Developer 계정 생성
- [ ] 앱 아이콘 준비
- [ ] 스크린샷 준비
- [ ] 앱 설명 작성

---

## 🎯 예상 소요 시간

| 단계 | 시간 |
|------|------|
| MongoDB Atlas 설정 | 5분 |
| Railway 배포 | 10분 |
| 환경변수 설정 | 5분 |
| 앱 연결 | 2분 |
| 테스트 | 3분 |
| 앱 빌드 | 30분 |
| **총 소요 시간** | **약 1시간** |

---

**준비됐나요? 시작하세요! 🚀**

더 자세한 내용은:
- `RAILWAY_DEPLOYMENT.md` - Railway 상세 가이드
- `DEPLOYMENT_GUIDE.md` - 앱 스토어 배포 가이드
