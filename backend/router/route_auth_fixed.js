const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../db/userSchema');
const Verification = require('../db/verificationSchema');
const nodemailer = require('nodemailer');

// JWT 시크릿 키
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d'; // 7일

// 이메일 전송 설정
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// 인증코드 생성 함수
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/auth/send-verification-code - 인증코드 발송
router.post('/send-verification-code', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: '이메일을 입력해주세요.' });
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: '올바른 이메일 형식이 아닙니다.' });
        }

        // Gmail만 허용
        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ success: false, error: 'Gmail 주소만 사용 가능합니다.' });
        }

        // 이미 가입된 이메일인지 확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: '이미 가입된 이메일입니다.',
                user: {
                    email: existingUser.email,
                    username: existingUser.username,
                    provider: existingUser.provider,
                    createdAt: existingUser.createdAt
                }
            });
        }

        // 인증코드 생성
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료

        // 기존 인증코드 삭제 후 새로 생성
        await Verification.deleteMany({ email: email.toLowerCase() });
        await Verification.create({
            email: email.toLowerCase(),
            code,
            expiresAt
        });

        // 이메일 발송
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'StudyTime 이메일 인증코드',
            html: `
                <h2>StudyTime 이메일 인증</h2>
                <p>인증코드: <strong>${code}</strong></p>
                <p>이 코드는 5분간 유효합니다.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ 
            success: true, 
            message: '인증코드가 발송되었습니다.',
            expiresIn: 300 // 5분
        });
    } catch (error) {
        console.error('인증코드 발송 오류:', error);
        res.status(500).json({ success: false, error: '인증코드 발송에 실패했습니다.' });
    }
});

// POST /api/auth/verify-code - 인증코드 확인
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, error: '이메일과 인증코드를 입력해주세요.' });
        }

        // 인증코드 조회
        const verification = await Verification.findOne({ 
            email: email.toLowerCase(),
            code: code.trim()
        });

        if (!verification) {
            return res.status(400).json({ success: false, error: '인증코드가 올바르지 않습니다.' });
        }

        // 만료 확인
        if (new Date() > verification.expiresAt) {
            await Verification.deleteOne({ _id: verification._id });
            return res.status(400).json({ success: false, error: '인증코드가 만료되었습니다.' });
        }

        // 인증 완료 표시
        verification.verified = true;
        await verification.save();

        res.json({ success: true, message: '이메일 인증이 완료되었습니다.' });
    } catch (error) {
        console.error('인증코드 확인 오류:', error);
        res.status(500).json({ success: false, error: '인증코드 확인에 실패했습니다.' });
    }
});

// POST /api/auth/signup - 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, provider, providerId } = req.body;

        // 필수 정보 확인
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: '모든 필수 정보를 입력해주세요.' });
        }

        // 비밀번호 길이 확인
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '비밀번호는 6자 이상이어야 합니다.' });
        }

        // 이메일 인증 확인 (일반 회원가입인 경우)
        if (provider === 'email' || !provider) {
            const verification = await Verification.findOne({ 
                email: email.toLowerCase(),
                verified: true
            });

            if (!verification) {
                return res.status(400).json({ success: false, error: '이메일 인증을 완료해주세요.' });
            }
        }

        // 이미 가입된 이메일인지 재확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, error: '이미 가입된 이메일입니다.' });
        }

        // 비밀번호 해시화
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 사용자 생성
        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword, // 해시화된 비밀번호 저장
            provider: provider || 'email',
            providerId: providerId || email.toLowerCase(),
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 인증코드 삭제
        await Verification.deleteMany({ email: email.toLowerCase() });

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                userId: newUser._id,
                email: newUser.email 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ 
            success: true, 
            message: '회원가입이 완료되었습니다.',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                provider: newUser.provider,
                isEmailVerified: newUser.isEmailVerified,
                createdAt: newUser.createdAt
            },
            token
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ success: false, error: '회원가입에 실패했습니다.' });
    }
});

// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' });
        }

        // 사용자 조회
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // OAuth 사용자는 일반 로그인 불가
        if (user.provider !== 'email' && user.provider !== 'local') {
            return res.status(400).json({ 
                success: false, 
                error: `${user.provider} 계정으로 가입하셨습니다. 해당 방법으로 로그인해주세요.` 
            });
        }

        // 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 마지막 로그인 시간 업데이트
        user.lastLoginAt = new Date();
        await user.save();

        res.json({ 
            success: true, 
            message: '로그인 성공',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                provider: user.provider,
                subscription: user.subscription,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ success: false, error: '로그인에 실패했습니다.' });
    }
});

// POST /api/auth/oauth-login - OAuth 로그인 (Google, Apple 등)
router.post('/oauth-login', async (req, res) => {
    try {
        const { email, name, provider, providerId, profileImage } = req.body;

        if (!email || !provider || !providerId) {
            return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
        }

        // 기존 사용자 확인
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // 기존 사용자 - 프로필 이미지 업데이트
            if (profileImage) {
                user.profileImage = profileImage;
            }
            user.lastLoginAt = new Date();
            await user.save();
        } else {
            // 신규 사용자 생성
            user = await User.create({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                provider,
                providerId,
                profileImage,
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ 
            success: true, 
            message: 'OAuth 로그인 성공',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                provider: user.provider,
                subscription: user.subscription,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error) {
        console.error('OAuth 로그인 오류:', error);
        res.status(500).json({ success: false, error: 'OAuth 로그인에 실패했습니다.' });
    }
});

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: '인증 토큰이 필요합니다.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

// GET /api/auth/verify-token - 토큰 검증
router.get('/verify-token', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        res.json({ 
            success: true, 
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
                provider: user.provider,
                subscription: user.subscription,
                isEmailVerified: user.isEmailVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        res.status(500).json({ success: false, error: '토큰 검증에 실패했습니다.' });
    }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
