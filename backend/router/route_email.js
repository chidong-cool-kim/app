const express = require('express');
const router = express.Router();
const { User } = require('../db');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

// Rate Limiting 설정
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 최대 5회 시도
    message: {
        success: false,
        message: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const verificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5분
    max: 3, // 최대 3회 인증코드 요청
    message: {
        success: false,
        message: '너무 많은 인증코드 요청입니다. 5분 후 다시 시도해주세요.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 인증코드 저장소 (실제 환경에서는 Redis나 데이터베이스 사용)
const verificationCodes = new Map();

// 입력 데이터 검증 함수
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    if (!validator.isEmail(email)) return false;
    if (!email.endsWith('@gmail.com')) return false;
    if (email.length > 254) return false; // RFC 5321 제한
    return true;
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (password.length > 128) return false;
    // 최소 하나의 대문자, 소문자, 숫자, 특수문자 포함
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return validator.escape(input.trim());
}
// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // 환경변수에서 Gmail 계정
        pass: process.env.GMAIL_APP_PASSWORD // Gmail 앱 비밀번호
    }
});

// 인증코드 생성 함수
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 인증코드 발송 API
router.post('/send-verification-code', verificationLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        // 입력 검증
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: '유효한 Gmail 주소를 입력해주세요.'
            });
        }

        const sanitizedEmail = sanitizeInput(email.toLowerCase());

        // 인증코드 생성
        const verificationCode = generateVerificationCode();
        
        console.log(`📧 [인증코드 발송] 이메일: ${email}, 코드: ${verificationCode}`);
        
        // 인증코드 저장 (5분 후 만료)
        verificationCodes.set(email, {
            code: verificationCode,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5분
            attempts: 0
        });

        // 이메일 발송
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: '스터디 앱 - Gmail 인증코드',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">스터디 앱 Gmail 인증</h2>
                    <p>안녕하세요!</p>
                    <p>스터디 앱 로그인을 위한 인증코드입니다:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007AFF; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
                    </div>
                    <p>이 인증코드는 <strong>5분간</strong> 유효합니다.</p>
                    <p>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">스터디 앱 팀</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`인증코드 발송 성공: ${email} - ${verificationCode}`);

        res.json({
            success: true,
            message: '인증코드가 발송되었습니다.',
            email: email
        });

    } catch (error) {
        console.error('인증코드 발송 실패:', error);
        res.status(500).json({
            success: false,
            message: '인증코드 발송에 실패했습니다.'
        });
    }
});

// 인증코드 확인 API
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: '이메일과 인증코드가 필요합니다.'
            });
        }

        const storedData = verificationCodes.get(email);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: '인증코드가 존재하지 않습니다. 다시 요청해주세요.'
            });
        }

        // 만료 시간 확인
        if (Date.now() > storedData.expiresAt) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                message: '인증코드가 만료되었습니다. 다시 요청해주세요.'
            });
        }

        // 시도 횟수 확인 (최대 5회)
        if (storedData.attempts >= 5) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                message: '인증 시도 횟수를 초과했습니다. 다시 요청해주세요.'
            });
        }

        // 인증코드 확인
        console.log('인증코드 비교:', {
            입력된코드: code,
            저장된코드: storedData.code,
            일치여부: storedData.code === code
        });
        
        if (storedData.code !== code) {
            storedData.attempts++;
            console.log('인증코드 불일치, 시도 횟수:', storedData.attempts);
            return res.status(400).json({
                success: false,
                message: `인증코드가 올바르지 않습니다. (${storedData.attempts}/5)`
            });
        }

        // 인증 성공 - 사용자 데이터베이스에 저장 또는 업데이트
        verificationCodes.delete(email);
        
        try {
            // 기존 사용자 확인
            let user = await User.findOne({ email: email });
            
            if (!user) {
                // 새 사용자 생성
                const username = email.split('@')[0]; // 이메일에서 기본 사용자명 생성
                
                user = new User({
                    name: username,
                    email: email,
                    provider: 'gmail',
                    providerId: email,
                    username: username,
                    isEmailVerified: true,
                    // 기본 데이터 초기화
                    notes: [],
                    aiChats: [],
                    planners: [],
                    dailyStudy: {
                        date: new Date().toISOString().split('T')[0],
                        totalMinutes: 0,
                        sessions: []
                    }
                });
                
                await user.save();
                console.log(`새 사용자 생성: ${email}`);
            } else {
                // 기존 사용자 이메일 인증 상태 업데이트
                user.isEmailVerified = true;
                user.updatedAt = new Date();
                await user.save();
                console.log(`기존 사용자 인증 완료: ${email}`);
            }

            res.json({
                success: true,
                message: '인증이 완료되었습니다.',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    isEmailVerified: user.isEmailVerified,
                    createdAt: user.createdAt
                }
            });
            
        } catch (dbError) {
            console.error('사용자 저장 실패:', dbError);
            res.status(500).json({
                success: false,
                message: '사용자 정보 저장에 실패했습니다.'
            });
        }

    } catch (error) {
        console.error('인증코드 확인 실패:', error);
        res.status(500).json({
            success: false,
            message: '인증코드 확인에 실패했습니다.'
        });
    }
});

