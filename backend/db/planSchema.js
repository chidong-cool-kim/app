const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    targetDate: {
        type: Date,
        required: true,
    },
    targetHours: {
        type: Number,
        default: 0,
    },
    completedHours: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// 인덱스 생성
planSchema.index({ userId: 1, targetDate: 1 });

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
