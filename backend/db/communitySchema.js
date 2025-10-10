const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    authorName: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    likes: {
        type: Number,
        default: 0,
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const postSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    authorEmail: {
        type: String,
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
    image: {
        type: String,
        default: null,
    },
    hasSnowEffect: {
        type: Boolean,
        default: false,
    },
    hasAutumnEffect: {
        type: Boolean,
        default: false,
    },
    likes: {
        type: Number,
        default: 0,
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    comments: [commentSchema],
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
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
