const mongoose = require('mongoose');

// 노트 스키마
const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// AI 대화 내역 스키마 (최근 50개, 12시 이후 제거)
const aiChatSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

// 플래너 스키마
const plannerSchema = new mongoose.Schema({
    date: {
        type: String, // YYYY-MM-DD 형식
        required: true,
    },
    tasks: [{
        title: String,
        completed: {
            type: Boolean,
            default: false,
        },
        time: String,
        memo: String,
        alarm: {
            time: Date,
            type: String, // 'notification' 등
        },
    }],
    memo: String,
});

// 주간 공부 시간 (월요일~일요일, 매일 자정 초기화)
const weeklyStudySchema = new mongoose.Schema({
    weekStart: {
        type: String, // YYYY-MM-DD 형식 (해당 주의 월요일)
        required: true,
    },
    dailyMinutes: {
        monday: { type: Number, default: 0 },
        tuesday: { type: Number, default: 0 },
        wednesday: { type: Number, default: 0 },
        thursday: { type: Number, default: 0 },
        friday: { type: Number, default: 0 },
        saturday: { type: Number, default: 0 },
        sunday: { type: Number, default: 0 },
    },
    totalMinutes: {
        type: Number,
        default: 0,
    },
    sessions: [{
        date: String, // YYYY-MM-DD
        startTime: Date,
        endTime: Date,
        minutes: Number,
    }],
});

