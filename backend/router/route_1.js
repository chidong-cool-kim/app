const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../db/userSchema');
const StudyGroup = require('../db/studyGroupSchema');
const nodemailer = require('nodemailer');
const Verification = require('../db/verificationSchema');

// 현재 접속 중인 사용자 목록 (메모리에 저장)
// 구조: { email: string, loginTime: Date, lastActivity: Date }
const onlineUsers = new Map();

// 온라인 사용자 유틸리티 함수
const addUserOnline = (email) => {
    const now = new Date();
    onlineUsers.set(email.toLowerCase(), {
        email: email.toLowerCase(),
        loginTime: now,
        lastActivity: now
    });
    console.log(`🜢 [Online] 사용자 온라인 등록: ${email} (총 ${onlineUsers.size}명)`);
};

const removeUserOnline = (email) => {
    const removed = onlineUsers.delete(email.toLowerCase());
    if (removed) {
        console.log(`🜡 [Online] 사용자 오프라인 등록: ${email} (총 ${onlineUsers.size}명)`);
    }
};

const updateUserActivity = (email) => {
    const user = onlineUsers.get(email.toLowerCase());
    if (user) {
        user.lastActivity = new Date();
        console.log(`🟢 [Online] 사용자 활동 업데이트: ${email}`);
    }
};

const isUserOnline = (email) => {
    return onlineUsers.has(email.toLowerCase());
};

const getOnlineUsers = () => {
    return Array.from(onlineUsers.values());
};

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});

