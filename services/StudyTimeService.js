import AsyncStorage from '@react-native-async-storage/async-storage';

class StudyTimeService {
  constructor() {
    this.studyStartTime = null;
    this.totalStudyTime = 0;
    this.currentLevel = 1;
    this.currentExp = 0;
    this.listeners = [];
    this.backgroundTimer = null;
    this.isRunning = false;
    this.dailyStudyTime = {}; // 날짜별 학습시간 저장 { 'YYYY-MM-DD': minutes }
    this.currentUserEmail = null; // 현재 사용자 이메일
  }

  // 로컬 타임존 기준 YYYY-MM-DD 문자열 반환
  getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 레벨별 필요 경험치 (분 단위) - 점진적으로 증가
  getExpRequiredForLevel(level) {
    if (level <= 1) return 30;        // 레벨 1: 30분 (쉬운 시작)
    if (level <= 5) return level * 60; // 레벨 2-5: 60, 120, 180, 240, 300분
    if (level <= 10) return 300 + (level - 5) * 120; // 레벨 6-10: 420, 540, 660, 780, 900분
    if (level <= 20) return 900 + (level - 10) * 180; // 레벨 11-20: 1080분~2700분
    return 2700 + (level - 20) * 300; // 레벨 21+: 3000분~
  }

  // 현재 레벨의 최대 경험치
  getMaxExpForCurrentLevel() {
    return this.getExpRequiredForLevel(this.currentLevel);
  }

  // 다음 레벨까지 필요한 경험치
  getExpToNextLevel() {
    return this.getMaxExpForCurrentLevel() - this.currentExp;
  }

  // 경험치 진행률 (0-1)
  getExpProgress() {
    const prevLevelExp = this.currentLevel > 1 ? this.getExpRequiredForLevel(this.currentLevel - 1) : 0;
    const currentLevelExp = this.getExpRequiredForLevel(this.currentLevel);
    const expInCurrentLevel = this.currentExp - prevLevelExp;
    const expNeededForCurrentLevel = currentLevelExp - prevLevelExp;
    
    return Math.max(0, Math.min(1, expInCurrentLevel / expNeededForCurrentLevel));
  }

  // 자동 학습 시간 추적 시작
  async startAutoTracking() {
    if (this.isRunning) return;
    
    this.studyStartTime = Date.now();
    this.isRunning = true;
    
    await this.saveData();
    console.log('📚 학습 추적 시작!');
  }

  // 자동 학습 시간 추적 종료
  async endAutoTracking() {
    if (!this.isRunning) return 0;

    const studyDuration = Math.floor((Date.now() - this.studyStartTime) / 1000 / 60); // 분 단위
    this.studyStartTime = null;
    this.isRunning = false;
    
    if (studyDuration > 0) {
      await this.addStudyTime(studyDuration);
    }
    
    console.log(`📚 학습 추적 종료! ${studyDuration}분 학습`);
    return studyDuration;
  }

  // 앱 상태 변화에 따른 자동 처리
  async handleAppStateChange(nextAppState) {
    if (nextAppState === 'active') {
      // 앱이 다시 활성화되면 백그라운드에서 흐른 시간 계산
      await this.calculateBackgroundTime();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // 백그라운드로 갈 때 현재 시간 저장
      await this.saveData();
      console.log('📱 앱이 백그라운드로 이동 - 시간 계속 흐름');
    }
  }

