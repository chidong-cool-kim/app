const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

// JWT ?�크�???
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// POST /api/auth/login - 로그??
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '?�메?�과 비�?번호�??�력?�주?�요.' 
            });
        }

        // ?�용??찾기
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: '?�메???�는 비�?번호가 ?�바르�? ?�습?�다.' 
            });
        }

        // 비�?번호 ?�인
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: '?�메???�는 비�?번호가 ?�바르�? ?�습?�다.' 
            });
        }

        // �??�태 ?�인 (만료???�시밴만 ?�동 ?�제)
        if (user.banInfo && user.banInfo.isBanned === true) {
            const now = new Date();
            
            // ?�시밴인 경우 만료???�인
            if (user.banInfo.banType === 'temporary' && user.banInfo.banEndDate) {
                if (now > user.banInfo.banEndDate) {
                    // �?기간??만료?�었?�면 ?�동?�로 ?�제
                    user.banInfo.isBanned = false;
                    user.banInfo.banType = null;
                    user.banInfo.banReason = null;
                    user.banInfo.banStartDate = null;
                    user.banInfo.banEndDate = null;
                    user.banInfo.bannedBy = null;
                    await user.save();
                }
            }
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        // JWT ?�큰 ?�성
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            success: true, 
            message: '로그???�공',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                notes: user.notes,
                aiChats: user.aiChats,
                planners: user.planners,
                weeklyStudy: user.weeklyStudy,
                levelSystem: user.levelSystem,
            }
        });

    } catch (error) {
        console.error('로그???�류:', error);
        res.status(500).json({ 
            success: false, 
            message: '로그?�에 ?�패?�습?�다.',
            error: error.message 
        });
    }
});

// POST /api/auth/oauth-login - OAuth 로그??
router.post('/oauth-login', async (req, res) => {
    try {
        const { email, name, provider, providerId, profileImage } = req.body;

        if (!email || !provider || !providerId) {
            return res.status(400).json({ 
                success: false, 
                message: '?�수 ?�보가 ?�락?�었?�니??' 
            });
        }

        // 기존 ?�용???�인
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // ???�용???�성
            user = await User.create({
                name: name || 'User',
                email: email.toLowerCase(),
                provider,
                providerId,
                profileImage,
                role: 'user',
                banInfo: {
                    isBanned: false,
                    banReason: null,
                    banStartDate: null,
                    banEndDate: null,
                    bannedBy: null
                },
                isEmailVerified: true
            });
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        // JWT ?�큰 ?�성
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            success: true, 
            message: '로그???�공',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                notes: user.notes,
                aiChats: user.aiChats,
                planners: user.planners,
                weeklyStudy: user.weeklyStudy,
                levelSystem: user.levelSystem,
            }
        });

    } catch (error) {
        console.error('OAuth 로그???�류:', error);
        res.status(500).json({ 
            success: false, 
            message: 'OAuth 로그?�에 ?�패?�습?�다.',
            error: error.message 
        });
    }
});

// POST /api/auth/set-username - ?�네???�정
router.post('/set-username', async (req, res) => {
    try {
        const { userId, username } = req.body;

        if (!userId || !username) {
            return res.status(400).json({ 
                success: false, 
                message: '?�용??ID?� ?�네?�을 ?�력?�주?�요.' 
            });
        }

        // ?�네??중복 ?�인
        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(400).json({ 
                success: false, 
                message: '?��? ?�용 중인 ?�네?�입?�다.' 
            });
        }

        // ?�네???�데?�트
        const user = await User.findByIdAndUpdate(
            userId,
            { username },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?�용?��? 찾을 ???�습?�다.' 
            });
        }

        res.json({ 
            success: true, 
            message: '?�네?�이 ?�정?�었?�니??',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('?�네???�정 ?�류:', error);
        res.status(500).json({ 
            success: false, 
            message: '?�네???�정???�패?�습?�다.',
            error: error.message 
        });
    }
});

// Middleware: JWT ?�큰 검�?
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '?�증 ?�큰???�요?�니??' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: '?�효?��? ?��? ?�큰?�니??' 
            });
        }
        req.user = user;
        next();
    });
};

