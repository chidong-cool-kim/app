const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');

// JWT ?œí¬ë¦???
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// POST /api/auth/login - ë¡œê·¸??
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '?´ë©”?¼ê³¼ ë¹„ë?ë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”.' 
            });
        }

        // ?¬ìš©??ì°¾ê¸°
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: '?´ë©”???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.' 
            });
        }

        // ë¹„ë?ë²ˆí˜¸ ?•ì¸
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: '?´ë©”???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.' 
            });
        }

        // ë°??íƒœ ?•ì¸ (ë§Œë£Œ???„ì‹œë°´ë§Œ ?ë™ ?´ì œ)
        if (user.banInfo && user.banInfo.isBanned === true) {
            const now = new Date();
            
            // ?„ì‹œë°´ì¸ ê²½ìš° ë§Œë£Œ???•ì¸
            if (user.banInfo.banType === 'temporary' && user.banInfo.banEndDate) {
                if (now > user.banInfo.banEndDate) {
                    // ë°?ê¸°ê°„??ë§Œë£Œ?˜ì—ˆ?¼ë©´ ?ë™?¼ë¡œ ?´ì œ
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

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
        user.checkAndResetDaily();
        await user.save();

        // JWT ? í° ?ì„±
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            success: true, 
            message: 'ë¡œê·¸???±ê³µ',
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
        console.error('ë¡œê·¸???¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: 'ë¡œê·¸?¸ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// POST /api/auth/oauth-login - OAuth ë¡œê·¸??
router.post('/oauth-login', async (req, res) => {
    try {
        const { email, name, provider, providerId, profileImage } = req.body;

        if (!email || !provider || !providerId) {
            return res.status(400).json({ 
                success: false, 
                message: '?„ìˆ˜ ?•ë³´ê°€ ?„ë½?˜ì—ˆ?µë‹ˆ??' 
            });
        }

        // ê¸°ì¡´ ?¬ìš©???•ì¸
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // ???¬ìš©???ì„±
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

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
        user.checkAndResetDaily();
        await user.save();

        // JWT ? í° ?ì„±
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ 
            success: true, 
            message: 'ë¡œê·¸???±ê³µ',
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
        console.error('OAuth ë¡œê·¸???¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: 'OAuth ë¡œê·¸?¸ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// POST /api/auth/set-username - ?‰ë„¤???¤ì •
router.post('/set-username', async (req, res) => {
    try {
        const { userId, username } = req.body;

        if (!userId || !username) {
            return res.status(400).json({ 
                success: false, 
                message: '?¬ìš©??ID?€ ?‰ë„¤?„ì„ ?…ë ¥?´ì£¼?¸ìš”.' 
            });
        }

        // ?‰ë„¤??ì¤‘ë³µ ?•ì¸
        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(400).json({ 
                success: false, 
                message: '?´ë? ?¬ìš© ì¤‘ì¸ ?‰ë„¤?„ì…?ˆë‹¤.' 
            });
        }

        // ?‰ë„¤???…ë°?´íŠ¸
        const user = await User.findByIdAndUpdate(
            userId,
            { username },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' 
            });
        }

        res.json({ 
            success: true, 
            message: '?‰ë„¤?„ì´ ?¤ì •?˜ì—ˆ?µë‹ˆ??',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('?‰ë„¤???¤ì • ?¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: '?‰ë„¤???¤ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// Middleware: JWT ? í° ê²€ì¦?
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '?¸ì¦ ? í°???„ìš”?©ë‹ˆ??' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: '? íš¨?˜ì? ?Šì? ? í°?…ë‹ˆ??' 
            });
        }
        req.user = user;
        next();
    });
};

// GET /api/auth/verify - ? í° ê²€ì¦?
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' 
            });
        }

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
        user.checkAndResetDaily();
        await user.save();

        res.json({ 
            success: true,
            message: '? íš¨??? í°?…ë‹ˆ??',
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
        console.error('? í° ê²€ì¦??¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: '? í° ê²€ì¦ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// POST /api/auth/gmail-login - Gmail ê°„ë‹¨ ë¡œê·¸??(?´ë©”?¼ë§Œ?¼ë¡œ)
router.post('/gmail-login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '?´ë©”?¼ì´ ?„ìš”?©ë‹ˆ??' 
            });
        }

        // Gmail ?¬ìš©??ì°¾ê¸°
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            provider: { $in: ['google', 'gmail'] }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Gmail ê³„ì •??ì°¾ì„ ???†ìŠµ?ˆë‹¤.' 
            });
        }

        // ë§Œë£Œ???„ì‹œë°´ë§Œ ?ë™ ?´ì œ (ë¡œê·¸?¸ì? ?ˆìš©)
        if (user.banInfo && user.banInfo.isBanned === true && user.banInfo.banType === 'temporary' && user.banInfo.banEndDate) {
            const now = new Date();
            if (now > user.banInfo.banEndDate) {
                // ë°?ê¸°ê°„??ë§Œë£Œ?˜ì—ˆ?¼ë©´ ?ë™?¼ë¡œ ?´ì œ
                user.banInfo.isBanned = false;
                user.banInfo.banType = null;
                user.banInfo.banReason = null;
                user.banInfo.banStartDate = null;
                user.banInfo.banEndDate = null;
                user.banInfo.bannedBy = null;
                await user.save();
            }
        }

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
        user.checkAndResetDaily();
        await user.save();

        res.json({ 
            success: true, 
            message: 'Gmail ë¡œê·¸???±ê³µ',
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
                banInfo: user.banInfo, // ë°??•ë³´ ?¬í•¨
                createdAt: user.createdAt,
                notesCount: user.notes ? user.notes.length : 0,
                dailyStudyMinutes: user.dailyStudy ? user.dailyStudy.totalMinutes : 0,
                plannersCount: user.planners ? user.planners.length : 0
            }
        });

    } catch (error) {
        console.error('Gmail ë¡œê·¸???¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gmail ë¡œê·¸?¸ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// GET /api/auth/me - ?„ì¬ ?¬ìš©???•ë³´
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' 
            });
        }

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
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
        console.error('?¬ìš©???•ë³´ ì¡°íšŒ ?¤ë¥˜:', error);
        res.status(500).json({ 
            success: false, 
            message: '?¬ìš©???•ë³´ ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// GET /api/auth/user-data/:email - ?¬ìš©???°ì´??ì¡°íšŒ (?¸íŠ¸ ?¬í•¨)
router.get('/user-data/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '?´ë©”?¼ì´ ?„ìš”?©ë‹ˆ??' 
            });
        }

        // ?¬ìš©??ì°¾ê¸°
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.' 
            });
        }

        // 12??ì²´í¬ ë°?ì´ˆê¸°??
        user.checkAndResetDaily();
        await user.save();

        console.log('?“¥ [Auth API] ?¬ìš©???°ì´??ì¡°íšŒ:', {
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
        console.error('??[Auth API] ?¬ìš©???°ì´??ì¡°íšŒ ?¤íŒ¨:', error);
        res.status(500).json({ 
            success: false, 
            message: '?¬ìš©???°ì´??ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.',
            error: error.message 
        });
    }
});

// Export authenticateToken middleware
module.exports = router;
module.exports.authenticateToken = authenticateToken;