  // 백그라운드에서 흐른 시간 계산
  async calculateBackgroundTime() {
    if (!this.studyStartTime || !this.isRunning) {
      // 처음 시작하는 경우
      await this.startAutoTracking();
      return;
    }

    // 백그라운드에서 흐른 총 시간 계산
    const totalElapsed = Math.floor((Date.now() - this.studyStartTime) / 1000 / 60);
    
    if (totalElapsed > 0) {
      const oldLevel = this.currentLevel;
      const today = this.getLocalDateStr(); // YYYY-MM-DD (로컬 기준)
      
      // 기존 시간에 백그라운드 시간 추가
      this.totalStudyTime += totalElapsed;
      this.currentExp += totalElapsed;
      
      // 오늘 날짜의 학습시간 추가
      this.dailyStudyTime[today] = (this.dailyStudyTime[today] || 0) + totalElapsed;

      // 레벨업 체크
      while (this.currentExp >= this.getExpRequiredForLevel(this.currentLevel)) {
        this.currentLevel++;
      }

      // 새로운 세션 시작
      this.studyStartTime = Date.now();
      await this.saveData();

      // 레벨업 발생 시 알림
      if (this.currentLevel > oldLevel) {
        this.notifyLevelUp(oldLevel, this.currentLevel);
      }

      this.notifyExpGain(totalElapsed);
      
      console.log(`🔄 백그라운드에서 ${totalElapsed}분 흐름 (총 ${this.totalStudyTime}분, 오늘 ${this.dailyStudyTime[today]}분, Lv.${this.currentLevel})`);
    }
  }

  // 학습 시간 추가 (분 단위)
  async addStudyTime(minutes) {
    if (minutes <= 0) return;

    const oldLevel = this.currentLevel;
    const today = this.getLocalDateStr(); // YYYY-MM-DD (로컬 기준)
    
    this.totalStudyTime += minutes;
    this.currentExp += minutes;
    
    // 오늘 날짜의 학습시간 추가
    this.dailyStudyTime[today] = (this.dailyStudyTime[today] || 0) + minutes;

    // 레벨업 체크
    while (this.currentExp >= this.getExpRequiredForLevel(this.currentLevel)) {
      this.currentLevel++;
    }

    await this.saveData();

    // 서버에도 공부시간 저장 (재활성화)
    try {
      const { default: userDataService } = await import('../userDataService.js');
      await userDataService.addStudyTime(minutes);
      console.log(`💾 서버에 ${minutes}분 공부시간 저장 완료`);
    } catch (error) {
      console.error('❌ 서버 공부시간 저장 실패:', error.message || error);
      // 서버 저장 실패해도 로컬 데이터는 유지
    }

    // 레벨업 발생 시 알림
    if (this.currentLevel > oldLevel) {
      this.notifyLevelUp(oldLevel, this.currentLevel);
    }

    this.notifyExpGain(minutes);
    
    console.log(`📚 ${minutes}분 학습 추가! (총 ${this.totalStudyTime}분, 오늘 ${this.dailyStudyTime[today]}분, Lv.${this.currentLevel})`);
  }

  // 레벨업 리스너 등록
  addLevelUpListener(callback) {
    this.listeners.push({ type: 'levelup', callback });
  }

  // 경험치 획득 리스너 등록
  addExpGainListener(callback) {
    this.listeners.push({ type: 'expgain', callback });
  }

