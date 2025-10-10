const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
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
    content: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        trim: true,
    },
    tags: [{
        type: String,
        trim: true,
    }],
    isPublic: {
        type: Boolean,
        default: false,
    },
    likes: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// 인덱스 생성
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ isPublic: 1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