// 인증코드 상태 확인 API (선택사항)
router.get('/code-status/:email', (req, res) => {
    const { email } = req.params;
    const storedData = verificationCodes.get(email);

    if (!storedData) {
        return res.json({
            exists: false,
            message: '인증코드가 존재하지 않습니다.'
        });
    }

    const isExpired = Date.now() > storedData.expiresAt;
    const remainingTime = Math.max(0, storedData.expiresAt - Date.now());

    res.json({
        exists: true,
        expired: isExpired,
        remainingTime: remainingTime,
        attempts: storedData.attempts,
        maxAttempts: 5
    });
});

// 닉네임 업데이트 API
router.put('/update-username', async (req, res) => {
    try {
        const { email, username } = req.body;

        if (!email || !username) {
            return res.status(400).json({
                success: false,
                message: '이메일과 닉네임이 필요합니다.'
            });
        }

        // 닉네임 중복 확인
        const existingUser = await User.findOne({ 
            username: username,
            email: { $ne: email } // 본인 제외
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 닉네임입니다.'
            });
        }

        // 사용자 찾기 및 업데이트
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        user.username = username;
        user.name = username; // name도 함께 업데이트
        user.updatedAt = new Date();
        await user.save();

        console.log(`닉네임 업데이트: ${email} -> ${username}`);

        res.json({
            success: true,
            message: '닉네임이 업데이트되었습니다.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('닉네임 업데이트 실패:', error);
        res.status(500).json({
            success: false,
            message: '닉네임 업데이트에 실패했습니다.'
        });
    }
});

// Gmail 사용자 로그인 API
router.post('/gmail-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        // Gmail 인증된 사용자 찾기
        const user = await User.findOne({ 
            email: email,
            provider: 'gmail',
            isEmailVerified: true
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Gmail 인증이 완료되지 않은 사용자입니다. 먼저 Gmail 인증을 완료해주세요.'
            });
        }

        // 일일 데이터 초기화 체크
        user.checkAndResetDaily();
        await user.save();

        console.log(`Gmail 사용자 로그인: ${email}`);

        res.json({
            success: true,
            message: '로그인 성공',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                isEmailVerified: user.isEmailVerified,
                provider: user.provider,
                createdAt: user.createdAt,
                // 추가 정보
                notesCount: user.notes.length,
                dailyStudyMinutes: user.dailyStudy?.totalMinutes || 0,
                plannersCount: user.planners.length
            }
        });

    } catch (error) {
        console.error('Gmail 로그인 실패:', error);
        res.status(500).json({
            success: false,
            message: '로그인 처리 중 오류가 발생했습니다.'
        });
    }
});

