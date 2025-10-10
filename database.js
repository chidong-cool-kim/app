import AsyncStorage from '@react-native-async-storage/async-storage';

// 로컬 데이터베이스 시뮬레이션 (실제로는 Firebase, Supabase 등 사용)
class Database {
  constructor() {
    this.users = [];
    this.userNotes = {};
    this.userPlans = {};
    this.userTimers = {};
    this.initialized = false;
  }

  // 데이터베이스 초기화
  async initialize() {
    if (this.initialized) return;
    
    try {
      // 기존 데이터 로드
      const userData = await AsyncStorage.getItem('app_users');
      const notesData = await AsyncStorage.getItem('app_notes');
      const plansData = await AsyncStorage.getItem('app_plans');
      const timersData = await AsyncStorage.getItem('app_timers');

      this.users = userData ? JSON.parse(userData) : [];
      this.userNotes = notesData ? JSON.parse(notesData) : {};
      this.userPlans = plansData ? JSON.parse(plansData) : {};
      this.userTimers = timersData ? JSON.parse(timersData) : {};
      
      this.initialized = true;
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
      this.initialized = true; // 빈 상태로라도 초기화
    }
  }

  // 사용자 생성
  async createUser(userData) {
    await this.initialize();
    
    const newUser = {
      id: Date.now().toString(),
      email: userData.email,
      username: userData.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEmailVerified: true, // 인증코드 검증 완료 후 생성되므로 true
      ...userData
    };

    // 이메일 중복 확인
    const existingUser = this.users.find(user => user.email === userData.email);
    if (existingUser) {
      throw new Error('이미 존재하는 이메일입니다.');
    }

    this.users.push(newUser);
    await this.saveUsers();
    
    // 사용자별 데이터 초기화
    this.userNotes[newUser.id] = [];
    this.userPlans[newUser.id] = [];
    this.userTimers[newUser.id] = [];
    
    await this.saveAllData();
    
    return newUser;
  }

  // 사용자 조회 (이메일로)
  async getUserByEmail(email) {
    await this.initialize();
    return this.users.find(user => user.email === email);
  }

  // 사용자 조회 (ID로)
  async getUserById(userId) {
    await this.initialize();
    return this.users.find(user => user.id === userId);
  }

  // 사용자 정보 업데이트
  async updateUser(userId, updateData) {
    await this.initialize();
    
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await this.saveUsers();
    return this.users[userIndex];
  }

  // 노트 저장
  async saveNote(userId, noteData) {
    await this.initialize();
    
    if (!this.userNotes[userId]) {
      this.userNotes[userId] = [];
    }

    const note = {
      id: noteData.id || Date.now().toString(),
      title: noteData.title,
      content: noteData.content || '',
      color: noteData.color,
      createdAt: noteData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId
    };

    // 기존 노트 업데이트 또는 새 노트 추가
    const existingIndex = this.userNotes[userId].findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      this.userNotes[userId][existingIndex] = note;
    } else {
      this.userNotes[userId].push(note);
    }

    await this.saveNotes();
    return note;
  }

  // 사용자 노트 조회
  async getUserNotes(userId) {
    await this.initialize();
    return this.userNotes[userId] || [];
  }

  // 노트 삭제
  async deleteNote(userId, noteId) {
    await this.initialize();
    
    if (!this.userNotes[userId]) return false;

    const initialLength = this.userNotes[userId].length;
    this.userNotes[userId] = this.userNotes[userId].filter(note => note.id !== noteId);
    
    if (this.userNotes[userId].length < initialLength) {
      await this.saveNotes();
      return true;
    }
    return false;
  }

  // 플랜 저장
  async savePlan(userId, planData) {
    await this.initialize();
    
    if (!this.userPlans[userId]) {
      this.userPlans[userId] = [];
    }

    const plan = {
      id: planData.id || Date.now().toString(),
      title: planData.title,
      description: planData.description || '',
      date: planData.date,
      completed: planData.completed || false,
      createdAt: planData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId
    };

    const existingIndex = this.userPlans[userId].findIndex(p => p.id === plan.id);
    if (existingIndex >= 0) {
      this.userPlans[userId][existingIndex] = plan;
    } else {
      this.userPlans[userId].push(plan);
    }

    await this.savePlans();
    return plan;
  }

  // 사용자 플랜 조회
  async getUserPlans(userId) {
    await this.initialize();
    return this.userPlans[userId] || [];
  }

  // 타이머 기록 저장
  async saveTimerRecord(userId, timerData) {
    await this.initialize();
    
    if (!this.userTimers[userId]) {
      this.userTimers[userId] = [];
    }

    const timerRecord = {
      id: Date.now().toString(),
      duration: timerData.duration,
      subject: timerData.subject || '공부',
      startTime: timerData.startTime,
      endTime: timerData.endTime,
      createdAt: new Date().toISOString(),
      userId
    };

    this.userTimers[userId].push(timerRecord);
    await this.saveTimers();
    return timerRecord;
  }

  // 사용자 타이머 기록 조회
  async getUserTimers(userId) {
    await this.initialize();
    return this.userTimers[userId] || [];
  }

  // 데이터 저장 메서드들
  async saveUsers() {
    await AsyncStorage.setItem('app_users', JSON.stringify(this.users));
  }

  async saveNotes() {
    await AsyncStorage.setItem('app_notes', JSON.stringify(this.userNotes));
  }

  async savePlans() {
    await AsyncStorage.setItem('app_plans', JSON.stringify(this.userPlans));
  }

  async saveTimers() {
    await AsyncStorage.setItem('app_timers', JSON.stringify(this.userTimers));
  }

  async saveAllData() {
    await Promise.all([
      this.saveUsers(),
      this.saveNotes(),
      this.savePlans(),
      this.saveTimers()
    ]);
  }

  // 전체 데이터 초기화 (개발용)
  async clearAllData() {
    await AsyncStorage.multiRemove(['app_users', 'app_notes', 'app_plans', 'app_timers']);
    this.users = [];
    this.userNotes = {};
    this.userPlans = {};
    this.userTimers = {};
  }
}

// 싱글톤 인스턴스
const database = new Database();
export default database;
