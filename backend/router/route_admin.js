const express = require('express');
const router = express.Router();
const { User, Post } = require('../db');

// 관리자 인증 미들웨어
const authenticateAdmin = async (req, res, next) => {
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

        // 관리자 권한 확인
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: '관리자 권한이 필요합니다.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('관리자 인증 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: '인증 처리 중 오류가 발생했습니다.' 
        });
    }
};

// GET /api/admin/users - 사용자 검색
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        
        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const users = await User.find(query)
            .select('_id name email username role banInfo createdAt profileImage subscription')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users: users.map(user => ({
                _id: user._id,
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                profileImage: user.profileImage,
                subscription: user.subscription,
                isBanned: user.banInfo?.isBanned || false,
                banType: user.banInfo?.banType,
                banReason: user.banInfo?.banReason,
                banEndDate: user.banInfo?.banEndDate,
                createdAt: user.createdAt
            })),
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: users.length,
                totalUsers: total
            }
        });

    } catch (error) {
        console.error('사용자 검색 오류:', error);
        res.status(500).json({
            success: false,
            error: '사용자 검색에 실패했습니다.'
        });
    }
});

// POST /api/admin/users/:userId/ban - 사용자 밴
router.post('/users/:userId/ban', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { banType, reason, days } = req.body;

        if (!banType || !reason) {
            return res.status(400).json({
                success: false,
                error: '밴 타입과 사유를 입력해주세요.'
            });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        // 관리자는 밴할 수 없음
        if (targetUser.role === 'admin') {
            return res.status(403).json({
                success: false,
                error: '관리자는 밴할 수 없습니다.'
            });
        }

        const banStartDate = new Date();
        let banEndDate = null;

        if (banType === 'temporary' && days) {
            banEndDate = new Date();
            banEndDate.setDate(banEndDate.getDate() + parseInt(days));
        }

        targetUser.banInfo = {
            isBanned: true,
            banType: banType,
            banReason: reason,
            banStartDate: banStartDate,
            banEndDate: banEndDate,
            bannedBy: req.user._id
        };

        await targetUser.save();
        
        console.log(`사용자 ${targetUser.email} 밴 처리 완료:`, targetUser.banInfo);

        res.json({
            success: true,
            message: `사용자가 ${banType === 'permanent' ? '영구' : days + '일간'} 밴되었습니다.`,
            banInfo: targetUser.banInfo
        });

    } catch (error) {
        console.error('사용자 밴 오류:', error);
        res.status(500).json({
            success: false,
            error: '사용자 밴에 실패했습니다.'
        });
    }
});

// POST /api/admin/users/:userId/unban - 사용자 밴 해제
router.post('/users/:userId/unban', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        targetUser.banInfo.isBanned = false;
        targetUser.banInfo.banType = null;
        targetUser.banInfo.banReason = null;
        targetUser.banInfo.banStartDate = null;
        targetUser.banInfo.banEndDate = null;
        targetUser.banInfo.bannedBy = null;

        await targetUser.save();

        res.json({
            success: true,
            message: '사용자 밴이 해제되었습니다.'
        });

    } catch (error) {
        console.error('사용자 밴 해제 오류:', error);
        res.status(500).json({
            success: false,
            error: '사용자 밴 해제에 실패했습니다.'
        });
    }
});

// GET /api/admin/posts - 모든 게시글 관리
router.get('/posts', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const posts = await Post.find()
            .populate('userId', 'name email username')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Post.countDocuments();

        res.json({
            success: true,
            posts: posts.map(post => ({
                id: post._id,
                title: post.title,
                content: post.content.substring(0, 100) + '...',
                author: {
                    id: post.userId._id,
                    name: post.userId.name,
                    email: post.userId.email,
                    username: post.userId.username
                },
                likes: post.likes,
                commentsCount: post.comments.length,
                createdAt: post.createdAt,
                image: post.image
            })),
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: posts.length,
                totalPosts: total
            }
        });

    } catch (error) {
        console.error('게시글 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '게시글 조회에 실패했습니다.'
        });
    }
});

// DELETE /api/admin/posts/:postId - 게시글 삭제
router.delete('/posts/:postId', authenticateAdmin, async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                error: '게시글을 찾을 수 없습니다.'
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
            error: '게시글 삭제에 실패했습니다.'
        });
    }
});

// GET /api/admin/stats - 관리자 대시보드 통계
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();
        const bannedUsers = await User.countDocuments({ 'banInfo.isBanned': true });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        // 최근 7일간 가입자 수
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentUsers = await User.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo } 
        });

        // 최근 7일간 게시글 수
        const recentPosts = await Post.countDocuments({ 
            createdAt: { $gte: sevenDaysAgo } 
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalPosts,
                bannedUsers,
                adminUsers,
                recentUsers,
                recentPosts
            }
        });

    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '통계 조회에 실패했습니다.'
        });
    }
});

module.exports = router;