  // 리스너 제거
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener.callback !== callback);
  }

  // 레벨업 알림
  notifyLevelUp(oldLevel, newLevel) {
    this.listeners
      .filter(listener => listener.type === 'levelup')
      .forEach(listener => listener.callback(oldLevel, newLevel));
  }

  // 경험치 획득 알림
  notifyExpGain(expGained) {
    this.listeners
      .filter(listener => listener.type === 'expgain')
      .forEach(listener => listener.callback(expGained));
  }

  // 사용자 설정 (로그인 시 호출)
  setCurrentUser(userEmail) {
    if (this.currentUserEmail !== userEmail) {
      console.log(`👤 사용자 변경: ${this.currentUserEmail} → ${userEmail}`);
      this.currentUserEmail = userEmail;
      // 사용자가 변경되면 기존 데이터만 초기화 (레벨은 DB에서 로드됨)
      this.resetDataForUserChange();
    }
  }

  // 사용자 변경 시 데이터 초기화 (레벨은 유지하고 DB에서 로드)
  resetDataForUserChange() {
    this.studyStartTime = null;
    this.isRunning = false;
    this.dailyStudyTime = {};
    // 레벨 관련 데이터는 기본값으로 설정하되 DB에서 덮어씀
    this.totalStudyTime = 0;
    this.currentLevel = 1;
    this.currentExp = 0;
    console.log('🔄 사용자 변경으로 인한 초기화 (DB에서 실제 데이터 로드 예정)');
  }

  // 완전 데이터 초기화 (개발/디버깅용)
  resetData() {
    this.studyStartTime = null;
    this.totalStudyTime = 0;
    this.currentLevel = 1;
    this.currentExp = 0;
    this.isRunning = false;
    this.dailyStudyTime = {};
    console.log('🔄 완전 데이터 초기화');
  }

  // 사용자별 저장 키 생성
  getStorageKey() {
    if (!this.currentUserEmail) {
      console.warn('⚠️ 현재 사용자 이메일이 없습니다. 기본 키 사용');
      return 'studyTimeData_default';
    }
    return `studyTimeData_${this.currentUserEmail}`;
  }

  // 데이터 저장 (사용자별)
  async saveData() {
    try {
      const data = {
        totalStudyTime: this.totalStudyTime,
        currentLevel: this.currentLevel,
        currentExp: this.currentExp,
        studyStartTime: this.studyStartTime,
        isRunning: this.isRunning,
        dailyStudyTime: this.dailyStudyTime,
        userEmail: this.currentUserEmail,
      };
      const storageKey = this.getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`💾 사용자별 데이터 저장: ${storageKey}`);
    } catch (error) {
      console.error('학습 데이터 저장 실패:', error);
    }
  }

  // 데이터 로드 (DB 우선, 로컬은 백업용)
  async loadData() {
    try {
      if (!this.currentUserEmail) {
        console.warn('⚠️ 현재 사용자 이메일이 없어서 데이터를 로드할 수 없습니다.');
        return;
      }

      console.log(`🔄 DB에서 사용자 데이터 로드 시작: ${this.currentUserEmail}`);

      // 1. 먼저 DB에서 최신 데이터 가져오기 (강제 로드)
      await this.loadFromDatabase();
      
      // 2. 서버와 동기화도 실행하여 최신 데이터 확보
      await this.syncWithServer();
        
      // 3. 앱이 종료되었다가 다시 시작된 경우, 백그라운드 시간 계산
      if (this.isRunning && this.studyStartTime) {
        console.log('🔄 앱 재시작 - 백그라운드 시간 계산');
        await this.calculateBackgroundTime();
      }
      
      console.log(`✅ 데이터 로드 완료: Lv.${this.currentLevel}, 경험치 ${this.currentExp}, 총 ${this.totalStudyTime}분`);
    } catch (error) {
      console.error('❌ 학습 데이터 로드 실패:', error);
      // DB 로드 실패 시 로컬 데이터 시도
      await this.loadFromLocalStorage();
    }
  }

  // DB에서 데이터 로드
  async loadFromDatabase() {
    try {
      const { default: userDataService } = await import('../userDataService.js');
      const userData = await userDataService.getUserData();
      
      if (userData && userData.user) {
        const user = userData.user;
        
        // 레벨 시스템 데이터 로드 (DB 데이터를 우선으로 사용)
        if (user.levelSystem) {
          const dbLevel = user.levelSystem.currentLevel || 1;
          const dbExp = user.levelSystem.currentExp || 0;
          const dbTotalTime = user.levelSystem.totalStudyTime || 0;
          
          // DB 데이터를 직접 적용 (DB가 진실의 원천)
          this.currentLevel = dbLevel;
          this.currentExp = dbExp;
          this.totalStudyTime = dbTotalTime;
          
          console.log(`🎯 DB에서 레벨 시스템 로드 완료: Lv.${this.currentLevel}, 경험치 ${this.currentExp}, 총 ${this.totalStudyTime}분`);
        } else {
          console.log('⚠️ DB에 레벨 시스템 데이터가 없음 - 기본값 유지');
          // DB에 데이터가 없으면 기본값으로 초기화
          this.currentLevel = 1;
          this.currentExp = 0;
          this.totalStudyTime = 0;
        }

        // 오늘의 공부시간 로드
        if (user.dailyStudy) {
          const today = this.getLocalDateStr();
          this.dailyStudyTime[today] = user.dailyStudy.totalMinutes || 0;
          console.log(`📅 DB에서 오늘 공부시간 로드: ${this.dailyStudyTime[today]}분`);
        }

        // 주간 공부시간 로드 (과거 7일 그래프 데이터)
        if (user.weeklyStudy && user.weeklyStudy.dailyMinutes) {
          console.log(`📊 DB에서 주간 공부시간 로드 시작...`);
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = this.getLocalDateStr(date);
            const dayOfWeek = date.getDay();
            const dayName = dayNames[dayOfWeek];
            
            const serverMinutes = user.weeklyStudy.dailyMinutes[dayName] || 0;
            console.log(`📊 DB ${dateStr} (${dayName}): ${serverMinutes}분`);
            
            if (serverMinutes > 0) {
              this.dailyStudyTime[dateStr] = serverMinutes;
              console.log(`📊 ✅ ${dateStr} 공부시간 DB에서 로드: ${serverMinutes}분`);
            }
          }
          console.log(`📊 DB에서 주간 공부시간 로드 완료:`, this.dailyStudyTime);
        } else {
          console.log(`📊 ⚠️ DB에 주간 공부시간 데이터가 없음`);
        }

        // 로컬에도 백업 저장
        await this.saveData();
        
        console.log(`✅ DB 데이터 로드 완료: Lv.${this.currentLevel}, 총 ${this.totalStudyTime}분`);
      }
    } catch (error) {
      console.error('❌ DB 데이터 로드 실패:', error);
      throw error;
    }
  }

  // 로컬 스토리지에서 데이터 로드 (백업용)
  async loadFromLocalStorage() {
    try {
      const storageKey = this.getStorageKey();
      const data = await AsyncStorage.getItem(storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.userEmail === this.currentUserEmail) {
          this.totalStudyTime = parsed.totalStudyTime || 0;
          this.currentLevel = parsed.currentLevel || 1;
          this.currentExp = parsed.currentExp || 0;
          this.studyStartTime = parsed.studyStartTime || null;
          this.isRunning = parsed.isRunning || false;
          this.dailyStudyTime = parsed.dailyStudyTime || {};
          console.log(`📱 로컬 백업 데이터 로드: ${storageKey}`);
        }
      }
    } catch (error) {
      console.error('로컬 데이터 로드 실패:', error);
      this.resetData();
    }
  }

  // 서버와 데이터 동기화
  async syncWithServer() {
    try {
      // userDataService를 동적으로 import (순환 의존성 방지)
      const { default: userDataService } = await import('../userDataService.js');
      
      // 서버에서 주간 공부시간 데이터 가져오기
      const serverWeeklyData = await userDataService.getWeeklyStudyTime();
      
      if (serverWeeklyData && serverWeeklyData.weeklyStudy && serverWeeklyData.weeklyStudy.dailyMinutes) {
        console.log('🔄 서버 데이터와 동기화 중...', serverWeeklyData);
        const weeklyData = serverWeeklyData.weeklyStudy;
        
        // 🔥 가장 중요: 오늘의 공부시간 동기화 (dailyStudy 사용)
        const today = this.getLocalDateStr();
        if (serverWeeklyData.dailyStudy && serverWeeklyData.dailyStudy.date === today) {
          const serverTodayMinutes = serverWeeklyData.dailyStudy.totalMinutes || 0;
          const localTodayMinutes = this.dailyStudyTime[today] || 0;
          
          if (serverTodayMinutes > localTodayMinutes) {
            this.dailyStudyTime[today] = serverTodayMinutes;
            console.log(`📅 🔥 오늘 공부시간 동기화: ${localTodayMinutes}분 → ${serverTodayMinutes}분`);
          } else {
            console.log(`📅 로컬 오늘 공부시간이 더 큼: 로컬=${localTodayMinutes}분, 서버=${serverTodayMinutes}분`);
          }
        } else {
          console.log('⚠️ 서버에 오늘의 공부시간 데이터가 없음 또는 날짜 불일치');
        }

        // 주간 데이터 동기화 (과거 7일 그래프 복원)
        console.log('📊 주간 데이터 동기화 시작...');
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = this.getLocalDateStr(date);
          const dayOfWeek = date.getDay();
          const serverDayName = dayNames[dayOfWeek];
          
          const serverMinutes = weeklyData.dailyMinutes[serverDayName] || 0;
          const localMinutes = this.dailyStudyTime[dateStr] || 0;
          
          console.log(`📊 ${dateStr} (${serverDayName}): 서버=${serverMinutes}분, 로컬=${localMinutes}분`);
          
          // 서버에 데이터가 있으면 서버 데이터 사용 (오늘 제외 - 오늘은 위에서 별도 처리)
          if (serverMinutes > 0 && dateStr !== today) {
            this.dailyStudyTime[dateStr] = serverMinutes;
            console.log(`📊 ✅ ${dateStr} 공부시간 복원: ${serverMinutes}분`);
          } else if (dateStr === today) {
            console.log(`📊 ℹ️ ${dateStr}는 오늘이므로 별도 처리됨`);
          } else if (serverMinutes === 0) {
            console.log(`📊 ℹ️ ${dateStr} 서버 데이터 없음`);
          }
        }
        
        // 레벨 시스템 동기화 (서버의 levelSystem 사용 - 절대 초기화 안됨)
        if (serverWeeklyData.levelSystem) {
          const serverLevel = serverWeeklyData.levelSystem;
          console.log('🎯 서버 레벨 시스템 데이터:', serverLevel);
          console.log('🎯 현재 로컬 레벨 데이터:', {
            level: this.currentLevel,
            exp: this.currentExp,
            totalTime: this.totalStudyTime
          });
          
          // 서버 데이터를 직접 적용 (서버가 진실의 원천)
          if (serverLevel.totalStudyTime !== undefined && serverLevel.currentExp !== undefined && serverLevel.currentLevel !== undefined) {
            // 서버 데이터를 직접 적용
            this.totalStudyTime = serverLevel.totalStudyTime;
            this.currentExp = serverLevel.currentExp;
            this.currentLevel = serverLevel.currentLevel;
            console.log(`🎯 서버 레벨 시스템 동기화 완료: 레벨 ${this.currentLevel}, 경험치 ${this.currentExp}, 총 ${this.totalStudyTime}분`);
          }
        } else {
          console.log('⚠️ 서버에 레벨 시스템 데이터가 없음 - 로컬 데이터 유지');
        }

        // (오늘의 공부시간 동기화는 위에서 이미 처리함)
        
        // 동기화된 데이터 저장
        await this.saveData();
      }
    } catch (error) {
      console.error('서버 동기화 실패:', error.message || error);
      // 동기화 실패해도 로컬 데이터는 유지
      // 네트워크 오류나 서버 오류 시에도 앱이 정상 작동하도록 함
    }
  }

  // 현재 상태 반환
  getStatus() {
    return {
      totalStudyTime: this.totalStudyTime,
      currentLevel: this.currentLevel,
      currentExp: this.currentExp,
      expProgress: this.getExpProgress(),
      expToNextLevel: this.getExpToNextLevel(),
      maxExpForCurrentLevel: this.getMaxExpForCurrentLevel(),
    };
  }

  // 레벨별 타이틀 - 50레벨까지 확장
  getLevelTitle(level) {
    const titles = [
      // 초급 (1-10레벨)
      '🌱 새싹 학습자',      // 1레벨 (30분)
      '📚 열정적인 학생',     // 2레벨 (2시간)
      '✏️ 꾸준한 공부벌레',   // 3레벨 (3시간)
      '🎯 집중력 마스터',     // 4레벨 (4시간)
      '⭐ 지식 탐구자',      // 5레벨 (5시간)
      
      // 중급 (6-15레벨)
      '🔥 학습 마스터',      // 6레벨 (7시간)
      '💎 공부의 달인',      // 7레벨 (9시간)
      '🏆 지혜로운 현자',     // 8레벨 (11시간)
      '👑 학문의 거장',      // 9레벨 (13시간)
      '🌟 지식의 왕',       // 10레벨 (15시간)
      
      // 고급 (11-20레벨)
      '🚀 공부 전설',       // 11레벨 (18시간)
      '💫 학습 천재',       // 12레벨 (21시간)
      '🎖️ 지식 수집가',     // 13레벨 (24시간)
      '🏅 학문 올림피언',    // 14레벨 (27시간)
      '🌈 무지개 학자',     // 15레벨 (30시간)
      
      // 전문가 (16-25레벨)
      '🔮 미래의 박사',     // 16레벨 (33시간)
      '🎭 지식 예술가',     // 17레벨 (36시간)
      '🎪 학습 마술사',     // 18레벨 (39시간)
      '🎨 창의적 천재',     // 19레벨 (42시간)
      '🎵 지혜의 음악가',   // 20레벨 (45시간)
      
      // 마스터 (21-30레벨)
      '🌍 글로벌 학자',     // 21레벨 (50시간)
      '🔬 과학자의 길',     // 22레벨 (55시간)
      '📖 도서관의 주인',   // 23레벨 (60시간)
      '🎓 교육의 대가',     // 24레벨 (65시간)
      '💡 아이디어 제왕',   // 25레벨 (70시간)
      
      // 레전드 (31-40레벨)
      '🌌 우주의 지혜',     // 26레벨 (75시간)
      '⚡ 번개 같은 학습',   // 27레벨 (80시간)
      '🏰 지식의 성주',     // 28레벨 (85시간)
      '🗝️ 진리의 열쇠',     // 29레벨 (90시간)
      '👼 학습 천사',       // 30레벨 (95시간)
      
      // 신화 (31-40레벨)
      '🐉 지식의 용',       // 31레벨 (100시간)
      '🦅 지혜의 독수리',   // 32레벨 (105시간)
      '🦄 학습 유니콘',     // 33레벨 (110시간)
      '🔱 지식의 삼지창',   // 34레벨 (115시간)
      '⚔️ 학문의 검성',     // 35레벨 (120시간)
      
      // 전설 (36-45레벨)
      '🌠 별똥별 학자',     // 36레벨 (125시간)
      '🌊 지식의 바다',     // 37레벨 (130시간)
      '🏔️ 학습의 에베레스트', // 38레벨 (135시간)
      '🌋 열정의 화산',     // 39레벨 (140시간)
      '🌙 달빛 현자',       // 40레벨 (145시간)
      
      // 신 (41-50레벨)
      '☀️ 태양신 학자',     // 41레벨 (150시간)
      '⭐ 별의 수호자',     // 42레벨 (155시간)
      '🌌 은하계 마스터',   // 43레벨 (160시간)
      '🪐 행성 정복자',     // 44레벨 (165시간)
      '🌟 우주의 황제',     // 45레벨 (170시간)
      
      // 초월 (46-50레벨)
      '✨ 차원 초월자',     // 46레벨 (175시간)
      '🎆 무한의 존재',     // 47레벨 (180시간)
      '🎇 영원한 학자',     // 48레벨 (185시간)
      '💫 시공간 마스터',   // 49레벨 (190시간)
      '🌈 궁극의 지혜신'    // 50레벨 (195시간)
    ];
    
    if (level <= titles.length) {
      return titles[level - 1];
    }
    return `🏆 레벨 ${level} 초월자`;
  }

  // 최근 7일 학습시간 데이터 반환
  getWeeklyStudyData() {
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = this.getLocalDateStr(date); // YYYY-MM-DD (로컬 기준)
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      const studyTime = this.dailyStudyTime[dateStr] || 0;
      
      weekData.push({
        date: dateStr,
        dayName,
        studyTime, // 분 단위
        isToday: i === 0
      });
    }
    
    return weekData;
  }

  // 통계 데이터 반환
  getStats() {
    const hours = Math.floor(this.totalStudyTime / 60);
    const minutes = this.totalStudyTime % 60;
    
    return {
      totalHours: hours,
      totalMinutes: minutes,
      totalStudyTime: this.totalStudyTime,
      currentLevel: this.currentLevel,
      levelTitle: this.getLevelTitle(this.currentLevel),
      expProgress: this.getExpProgress(),
      expToNextLevel: this.getExpToNextLevel(),
    };
  }
}

export default new StudyTimeService();