// 일반 사용자 프로필 업데이트 API
router.put('/update-user-profile', async (req, res) => {
    try {
        const { email, username, name } = req.body;

        if (!email || !username) {
            return res.status(400).json({
                success: false,
                message: '이메일과 닉네임이 필요합니다.'
            });
        }

        // 닉네임 중복 확인
        const existingUser = await User.findOne({ 
            username: username,
            email: { $ne: email } // 본인 제외
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 닉네임입니다.'
            });
        }

        // 사용자 찾기 및 업데이트
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        user.username = username;
        user.name = name || username;
        user.updatedAt = new Date();
        await user.save();

        console.log(`일반 사용자 프로필 업데이트: ${email} -> ${username}`);

        res.json({
            success: true,
            message: '프로필이 업데이트되었습니다.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                provider: user.provider,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('프로필 업데이트 실패:', error);
        res.status(500).json({
            success: false,
            message: '프로필 업데이트에 실패했습니다.'
        });
    }
});

// 일반 사용자 로그인 API (이메일/비밀번호)
router.post('/email-login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // 입력 검증
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: '유효한 이메일 주소를 입력해주세요.'
            });
        }

        if (!password || typeof password !== 'string' || password.length < 1) {
            return res.status(400).json({
                success: false,
                message: '비밀번호를 입력해주세요.'
            });
        }

        const sanitizedEmail = sanitizeInput(email.toLowerCase());

        // 사용자 찾기 (타이밍 공격 방지를 위해 항상 동일한 시간 소요)
        const user = await User.findOne({ 
            email: sanitizedEmail,
            provider: 'email'
        });

        // 사용자가 없어도 bcrypt 해시 비교를 수행하여 타이밍 공격 방지
        const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attacks.dummy.hash.value';
        const passwordToCompare = user ? user.password : dummyHash;
        
        const isValidPassword = await bcrypt.compare(password, passwordToCompare);

        if (!user || !isValidPassword) {
            // 로그인 실패 로그 (보안상 상세 정보는 기록하지 않음)
            console.log(`🚫 로그인 실패 시도: ${sanitizedEmail} at ${new Date().toISOString()}`);
            
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 잘못되었습니다.'
            });
        }

        // 밴 상태 확인 (만료된 임시밴만 자동 해제)
        if (user.banInfo && user.banInfo.isBanned === true) {
            const now = new Date();
            
            // 임시밴인 경우 만료일 확인
            if (user.banInfo.banType === 'temporary' && user.banInfo.banEndDate) {
                if (now > user.banInfo.banEndDate) {
                    // 밴 기간이 만료되었으면 자동으로 해제
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

        // 일일 데이터 초기화 체크
        user.checkAndResetDaily();
        await user.save();

        console.log(`일반 사용자 로그인: ${email}`);

        res.json({
            success: true,
            message: '로그인 성공',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                provider: user.provider,
                createdAt: user.createdAt,
                // 추가 정보
                notesCount: user.notes.length,
                dailyStudyMinutes: user.dailyStudy?.totalMinutes || 0,
                plannersCount: user.planners.length
            }
        });

    } catch (error) {
        console.error('일반 로그인 실패:', error);
        res.status(500).json({
            success: false,
            message: '로그인 처리 중 오류가 발생했습니다.'
        });
    }
});

// 사용자 데이터 조회 API
router.get('/user-data/:email', async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 일일 데이터 초기화 체크
        user.checkAndResetDaily();
        await user.save();
        res.json({
            success: true,
            data: {
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
                    dailyStudy: user.dailyStudy,
                    subscription: user.subscription,
                    banInfo: user.banInfo, // 밴 정보 포함
                    createdAt: user.createdAt,
                    notesCount: user.notes ? user.notes.length : 0,
                    dailyStudyMinutes: user.dailyStudy ? user.dailyStudy.totalMinutes : 0,
                    plannersCount: user.planners ? user.planners.length : 0
                },
                aiChats: user.aiChats || []
            }
        });

    } catch (error) {
        console.error('사용자 데이터 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '사용자 데이터 조회에 실패했습니다.'
        });
    }
});

