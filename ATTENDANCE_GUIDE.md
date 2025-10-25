QMH[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[# 📚 출석체크 시스템 가이드

## 기능 개요

매일 앱 시작 시 자동으로 출석체크 모달이 표시되며, 연속 출석 일수를 추적합니다.

## 주요 기능

### ✅ 자동 모달 표시
- 앱 시작 시 하루에 한 번만 자동으로 표시
- 닫기 버튼으로 언제든지 닫을 수 있음
- 다음날 다시 자동으로 표시

### 📊 출석 통계
- **연속 출석**: 현재 연속으로 출석한 일수
- **최장 기록**: 역대 최장 연속 출석 기록
- **총 출석일**: 전체 출석한 일수

### 📅 주간 캘린더
- 최근 7일간의 출석 현황을 시각적으로 표시
- 체크 표시로 출석한 날 확인
- 오늘 날짜는 파란색으로 강조

### 🔥 연속 출석 메시지
- 연속 출석 시 격려 메시지 표시
- 7일 이상 연속 시 특별 메시지

### 💾 데이터 저장
- 로컬 저장 (AsyncStorage)
- 서버 백업 (MongoDB)
- 오프라인에서도 작동

## 반응형 디자인

### 📱 모바일 (폰)
- 화면 크기에 최적화된 레이아웃
- 작은 글씨와 아이콘
- 세로 스크롤 지원

### 📱 태블릿
- 더 큰 글씨와 여백
- 넓은 화면 활용
- 터치 최적화

## 파일 구조

```
my-app/
├── AttendanceModal.js          # 출석체크 모달 컴포넌트
├── AttendanceExample.js        # 사용 예시
├── main.js                     # 메인 화면에 통합
└── backend/
    ├── models/
    │   └── Attendance.js       # 출석 데이터 모델
    └── routes/
        └── attendance.js       # 출석 API 라우트
```

## API 엔드포인트

### 1. 출석 데이터 조회
```
GET /api/attendance/:userId
```

**응답:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "currentStreak": 5,
    "longestStreak": 10,
    "totalDays": 25,
    "lastCheckIn": "2025-01-23T12:00:00.000Z",
    "checkInDates": ["2025-01-23T12:00:00.000Z", ...]
  }
}
```

### 2. 출석 체크
```
POST /api/attendance/check-in
```

**요청:**
```json
{
  "userId": "user123",
  "currentStreak": 5,
  "longestStreak": 10,
  "totalDays": 25,
  "checkInDates": ["2025-01-23T12:00:00.000Z", ...]
}
```

**응답:**
```json
{
  "success": true,
  "message": "출석체크가 완료되었습니다!",
  "data": {
    "currentStreak": 6,
    "longestStreak": 10,
    "totalDays": 26
  }
}
```

### 3. 출석 통계 조회
```
GET /api/attendance/stats/:userId
```

**응답:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 6,
    "longestStreak": 10,
    "totalDays": 26,
    "thisMonthDays": 15,
    "thisWeekDays": 5,
    "lastCheckIn": "2025-01-23T12:00:00.000Z"
  }
}
```

### 4. 출석 기록 초기화 (테스트용)
```
DELETE /api/attendance/reset/:userId
```

## 사용 방법

### 1. 기본 사용

```javascript
import AttendanceModal from './AttendanceModal';

function MyApp() {
  const [showAttendance, setShowAttendance] = useState(false);
  const userId = 'user123';

  return (
    <View>
      <AttendanceModal
        visible={showAttendance}
        onClose={() => setShowAttendance(false)}
        userId={userId}
      />
    </View>
  );
}
```

### 2. 자동 표시 (main.js에 이미 적용됨)

```javascript
useEffect(() => {
  checkShouldShowAttendance();
}, []);

const checkShouldShowAttendance = async () => {
  const lastShown = await AsyncStorage.getItem('attendance_last_shown');
  const today = new Date().toDateString();
  
  if (lastShown !== today) {
    setShowAttendance(true);
    await AsyncStorage.setItem('attendance_last_shown', today);
  }
};
```

## 연속 출석 로직

### 연속 출석 계산
1. **어제 출석했으면**: 연속 +1
2. **어제 출석 안 했으면**: 연속 1로 초기화
3. **오늘 이미 출석했으면**: 중복 체크 방지

### 최장 기록 갱신
- 현재 연속이 최장 기록보다 크면 갱신

### 총 출석일
- 출석할 때마다 +1

## 커스터마이징

### 색상 변경

```javascript
// AttendanceModal.js의 styles에서 수정
streakNumber: {
  color: '#4CAF50', // 원하는 색상으로 변경
},
```

### 메시지 변경

```javascript
{attendanceData.currentStreak > 0 && (
  <Text>
    🔥 {attendanceData.currentStreak}일 연속 공부했어요!
  </Text>
)}
```

### 표시 조건 변경

```javascript
// 매일 대신 특정 조건에만 표시
if (lastShown !== today && someCondition) {
  setShowAttendance(true);
}
```

## 데이터베이스 스키마

```javascript
{
  userId: ObjectId,           // 사용자 ID
  currentStreak: Number,      // 현재 연속 출석
  longestStreak: Number,      // 최장 연속 기록
  totalDays: Number,          // 총 출석일
  lastCheckIn: Date,          // 마지막 출석 시간
  checkInDates: [Date],       // 출석 날짜 배열
  createdAt: Date,            // 생성 시간
  updatedAt: Date             // 수정 시간
}
```

## 테스트 방법

### 1. 로컬 테스트
```javascript
// AsyncStorage 초기화
await AsyncStorage.removeItem('attendance_last_shown');
await AsyncStorage.removeItem('attendance_user123');

// 앱 재시작하면 모달 표시됨
```

### 2. 서버 테스트
```bash
# 출석 데이터 조회
curl http://localhost:5000/api/attendance/user123

# 출석 체크
curl -X POST http://localhost:5000/api/attendance/check-in \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123"}'

# 출석 기록 초기화
curl -X DELETE http://localhost:5000/api/attendance/reset/user123
```

## 주의사항

1. **userId 필수**: 반드시 유효한 userId를 전달해야 함
2. **중복 체크**: 하루에 한 번만 출석 가능
3. **시간대**: 서버와 클라이언트의 시간대 일치 확인
4. **오프라인**: 로컬 저장 우선, 서버는 백업용

## 문제 해결

### 모달이 표시되지 않음
```javascript
// AsyncStorage 확인
const lastShown = await AsyncStorage.getItem('attendance_last_shown');
console.log('마지막 표시:', lastShown);

// 강제 표시
setShowAttendance(true);
```

### 연속 출석이 초기화됨
- 어제 출석하지 않았는지 확인
- 서버 시간과 클라이언트 시간 확인
- checkInDates 배열 확인

### 서버 저장 실패
- API URL 확인 (localhost vs 프로덕션)
- 네트워크 연결 확인
- 서버 로그 확인

## 향후 개선 사항

- [ ] 출석 보상 시스템 (포인트, 뱃지)
- [ ] 월간 출석 캘린더
- [ ] 친구와 출석 경쟁
- [ ] 출석 알림 (푸시 알림)
- [ ] 출석 통계 차트
- [ ] 출석 스트릭 공유 기능

## 완료! 🎉

출석체크 시스템이 완전히 구현되었습니다!
- 반응형 디자인 ✅
- 로컬 + 서버 저장 ✅
- 연속 출석 추적 ✅
- 자동 모달 표시 ✅