// GET /api/auth/verify - ?�큰 검�?
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?�용?��? 찾을 ???�습?�다.' 
            });
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        res.json({ 
            success: true,
            message: '?�효???�큰?�니??',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                notes: user.notes,
                aiChats: user.aiChats,
                planners: user.planners,
                weeklyStudy: user.weeklyStudy,
                levelSystem: user.levelSystem,
            }
        });

    } catch (error) {
        console.error('?�큰 검�??�류:', error);
        res.status(500).json({ 
            success: false, 
            message: '?�큰 검증에 ?�패?�습?�다.',
            error: error.message 
        });
    }
});

// POST /api/auth/gmail-login - Gmail 간단 로그??(?�메?�만?�로)
router.post('/gmail-login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '?�메?�이 ?�요?�니??' 
            });
        }

        // Gmail ?�용??찾기
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            provider: { $in: ['google', 'gmail'] }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Gmail 계정??찾을 ???�습?�다.' 
            });
        }

        // 만료???�시밴만 ?�동 ?�제 (로그?��? ?�용)
        if (user.banInfo && user.banInfo.isBanned === true && user.banInfo.banType === 'temporary' && user.banInfo.banEndDate) {
            const now = new Date();
            if (now > user.banInfo.banEndDate) {
                // �?기간??만료?�었?�면 ?�동?�로 ?�제
                user.banInfo.isBanned = false;
                user.banInfo.banType = null;
                user.banInfo.banReason = null;
                user.banInfo.banStartDate = null;
                user.banInfo.banEndDate = null;
                user.banInfo.bannedBy = null;
                await user.save();
            }
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        res.json({ 
            success: true, 
            message: 'Gmail 로그???�공',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                provider: user.provider,
                profileImage: user.profileImage,
                role: user.role,
                notes: user.notes,
                aiChats: user.aiChats,
                planners: user.planners,
                weeklyStudy: user.weeklyStudy,
                levelSystem: user.levelSystem,
                subscription: user.subscription,
                banInfo: user.banInfo, // �??�보 ?�함
                createdAt: user.createdAt,
                notesCount: user.notes ? user.notes.length : 0,
                dailyStudyMinutes: user.dailyStudy ? user.dailyStudy.totalMinutes : 0,
                plannersCount: user.planners ? user.planners.length : 0
            }
        });

    } catch (error) {
        console.error('Gmail 로그???�류:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gmail 로그?�에 ?�패?�습?�다.',
            error: error.message 
        });
    }
});

// GET /api/auth/me - ?�재 ?�용???�보
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?�용?��? 찾을 ???�습?�다.' 
            });
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        res.json({ 
            success: true, 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                notes: user.notes,
                aiChats: user.aiChats,
                planners: user.planners,
                weeklyStudy: user.weeklyStudy,
                levelSystem: user.levelSystem,
            }
        });

    } catch (error) {
        console.error('?�용???�보 조회 ?�류:', error);
        res.status(500).json({ 
            success: false, 
            message: '?�용???�보 조회???�패?�습?�다.',
            error: error.message 
        });
    }
});

// GET /api/auth/user-data/:email - ?�용???�이??조회 (?�트 ?�함)
router.get('/user-data/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '?�메?�이 ?�요?�니??' 
            });
        }

        // ?�용??찾기
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?�용?��? 찾을 ???�습?�다.' 
            });
        }

        // 12??체크 �?초기??
        user.checkAndResetDaily();
        await user.save();

        console.log('?�� [Auth API] ?�용???�이??조회:', {
            email: user.email,
            notesCount: user.notes ? user.notes.length : 0,
            notes: user.notes ? user.notes.map(note => ({ 
                id: note._id, 
                title: note.title, 
                type: note.content && note.content.startsWith('{') ? 'drawing' : 'text' 
            })) : []
        });

        res.json({ 
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    profileImage: user.profileImage,
                    role: user.role,
                    banInfo: user.banInfo,
                    createdAt: user.createdAt
                },
                notes: user.notes || [],
                aiChats: user.aiChats || [],
                planners: user.planners || [],
                weeklyStudy: user.weeklyStudy || { dailyMinutes: {}, totalMinutes: 0, sessions: [] },
                levelSystem: user.levelSystem || { currentLevel: 1, currentExp: 0, totalStudyTime: 0 }
            }
        });

    } catch (error) {
        console.error('??[Auth API] ?�용???�이??조회 ?�패:', error);
        res.status(500).json({ 
            success: false, 
            message: '?�용???�이??조회???�패?�습?�다.',
            error: error.message 
        });
    }
});

// Export authenticateToken middleware
module.exports = router;
module.exports.authenticateToken = authenticateToken;
