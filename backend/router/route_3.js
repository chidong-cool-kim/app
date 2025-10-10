const express = require('express');
const router = express.Router();
const { Post, User } = require('../db');

// 이메일 기반 인증 미들웨어
const authenticateByEmail = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const email = authHeader && authHeader.split(' ')[1];

        if (!email) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: '사용자를 찾을 수 없습니다.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('인증 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: '인증 처리 중 오류가 발생했습니다.' 
        });
    }
};

// GET /api/community/posts - 모든 게시글 조회
router.get('/posts', authenticateByEmail, async (req, res) => {
    try {
        const { search } = req.query;
        
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name username email profileImage');

        res.json({
            success: true,
            posts: posts.map(post => ({
                id: post._id,
                title: post.title,
                content: post.content,
                author: post.author,
                authorEmail: post.authorEmail,
                authorImage: post.userId?.profileImage || null,
                date: formatDate(post.createdAt),
                likes: post.likes,
                comments: post.comments.map(comment => ({
                    id: comment._id,
                    author: comment.authorName,
                    content: comment.content,
                    date: formatDate(comment.createdAt),
                    likes: comment.likes,
                    likedByUser: false // 클라이언트에서 처리
                })),
                image: post.image,
                hasSnowEffect: post.hasSnowEffect || false,
                hasAutumnEffect: post.hasAutumnEffect || false,
                likedByUser: false, // 클라이언트에서 처리
                views: post.views
            }))
        });

    } catch (error) {
        console.error('게시글 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 조회에 실패했습니다.',
            error: error.message
        });
    }
});

// GET /api/community/posts/:postId - 특정 게시글 조회
router.get('/posts/:postId', authenticateByEmail, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId).populate('userId', 'name username profileImage');
        
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        // 조회수 증가
        post.views += 1;
        await post.save();

        res.json({
            success: true,
            post: {
                _id: post._id,
                id: post._id,
                title: post.title,
                content: post.content,
                author: post.author,
                authorImage: post.userId?.profileImage || null,
                date: formatDate(post.createdAt),
                likes: post.likes,
                comments: post.comments.map(comment => ({
                    _id: comment._id,
                    id: comment._id,
                    author: comment.authorName,
                    content: comment.content,
                    date: formatDate(comment.createdAt),
                    likes: comment.likes,
                    likedByUser: comment.likedBy.includes(userId)
                })),
                image: post.image,
                hasSnowEffect: post.hasSnowEffect || false,
                hasAutumnEffect: post.hasAutumnEffect || false,
                likedByUser: post.likedBy.includes(userId),
                views: post.views
            }
        });

    } catch (error) {
        console.error('게시글 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 조회에 실패했습니다.',
            error: error.message
        });
    }
});

// POST /api/community/posts - 게시글 작성
router.post('/posts', authenticateByEmail, async (req, res) => {
    try {
        const { title, content, image, hasSnowEffect, hasAutumnEffect } = req.body;
        const userId = req.user._id;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: '필수 정보를 입력해주세요.'
            });
        }

        // 사용자 정보 가져오기
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const post = await Post.create({
            userId,
            author: user.username || user.name || '익명',
            authorEmail: user.email,
            title,
            content,
            image: image || null,
            hasSnowEffect: hasSnowEffect || false,
            hasAutumnEffect: hasAutumnEffect || false
        });

        res.status(201).json({
            success: true,
            message: '게시글이 작성되었습니다.',
            post: {
                _id: post._id,
                id: post._id,
                title: post.title,
                content: post.content,
                author: post.author,
                authorEmail: post.authorEmail,
                authorImage: user.profileImage || null,
                date: formatDate(post.createdAt),
                likes: post.likes,
                comments: [],
                image: post.image,
                hasSnowEffect: post.hasSnowEffect || false,
                hasAutumnEffect: post.hasAutumnEffect || false,
                likedByUser: false
            }
        });

    } catch (error) {
        console.error('게시글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 작성에 실패했습니다.',
            error: error.message
        });
    }
});

// POST /api/community/posts/:postId/like - 게시글 좋아요
router.post('/posts/:postId/like', authenticateByEmail, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        const likedIndex = post.likedBy.indexOf(userId);
        
        if (likedIndex > -1) {
            // 좋아요 취소
            post.likedBy.splice(likedIndex, 1);
            post.likes = Math.max(0, post.likes - 1);
        } else {
            // 좋아요 추가
            post.likedBy.push(userId);
            post.likes += 1;
        }

        await post.save();

        res.json({
            success: true,
            likes: post.likes,
            likedByUser: likedIndex === -1
        });

    } catch (error) {
        console.error('좋아요 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '좋아요 처리에 실패했습니다.',
            error: error.message
        });
    }
});

// POST /api/community/posts/:postId/comments - 댓글 작성
router.post('/posts/:postId/comments', authenticateByEmail, async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: '댓글 내용을 입력해주세요.'
            });
        }

        // 사용자 정보 가져오기
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        const comment = {
            author: userId,
            authorName: user.username || user.name || '익명',
            content,
            likes: 0,
            likedBy: []
        };

        post.comments.push(comment);
        await post.save();

        const newComment = post.comments[post.comments.length - 1];

        res.status(201).json({
            success: true,
            message: '댓글이 작성되었습니다.',
            comment: {
                id: newComment._id,
                author: newComment.authorName,
                content: newComment.content,
                date: formatDate(newComment.createdAt),
                likes: newComment.likes,
                likedByUser: false
            }
        });

    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '댓글 작성에 실패했습니다.',
            error: error.message
        });
    }
});

// POST /api/community/posts/:postId/comments/:commentId/like - 댓글 좋아요
router.post('/posts/:postId/comments/:commentId/like', authenticateByEmail, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: '댓글을 찾을 수 없습니다.'
            });
        }

        const likedIndex = comment.likedBy.indexOf(userId);
        
        if (likedIndex > -1) {
            // 좋아요 취소
            comment.likedBy.splice(likedIndex, 1);
            comment.likes = Math.max(0, comment.likes - 1);
        } else {
            // 좋아요 추가
            comment.likedBy.push(userId);
            comment.likes += 1;
        }

        await post.save();

        res.json({
            success: true,
            likes: comment.likes,
            likedByUser: likedIndex === -1
        });

    } catch (error) {
        console.error('댓글 좋아요 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '댓글 좋아요 처리에 실패했습니다.',
            error: error.message
        });
    }
});

// DELETE /api/community/posts/:postId - 게시글 삭제
router.delete('/posts/:postId', authenticateByEmail, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        // 작성자 확인
        if (post.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: '삭제 권한이 없습니다.'
            });
        }

        await Post.findByIdAndDelete(postId);

        res.json({
            success: true,
            message: '게시글이 삭제되었습니다.'
        });

    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 삭제에 실패했습니다.',
            error: error.message
        });
    }
});

// 날짜 포맷 헬퍼 함수
function formatDate(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

module.exports = router;