// 인증코드 생성 함수
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/signup/send-verification-code - 인증코드 발송
router.post('/send-verification-code', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }

        // 이메일 중복 확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: '이미 가입된 이메일입니다.' 
            });
        }

        // 기존 인증코드 삭제
        await Verification.deleteMany({ email: email.toLowerCase() });

        // 새 인증코드 생성
        const code = generateVerificationCode();
        
        await Verification.create({
            email: email.toLowerCase(),
            code: code
        });

        // 이메일 발송
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Study App 이메일 인증',
            html: `
                <h2>이메일 인증</h2>
                <p>인증코드: <strong>${code}</strong></p>
                <p>5분 이내에 입력해주세요.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ 
            success: true, 
            message: '인증코드가 발송되었습니다.' 
        });

    } catch (error) {
        console.error('인증코드 발송 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증코드 발송에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/signup/verify-code - 인증코드 확인
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일과 인증코드를 입력해주세요.' 
            });
        }

        const verification = await Verification.findOne({ 
            email: email.toLowerCase(),
            code: code 
        });

        if (!verification) {
            return res.status(400).json({ 
                success: false, 
                message: '인증코드가 올바르지 않습니다.' 
            });
        }

        // 인증 성공 - 인증코드 삭제
        await Verification.deleteOne({ _id: verification._id });

        res.json({ 
            success: true, 
            message: '이메일 인증이 완료되었습니다.' 
        });

    } catch (error) {
        console.error('인증코드 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증코드 확인에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/signup/signup - 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, provider, providerId } = req.body;

        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: '필수 정보를 입력해주세요.' 
            });
        }

        // 이메일 중복 확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: '이미 가입된 이메일입니다.' 
            });
        }

        // 비밀번호 해싱 (이메일 가입인 경우)
        let hashedPassword = null;
        if (provider === 'email' && password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // 사용자 생성
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            provider: provider || 'email',
            providerId: providerId || email.toLowerCase(),
            isEmailVerified: provider === 'email' ? true : false,
            role: 'user',
            banInfo: {
                isBanned: false,
                banReason: null,
                banStartDate: null,
                banEndDate: null,
                bannedBy: null
            }
        });

        res.status(201).json({ 
            success: true, 
            message: '회원가입이 완료되었습니다.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '회원가입에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/make-admin - 사용자를 관리자로 설정 (임시 API)
router.post('/make-admin', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }
        
        // 사용자 찾기
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        // 관리자 권한 설정
        user.role = 'admin';
        await user.save();
        
        console.log(`🔑 [Auth] 사용자 ${email}에게 관리자 권한 부여`);
        
        res.json({ 
            success: true, 
            message: '관리자 권한이 설정되었습니다.',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('관리자 권한 설정 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '관리자 권한 설정에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/update-activity - 사용자 활동 상태 업데이트
router.post('/update-activity', async (req, res) => {
    try {
        const { email, lastActivity } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }
        
        // 사용자 찾기 및 활동 상태 업데이트
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { 
                lastActivity: lastActivity || new Date(),
                $setOnInsert: { email: email.toLowerCase() }
            },
            { 
                upsert: true, 
                new: true 
            }
        );
        
        console.log(`📝 [Activity] 사용자 ${email} 활동 상태 업데이트`);
        
        res.json({ 
            success: true, 
            message: '활동 상태가 업데이트되었습니다.',
            lastActivity: user.lastActivity
        });
    } catch (error) {
        console.error('활동 상태 업데이트 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '활동 상태 업데이트에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/send-invitation - 노트 공유 초대 전송
router.post('/send-invitation', async (req, res) => {
    try {
        const { fromEmail, toEmail, roomId, noteTitle } = req.body;
        
        if (!fromEmail || !toEmail || !roomId) {
            return res.status(400).json({ 
                success: false, 
                message: '필수 정보가 누락되었습니다.' 
            });
        }
        
        console.log(`🔥 [Invitation] 사용자 찾기 시도:`, {
            fromEmail: fromEmail.toLowerCase(),
            toEmail: toEmail.toLowerCase()
        });
        
        // 수신자 사용자 찾기
        const toUser = await User.findOne({ email: toEmail.toLowerCase() });
        if (!toUser) {
            console.log(`🔥 [Invitation] 수신자 없음: ${toEmail}`);
            return res.status(404).json({ 
                success: false, 
                message: '수신자를 찾을 수 없습니다.' 
            });
        }
        
        // 발신자 사용자 찾기
        const fromUser = await User.findOne({ email: fromEmail.toLowerCase() });
        if (!fromUser) {
            console.log(`🔥 [Invitation] 발신자 없음: ${fromEmail}`);
            return res.status(404).json({ 
                success: false, 
                message: '발신자를 찾을 수 없습니다.' 
            });
        }
        
        console.log(`🔥 [Invitation] 사용자 찾기 성공:`, {
            fromUser: fromUser.email,
            toUser: toUser.email
        });
        
        // 초대 데이터 생성
        const invitation = {
            id: Date.now().toString(),
            type: 'NOTE_INVITATION',
            fromUser: {
                email: fromUser.email,
                username: fromUser.username,
                name: fromUser.name || fromUser.username
            },
            toUser: {
                email: toUser.email,
                username: toUser.username,
                name: toUser.name || toUser.username
            },
            roomId: roomId,
            noteTitle: noteTitle || '공유 노트',
            timestamp: new Date(),
            status: 'pending'
        };
        
        console.log(`🔥 [Invitation] 초대 데이터 생성 완료:`, invitation);
        
        // 수신자의 초대 목록에 추가 (임시로 데이터베이스에 저장)
        if (!toUser.invitations) {
            toUser.invitations = [];
            console.log(`🔥 [Invitation] 수신자 초대 목록 초기화: ${toUser.email}`);
        }
        
        console.log(`🔥 [Invitation] 초대 추가 전 목록:`, toUser.invitations.length);
        toUser.invitations.push(invitation);
        console.log(`🔥 [Invitation] 초대 추가 후 목록:`, toUser.invitations.length);
        
        const savedUser = await toUser.save();
        console.log(`🔥 [Invitation] DB 저장 완료:`, {
            userEmail: savedUser.email,
            totalInvitations: savedUser.invitations.length,
            latestInvitation: savedUser.invitations[savedUser.invitations.length - 1]
        });
        
        console.log(`🔥 [Invitation] 초대 전송 성공: ${fromEmail} → ${toEmail} (방: ${roomId})`);
        
        res.json({ 
            success: true, 
            message: '초대가 전송되었습니다.',
            invitation: invitation
        });
    } catch (error) {
        console.error('초대 전송 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '초대 전송에 실패했습니다.',
            error: error.message 
        });
    }
});

// GET /api/auth/invitations - 내 초대 목록 조회
router.get('/invitations', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const email = authHeader && authHeader.split(' ')[1];
        
        if (!email) {
            return res.status(401).json({ 
                success: false, 
                message: '로그인이 필요합니다.' 
            });
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        const invitations = user.invitations || [];
        const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
        
        console.log(`📧 [Invitation] 초대 목록 조회:`, {
            userEmail: email,
            totalInvitations: invitations.length,
            pendingInvitations: pendingInvitations.length,
            invitations: pendingInvitations
        });
        
        res.json({ 
            success: true, 
            invitations: pendingInvitations
        });
    } catch (error) {
        console.error('초대 목록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '초대 목록 조회에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/user-online - 사용자 온라인 등록
router.post('/user-online', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }
        
        // 사용자 존재 확인
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        console.log(`🜢 [Online] 사용자 온라인 등록 요청: ${email}`);
        
        // 온라인 사용자 목록에 추가
        addUserOnline(email);
        
        // DB에도 lastActivity 업데이트
        user.lastActivity = new Date();
        await user.save();
        
        console.log(`🜢 [Online] 온라인 등록 완료: ${email} (총 ${onlineUsers.size}명 온라인)`);
        console.log(`🜢 [Online] 현재 온라인 사용자 목록:`, Array.from(onlineUsers.keys()));
        
        res.json({ 
            success: true, 
            message: '사용자가 온라인으로 등록되었습니다.',
            onlineCount: onlineUsers.size
        });
    } catch (error) {
        console.error('사용자 온라인 등록 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '사용자 온라인 등록에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/user-offline - 사용자 오프라인 등록
router.post('/user-offline', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }
        
        // 온라인 사용자 목록에서 제거
        removeUserOnline(email);
        
        res.json({ 
            success: true, 
            message: '사용자가 오프라인으로 등록되었습니다.',
            onlineCount: onlineUsers.size
        });
    } catch (error) {
        console.error('사용자 오프라인 등록 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '사용자 오프라인 등록에 실패했습니다.',
            error: error.message 
        });
    }
});

// GET /api/user/details - 사용자 상세 정보 조회
router.get('/user/details', async (req, res) => {
    try {
        const { email } = req.query;
        
        console.log('📋 사용자 정보 조회 요청:', email);
        
        if (!email) {
            return res.status(400).json({ success: false, message: '이메일이 필요합니다.' });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('❌ 사용자를 찾을 수 없음:', email);
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        // 사용자가 가입한 스터디 그룹 조회
        let studyGroups = [];
        try {
            studyGroups = await StudyGroup.find({ 
                members: { $elemMatch: { email: email } } 
            }).select('name description');
        } catch (err) {
            console.error('스터디 그룹 조회 오류:', err);
        }

        console.log('✅ 사용자 정보 조회 성공:', email);
        
        res.json({
            success: true,
            user: {
                email: user.email,
                name: user.name || user.username,
                profileImage: user.profileImage,
                studyGroups: studyGroups
            }
        });
    } catch (error) {
        console.error('❌ 사용자 정보 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

// GET /api/auth/online-status - 모든 사용자의 온라인 상태 조회
router.get('/online-status', async (req, res) => {
    try {
        // 모든 사용자 가져오기
        const allUsers = await User.find({}, 'email username name role lastActivity');
        
        // 각 사용자의 온라인 상태 확인
        const usersWithStatus = allUsers.map(user => {
            const isOnline = isUserOnline(user.email);
            console.log(`📊 [Online] 사용자 상태 체크: ${user.email} -> ${isOnline ? '🜢 온라인' : '🜡 오프라인'}`);
            
            return {
                _id: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role,
                lastActivity: user.lastActivity,
                isOnline: isOnline // 실제 온라인 상태
            };
        });
        
        const onlineCount = usersWithStatus.filter(u => u.isOnline).length;
        
        console.log(`📊 [Online] 상태 조회 결과:`);
        console.log(`📊 [Online] - 전체 사용자: ${allUsers.length}명`);
        console.log(`📊 [Online] - 온라인 사용자: ${onlineCount}명`);
        console.log(`📊 [Online] - 온라인 목록:`, Array.from(onlineUsers.keys()));
        
        res.json({ 
            success: true, 
            users: usersWithStatus,
            totalUsers: allUsers.length,
            onlineUsers: onlineCount
        });
    } catch (error) {
        console.error('온라인 상태 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '온라인 상태 조회에 실패했습니다.',
            error: error.message 
        });
    }
});

// POST /api/auth/heartbeat - 사용자 활돐 신호 (온라인 상태 유지)
router.post('/heartbeat', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일을 입력해주세요.' 
            });
        }
        
        // 온라인 사용자의 활동 시간 업데이트
        updateUserActivity(email);
        
        res.json({ 
            success: true, 
            message: '활돐 신호 수신 완료',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('활돐 신호 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '활돐 신호 처리에 실패했습니다.',
            error: error.message 
        });
    }
});

module.exports = router;
