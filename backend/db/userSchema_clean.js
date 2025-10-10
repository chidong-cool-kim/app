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
            sound: String,
        },
    }],
    memo: String,
});

// 오늘 공부 시간 (12시마다 초기화)
const dailyStudySchema = new mongoose.Schema({
    date: {
        type: String, // YYYY-MM-DD 형식
        required: true,
    },
    totalMinutes: {
        type: Number,
        default: 0,
    },
    sessions: [{
        startTime: Date,
        endTime: Date,
        minutes: Number,
    }],
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
            enum: ['temporary', 'permanent'],
            required: false,
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

    // 오늘 공부 시간 (12시마다 초기화)
    dailyStudy: dailyStudySchema,
    dailyStudyLastReset: {
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

// 12시 체크 및 초기화 메서드 (공부시간만 초기화)
userSchema.methods.checkAndResetDaily = function() {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 오늘 공부 시간 12시 이후 초기화
    if (this.dailyStudyLastReset) {
        const lastReset = new Date(this.dailyStudyLastReset);
        const lastResetDate = lastReset.toISOString().split('T')[0];

        if (lastResetDate !== today) {
            this.dailyStudy = {
                date: today,
                totalMinutes: 0,
                sessions: [],
            };
            this.dailyStudyLastReset = now;
        }
    }

    // dailyStudy가 없으면 초기화
    if (!this.dailyStudy || this.dailyStudy.date !== today) {
        this.dailyStudy = {
            date: today,
            totalMinutes: 0,
            sessions: [],
        };
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

// 공부 시간 추가 메서드
userSchema.methods.addStudySession = function(minutes) {
    const today = new Date().toISOString().split('T')[0];

    if (!this.dailyStudy || this.dailyStudy.date !== today) {
        this.dailyStudy = {
            date: today,
            totalMinutes: 0,
            sessions: [],
        };
    }

    this.dailyStudy.totalMinutes += minutes;
    this.dailyStudy.sessions.push({
        startTime: new Date(Date.now() - minutes * 60000),
        endTime: new Date(),
        minutes: minutes,
    });

    return this;
};

// 인덱스 생성
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