// 노트 추가 API
router.post('/notes', async (req, res) => {
    try {
        const { email, title, content } = req.body;

        if (!email || !title) {
            return res.status(400).json({
                success: false,
                message: '이메일과 제목이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        console.log('노트 저장 요청:', { email, title, contentLength: content?.length, contentPreview: content?.substring(0, 100) });
        
        const newNote = {
            title: title.trim(),
            content: content || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        user.notes.push(newNote);
        await user.save();

        res.json({
            success: true,
            message: '노트가 저장되었습니다.',
            note: user.notes[user.notes.length - 1]
        });

    } catch (error) {
        console.error('노트 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 저장에 실패했습니다.'
        });
    }
});

// 노트 수정 API
router.put('/notes/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { email, title, content } = req.body;

        if (!email || !title) {
            return res.status(400).json({
                success: false,
                message: '이메일과 제목이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const note = user.notes.id(noteId);

        if (!note) {
            return res.status(404).json({
                success: false,
                message: '노트를 찾을 수 없습니다.'
            });
        }

        note.title = title.trim();
        note.content = content || '';
        note.updatedAt = new Date();

        await user.save();

        res.json({
            success: true,
            message: '노트가 수정되었습니다.',
            note: note
        });

    } catch (error) {
        console.error('노트 수정 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 수정에 실패했습니다.'
        });
    }
});

// 노트 삭제 API
router.delete('/notes/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        const noteIndex = user.notes.findIndex(note => note._id.toString() === noteId);

        if (noteIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '노트를 찾을 수 없습니다.'
            });
        }

        user.notes.splice(noteIndex, 1);
        await user.save();

        res.json({
            success: true,
            message: '노트가 삭제되었습니다.'
        });

    } catch (error) {
        console.error('노트 삭제 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 삭제에 실패했습니다.'
        });
    }
});

