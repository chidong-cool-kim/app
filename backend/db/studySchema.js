const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
    },
    duration: {
        type: Number, // 분 단위
        default: 0,
    },
    notes: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed'],
        default: 'active',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// 인덱스 생성
studySessionSchema.index({ userId: 1, createdAt: -1 });

const StudySession = mongoose.model('StudySession', studySessionSchema);

module.exports = StudySession;