// 레벨 시스템 (영구 저장)
const levelSystemSchema = new mongoose.Schema({
    currentLevel: {
        type: Number,
        default: 1,
    },
    currentExp: {
        type: Number,
        default: 0,
    },
    totalStudyTime: {
        type: Number,
        default: 0,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

// 메인 유저 스키마
const userSchema = new mongoose.Schema({
    // 기본 정보
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: function() {
            return this.provider === 'email';
        },
    },
    provider: {
        type: String,
        enum: ['email', 'google', 'gmail', 'kakao', 'naver', 'apple'],
        default: 'email',
    },
    providerId: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    profileImage: {
        type: String,
        default: null,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    // 관리자 권한
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },

    // 밴 관련 정보
    banInfo: {
        isBanned: {
            type: Boolean,
            default: false,
        },
        banType: {
            type: String,
            enum: ['temporary', 'permanent', null],
            default: null,
        },
        banReason: {
            type: String,
            default: null,
        },
        banStartDate: {
            type: Date,
            default: null,
        },
        banEndDate: {
            type: Date,
            default: null,
        },
        bannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },

    // 노트 (여러 개)
    notes: [noteSchema],

    // AI 대화 내역 (최근 50개만 유지, 매일 초기화 안함)
    aiChats: {
        type: [aiChatSchema],
        validate: [arrayLimit, '최대 50개의 대화만 저장됩니다.'],
    },

    // 플래너
    planners: [plannerSchema],

    // 주간 공부 시간 (매일 자정 초기화)
    weeklyStudy: weeklyStudySchema,
    weeklyStudyLastReset: {
        type: Date,
        default: Date.now,
    },

    // 오늘의 공부시간 (매일 자정 초기화)
    dailyStudy: {
        date: {
            type: String, // YYYY-MM-DD 형식
            default: () => new Date().toISOString().split('T')[0]
        },
        totalMinutes: {
            type: Number,
            default: 0
        },
        sessions: [{
            startTime: Date,
            endTime: Date,
            minutes: Number,
        }]
    },

    // 레벨 시스템 (영구 저장 - 절대 초기화 안됨)
    levelSystem: levelSystemSchema,

    // 구독 정보
    subscription: {
        planId: String,
        planName: String,
        price: String,
        aiQuestions: Number,
        aiModel: String,
        productId: String,
        transactionId: String,
        purchaseToken: String,
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: false,
        },
        grantedBy: String, // 관리자가 부여한 경우 관리자 이메일
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },

    // AI 사용량
    aiUsage: {
        questionsUsed: {
            type: Number,
            default: 0,
        },
        lastResetDate: {
            type: Date,
            default: Date.now,
        },
    },

    // 메시지 (관리자가 보낸 메시지들)
    messages: [{
        id: String,
        title: String,
        content: String,
        type: {
            type: String,
            enum: ['notice', 'warning', 'info', 'promotion'],
            default: 'info'
        },
        recipientEmail: String,
        senderEmail: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        isRead: {
            type: Boolean,
            default: false
        }
    }],

    // 노트 공유 초대 목록
    invitations: [{
        id: String,
        type: {
            type: String,
            default: 'NOTE_INVITATION'
        },
        fromUser: {
            email: String,
            username: String,
            name: String
        },
        toUser: {
            email: String,
            username: String,
            name: String
        },
        roomId: String,
        noteTitle: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        }
    }],

    // 마지막 활동 시간 (온라인 상태 판단용)
    lastActivity: {
        type: Date,
        default: Date.now,
    },

    // 생성/수정 시간
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// AI 대화 50개 제한
function arrayLimit(val) {
    return val.length <= 50;
}

// 레벨별 필요 경험치 계산 (StudyTimeService와 동일한 공식)
userSchema.methods.getExpRequiredForLevel = function(level) {
    if (level <= 1) return 30;        // 레벨 1: 30분 (쉬운 시작)
    if (level <= 5) return level * 60; // 레벨 2-5: 60, 120, 180, 240, 300분
    if (level <= 10) return 300 + (level - 5) * 120; // 레벨 6-10: 420, 540, 660, 780, 900분
    if (level <= 20) return 900 + (level - 10) * 180; // 레벨 11-20: 1080분~2700분
    return 2700 + (level - 20) * 300; // 레벨 21+: 3000분~
};

// 일일 데이터 초기화 메서드 (레벨 시스템은 절대 초기화 안됨)
userSchema.methods.checkAndResetDaily = function() {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 오늘의 공부시간 초기화 (날짜가 바뀌었을 때만)
    if (!this.dailyStudy || this.dailyStudy.date !== today) {
        console.log('📅 새로운 날 - 오늘 공부시간 초기화:', this.email, today);
        this.dailyStudy = {
            date: today,
            totalMinutes: 0,
            sessions: []
        };
    }
    
    // 이번 주 월요일 구하기
    const currentDate = new Date(now);
    const dayOfWeek = currentDate.getDay(); // 0=일요일, 1=월요일, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];

    // 주간 공부시간 초기화 (새로운 주가 시작되었을 때만)
    if (!this.weeklyStudy || this.weeklyStudy.weekStart !== weekStart) {
        console.log('📊 새로운 주 시작 - 주간 공부시간 초기화:', this.email, weekStart);
        this.weeklyStudy = {
            weekStart: weekStart,
            dailyMinutes: {
                monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                friday: 0, saturday: 0, sunday: 0,
            },
            totalMinutes: 0,
            sessions: [],
        };
    }

    // 레벨 시스템은 절대 초기화하지 않음 - 없을 때만 생성
    if (!this.levelSystem) {
        this.levelSystem = {
            currentLevel: 1,
            currentExp: 0,
            totalStudyTime: 0,
            lastUpdated: now,
        };
        console.log('🎯 레벨 시스템 최초 생성:', this.email);
    }

    return this;
};

// AI 대화 추가 메서드 (50개 제한, 매일 초기화 안함)
userSchema.methods.addAiChat = function(role, content) {
    this.aiChats.push({ role, content, timestamp: new Date() });

    // 50개 초과시 오래된 것부터 제거 (매일 초기화되지 않음)
    if (this.aiChats.length > 50) {
        this.aiChats = this.aiChats.slice(-50);
    }

    return this;
};

// 공부시간 추가 메서드 (오늘 공부시간 + 주간 + 레벨 시스템 모두 업데이트)
userSchema.methods.addStudySession = function(minutes) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay(); // 0=일요일, 1=월요일, ...
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek];

    // 일일 데이터 초기화 확인 (레벨 시스템은 절대 초기화 안됨)
    this.checkAndResetDaily();

    // 1. 오늘의 공부시간 업데이트
    if (this.dailyStudy) {
        this.dailyStudy.totalMinutes += minutes;
        this.dailyStudy.sessions.push({
            startTime: new Date(Date.now() - minutes * 60000),
            endTime: new Date(),
            minutes: minutes,
        });
        console.log(`📅 오늘 공부시간 업데이트: +${minutes}분 (총 ${this.dailyStudy.totalMinutes}분)`);
    }

    // 2. 주간 공부시간 업데이트
    if (this.weeklyStudy && this.weeklyStudy.dailyMinutes) {
        this.weeklyStudy.dailyMinutes[todayName] += minutes;
        this.weeklyStudy.totalMinutes += minutes;
        this.weeklyStudy.sessions.push({
            date: today,
            startTime: new Date(Date.now() - minutes * 60000),
            endTime: new Date(),
            minutes: minutes,
        });
        console.log(`📊 주간 공부시간 업데이트: +${minutes}분 (총 ${this.weeklyStudy.totalMinutes}분)`);
    }

    // 3. 레벨 시스템 업데이트 (영구 저장 - 절대 초기화 안됨)
    if (this.levelSystem) {
        const oldLevel = this.levelSystem.currentLevel;
        this.levelSystem.totalStudyTime += minutes;
        this.levelSystem.currentExp += minutes;
        this.levelSystem.lastUpdated = now;

        // 레벨업 체크 (StudyTimeService와 동일한 공식 사용)
        while (this.levelSystem.currentExp >= this.getExpRequiredForLevel(this.levelSystem.currentLevel)) {
            this.levelSystem.currentLevel++;
        }
        
        if (this.levelSystem.currentLevel > oldLevel) {
            console.log(`🎯 레벨업! ${oldLevel} → ${this.levelSystem.currentLevel} (총 ${this.levelSystem.totalStudyTime}분)`);
        } else {
            console.log(`🎯 레벨 시스템 업데이트: Lv.${this.levelSystem.currentLevel} (총 ${this.levelSystem.totalStudyTime}분)`);
        }
    }

    return this;
};

// 인덱스 생성
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
