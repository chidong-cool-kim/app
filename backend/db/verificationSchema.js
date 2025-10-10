const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // 5분 후 자동 삭제
    },
});

// 이메일 인덱스 생성
verificationSchema.index({ email: 1 });

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;
