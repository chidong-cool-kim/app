const mongoose = require('mongoose');

// 스터디그룹 스키마
const studyGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 30
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    subject: {
        type: String,
        required: true,
        enum: ['수학', '영어', '국어', '과학', '사회', '역사', '프로그래밍', '디자인', '언어학습', '자격증', '기타']
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['member', 'admin'],
            default: 'member'
        }
    }],
    maxMembers: {
        type: Number,
        default: 10,
        min: 2,
        max: 50
    },
    currentMembers: {
        type: Number,
        default: 1
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);

module.exports = StudyGroup;