// 공부 시간 추가 API
router.post('/study-time', async (req, res) => {
    try {
        const { email, minutes } = req.body;

        if (!email || !minutes) {
            return res.status(400).json({
                success: false,
                message: '이메일과 공부 시간이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        user.addStudySession(parseInt(minutes));
        await user.save();

        res.json({
            success: true,
            message: '공부 시간이 저장되었습니다.',
            weeklyStudy: user.weeklyStudy
        });

    } catch (error) {
        console.error('공부 시간 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: '공부 시간 저장에 실패했습니다.'
        });
    }
});

// 주간 공부시간 조회 API
router.get('/weekly-study/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        // 주간 데이터 초기화 확인
        user.checkAndResetDaily();
        await user.save();

        res.json({
            success: true,
            weeklyStudy: user.weeklyStudy || {
                weekStart: new Date().toISOString().split('T')[0],
                dailyMinutes: {
                    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                    friday: 0, saturday: 0, sunday: 0
                },
                totalMinutes: 0,
                sessions: []
            },
            dailyStudy: user.dailyStudy || {
                date: new Date().toISOString().split('T')[0],
                totalMinutes: 0,
                sessions: []
            },
            levelSystem: user.levelSystem || {
                currentLevel: 1,
                currentExp: 0,
                totalStudyTime: 0,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error('주간 공부시간 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '주간 공부시간 조회에 실패했습니다.'
        });
    }
});

// 프로필 이미지 업데이트 API (파일 업로드 방식)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

router.put('/user/profile-image', upload.single('profileImage'), async (req, res) => {
    try {
        const { email } = req.body;
        const file = req.file;

        if (!email || !file) {
            return res.status(400).json({
                success: false,
                message: '이메일과 프로필 이미지가 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 기존 이미지 파일 삭제
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '..', user.profileImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // 새 이미지 URL 저장 (상대 경로)
        const imageUrl = `/uploads/profiles/${file.filename}`;
        user.profileImage = imageUrl;
        await user.save();

        res.json({
            success: true,
            message: '프로필 이미지가 업데이트되었습니다.',
            user: {
                email: user.email,
                name: user.name,
                username: user.username,
                profileImage: user.profileImage
            }
        });

    } catch (error) {
        console.error('프로필 이미지 업데이트 실패:', error);
        res.status(500).json({
            success: false,
            message: '프로필 이미지 업데이트에 실패했습니다.'
        });
    }
});

// 관리자 권한 설정 API (임시)
router.post('/set-admin', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        console.log('관리자 권한 설정 대상:', {
            email: user.email,
            name: user.name,
            provider: user.provider,
            currentRole: user.role
        });

        // 관리자 권한 부여
        user.role = 'admin';
        
        // banInfo가 없으면 초기화
        if (!user.banInfo) {
            user.banInfo = {
                isBanned: false,
                banType: null,
                banReason: null,
                banStartDate: null,
                banEndDate: null,
                bannedBy: null,
            };
        }

        await user.save();

        console.log('관리자 권한 설정 완료:', {
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            message: '관리자 권한이 설정되었습니다.',
            user: {
                email: user.email,
                name: user.name,
                role: user.role,
                provider: user.provider
            }
        });

    } catch (error) {
        console.error('관리자 권한 설정 실패:', error);
        res.status(500).json({
            success: false,
            message: '관리자 권한 설정에 실패했습니다.'
        });
    }
});

// 플래너 저장/업데이트 API
router.post('/planner', async (req, res) => {
    try {
        const { email, date, tasks, memo } = req.body;

        if (!email || !date) {
            return res.status(400).json({
                success: false,
                message: '이메일과 날짜가 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 해당 날짜의 플래너가 있는지 확인
        const existingPlannerIndex = user.planners.findIndex(p => p.date === date);

        if (existingPlannerIndex !== -1) {
            // 기존 플래너 업데이트
            user.planners[existingPlannerIndex].tasks = tasks || [];
            user.planners[existingPlannerIndex].memo = memo || '';
        } else {
            // 새 플래너 추가
            user.planners.push({
                date: date,
                tasks: tasks || [],
                memo: memo || ''
            });
        }

        await user.save();

        res.json({
            success: true,
            message: '플래너가 저장되었습니다.',
            planner: existingPlannerIndex !== -1 ? 
                user.planners[existingPlannerIndex] : 
                user.planners[user.planners.length - 1]
        });

    } catch (error) {
        console.error('플래너 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: '플래너 저장에 실패했습니다.'
        });
    }
});

// 플래너 조회 API
router.get('/planner/:email/:date', async (req, res) => {
    try {
        const { email, date } = req.params;

        if (!email || !date) {
            return res.status(400).json({
                success: false,
                message: '이메일과 날짜가 필요합니다.'
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

        // 해당 날짜의 플래너 찾기
        const planner = user.planners.find(p => p.date === date);
        
        if (!planner) {
            return res.status(404).json({
                success: false,
                message: '해당 날짜의 플래너가 없습니다.'
            });
        }

        res.json({
            success: true,
            planner: planner
        });

    } catch (error) {
        console.error('플래너 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '플래너 조회에 실패했습니다.'
        });
    }
});

// AI 채팅 저장 API
router.post('/ai-chat', async (req, res) => {
    try {
        const { email, role, content } = req.body;

        if (!email || !role || !content) {
            return res.status(400).json({
                success: false,
                message: '이메일, 역할, 내용이 필요합니다.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        user.addAiChat(role, content);
        await user.save();

        res.json({
            success: true,
            message: 'AI 채팅이 저장되었습니다.',
            aiChats: user.aiChats
        });

    } catch (error) {
        console.error('AI 채팅 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: 'AI 채팅 저장에 실패했습니다.'
        });
    }
});

// 회원가입 API (이메일/비밀번호)
router.post('/email-register', verificationLimiter, async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // 입력 검증
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: '유효한 이메일 주소를 입력해주세요.'
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: '비밀번호는 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.'
            });
        }

        if (!username || username.length < 2 || username.length > 20) {
            return res.status(400).json({
                success: false,
                message: '사용자명은 2-20자 사이여야 합니다.'
            });
        }

        const sanitizedEmail = sanitizeInput(email.toLowerCase());
        const sanitizedUsername = sanitizeInput(username);

        // 이메일 중복 확인
        const existingUser = await User.findOne({ 
            email: sanitizedEmail 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 이메일입니다.'
            });
        }

        // 사용자명 중복 확인
        const existingUsername = await User.findOne({ 
            username: sanitizedUsername 
        });

        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 사용자명입니다.'
            });
        }

        // 비밀번호 해시화
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 새 사용자 생성
        const newUser = new User({
            name: sanitizedUsername,
            email: sanitizedEmail,
            username: sanitizedUsername,
            password: hashedPassword,
            provider: 'email',
            providerId: sanitizedEmail,
            isEmailVerified: false, // 이메일 인증 필요
            // 기본 데이터 초기화
            notes: [],
            aiChats: [],
            planners: [],
            dailyStudy: {
                date: new Date().toISOString().split('T')[0],
                totalMinutes: 0,
                sessions: []
            }
        });

        await newUser.save();
        console.log(`새 사용자 회원가입: ${sanitizedEmail}`);

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                provider: newUser.provider,
                isEmailVerified: newUser.isEmailVerified,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('회원가입 실패:', error);
        res.status(500).json({
            success: false,
            message: '회원가입 처리 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
