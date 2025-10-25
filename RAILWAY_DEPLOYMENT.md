# 🚂 Railway 백엔드 배포 가이드

## 📋 순서대로 따라하기

### **1단계: Railway 계정 생성**

1. https://railway.app 접속
2. **"Start a New Project"** 클릭
3. **GitHub 계정**으로 로그인
4. 무료 플랜 선택 ($5 크레딧 제공)

---

### **2단계: MongoDB Atlas 설정** (데이터베이스)

1. https://www.mongodb.com/cloud/atlas 접속
2. 무료 계정 생성
3. **Create a New Cluster** 클릭
4. **FREE (M0)** 선택
5. Region: **Seoul (ap-northeast-2)** 선택
6. Cluster Name: `studytime-db`
7. **Create Cluster** 클릭

#### MongoDB 연결 문자열 얻기:
1. **Connect** 버튼 클릭
2. **Connect your application** 선택
3. **Connection String** 복사
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/studytime?retryWrites=true&w=majority
   ```
4. `<username>`과 `<password>`를 실제 값으로 변경

---

### **3단계: 백엔드 폴더에 필수 파일 생성**

#### 3-1. `.gitignore` 파일 생성

`backend/.gitignore`:
```
node_modules/
.env
uploads/
*.log
.DS_Store
```

#### 3-2. `.env.example` 파일 생성

`backend/.env.example`:
```env
# MongoDB 연결 문자열
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studytime

# JWT 시크릿 키
JWT_SECRET=your-super-secret-jwt-key-change-this

# 이메일 설정 (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# 서버 포트
PORT=5000

# CORS 허용 도메인
ALLOWED_ORIGINS=http://localhost:8081,exp://192.168.45.53:8081

# OpenAI API Key (AI 기능용)
OPENAI_API_KEY=your-openai-api-key
```

#### 3-3. `Procfile` 생성 (Railway용)

`backend/Procfile`:
```
web: node server.js
```

---

### **4단계: backend/server.js 환경변수 설정 확인**

`server.js` 파일이 환경변수를 사용하는지 확인:

```javascript
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'];
```

---

### **5단계: Railway에 프로젝트 배포**

#### 방법 1: GitHub 연동 (권장)

1. **GitHub에 코드 푸시**
   ```bash
   cd c:\App\my-app
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/studytime.git
   git push -u origin main
   ```

2. **Railway에서 GitHub 연동**
   - Railway 대시보드에서 **"New Project"**
   - **"Deploy from GitHub repo"** 선택
   - 저장소 선택: `studytime`
   - Root Directory: `backend` 입력
   - **Deploy** 클릭

#### 방법 2: Railway CLI 사용

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 초기화
cd c:\App\my-app\backend
railway init

# 배포
railway up
```

---

### **6단계: Railway 환경변수 설정**

1. Railway 대시보드에서 프로젝트 선택
2. **Variables** 탭 클릭
3. 다음 환경변수 추가:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/studytime
JWT_SECRET=your-super-secret-jwt-key-12345
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
PORT=5000
ALLOWED_ORIGINS=*
OPENAI_API_KEY=sk-your-openai-api-key
```

4. **Add** 버튼 클릭하여 각 변수 저장

---

### **7단계: Railway 도메인 확인**

1. **Settings** 탭 클릭
2. **Domains** 섹션에서 자동 생성된 URL 확인
   - 예: `https://studytime-production.up.railway.app`
3. 이 URL을 복사

---

### **8단계: 앱에서 Railway URL 사용**

#### 8-1. `app.json` 수정

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://studytime-production.up.railway.app"
    }
  }
}
```

#### 8-2. Railway URL로 변경된 것 확인

`config/api.js` 파일이 자동으로 Railway URL을 사용합니다:
```javascript
const PRODUCTION_API_URL = Constants.expoConfig?.extra?.apiUrl;
```

---

### **9단계: 배포 확인**

1. **Railway 로그 확인**
   ```bash
   railway logs
   ```

2. **API 테스트**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

3. **앱에서 테스트**
   - 앱 재시작
   - 로그인 시도
   - 데이터 로드 확인

---

## 🔧 문제 해결

### 배포 실패 시

1. **로그 확인**
   ```bash
   railway logs
   ```

2. **환경변수 확인**
   - Railway 대시보드 > Variables
   - 모든 필수 변수가 설정되었는지 확인

3. **빌드 재시작**
   - Railway 대시보드 > Deployments
   - **Redeploy** 클릭

### CORS 에러 발생 시

`backend/server.js`에서 CORS 설정 확인:
```javascript
const cors = require('cors');

app.use(cors({
  origin: '*', // 또는 특정 도메인
  credentials: true
}));
```

### MongoDB 연결 실패 시

1. MongoDB Atlas에서 **Network Access** 확인
2. **IP Whitelist**에 `0.0.0.0/0` 추가 (모든 IP 허용)

---

## 📊 Railway 모니터링

### 리소스 사용량 확인
- Railway 대시보드 > **Metrics**
- CPU, 메모리, 네트워크 사용량 확인

### 로그 실시간 확인
```bash
railway logs --follow
```

### 배포 히스토리
- Railway 대시보드 > **Deployments**
- 이전 버전으로 롤백 가능

---

## 💰 비용 관리

### 무료 플랜
- $5 크레딧/월
- 500시간 실행 시간
- 100GB 아웃바운드 트래픽

### 비용 절감 팁
1. **Sleep Mode** 활성화 (비활성 시 자동 종료)
2. 불필요한 로그 최소화
3. 이미지 최적화

---

## 🔄 업데이트 배포

### GitHub 연동 시 (자동 배포)
```bash
git add .
git commit -m "Update features"
git push origin main
```
→ Railway가 자동으로 재배포

### Railway CLI 사용
```bash
cd backend
railway up
```

---

## 📝 체크리스트

배포 전 확인:
- [ ] MongoDB Atlas 클러스터 생성
- [ ] MongoDB 연결 문자열 복사
- [ ] Railway 계정 생성
- [ ] GitHub 저장소 생성 (선택)
- [ ] `.env.example` 파일 작성
- [ ] `.gitignore` 파일 작성
- [ ] Railway 환경변수 설정
- [ ] CORS 설정 확인
- [ ] `app.json`에 Railway URL 추가
- [ ] 배포 후 API 테스트

---

## 🎯 다음 단계

1. ✅ Railway 백엔드 배포 완료
2. ✅ MongoDB Atlas 연결
3. ✅ 환경변수 설정
4. ✅ 앱에서 Railway URL 사용
5. 📱 앱 빌드 및 스토어 배포

---

**Railway 배포 성공! 🎉**

이제 앱이 실제 서버와 연결되어 작동합니다!
