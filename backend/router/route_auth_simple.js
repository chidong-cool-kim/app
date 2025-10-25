const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');
const Verification = require('../db/verificationSchema');
const nodemailer = require('nodemailer');

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || process.env.EMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD
    }
});

// 인증코드 생성
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

        // Gmail만 허용
        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ success: false, error: 'Gmail 주소만 사용 가능합니다.' });
        }

        // 이미 가입된 이메일인지 확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: '이미 가입된 이메일입니다.'
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
            from: process.env.GMAIL_USER || process.env.EMAIL_USER,
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
            message: '인증코드가 발송되었습니다.'
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

// POST /api/auth/signup - 회원가입 (password를 MongoDB에 저장)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, username, provider, providerId, skipEmailVerification } = req.body;

        console.log('📝 회원가입 요청:', { name, email, username, password: '***', provider, skipEmailVerification });

        // 필수 정보 확인
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: '모든 필수 정보를 입력해주세요.' });
        }

        // 비밀번호 길이 확인
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: '비밀번호는 6자 이상이어야 합니다.' });
        }

        // 이메일 인증 확인 (skipEmailVerification이 true면 생략)
        if (!skipEmailVerification) {
            const verification = await Verification.findOne({ 
                email: email.toLowerCase(),
                verified: true
            });

            if (!verification) {
                return res.status(400).json({ success: false, error: '이메일 인증을 완료해주세요.' });
            }
        } else {
            console.log('✅ skipEmailVerification=true, 이메일 인증 확인 생략');
        }

        // 이미 가입된 이메일인지 재확인
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, error: '이미 가입된 이메일입니다.' });
        }

        // 닉네임 중복 확인 (username이 제공된 경우)
        if (username) {
            const existingUsername = await User.findOne({ username: username.trim() });
            if (existingUsername) {
                return res.status(400).json({ success: false, error: '이미 사용 중인 닉네임입니다.' });
            }
        }

        // 사용자 생성 (password와 username을 MongoDB에 저장)
        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase(),
            password: password, // password를 그대로 MongoDB에 저장
            username: username ? username.trim() : undefined, // username이 있으면 저장
            provider: provider || 'email',
            providerId: providerId || email.toLowerCase(),
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('✅ 회원가입 성공:', newUser.email, username ? `(닉네임: ${username})` : '', 'password 저장됨');

        // 인증코드 삭제
        await Verification.deleteMany({ email: email.toLowerCase() });

        res.json({ 
            success: true, 
            message: '회원가입이 완료되었습니다.',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
                provider: newUser.provider,
                isEmailVerified: newUser.isEmailVerified,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('❌ 회원가입 오류:', error);
        res.status(500).json({ success: false, error: '회원가입에 실패했습니다.' });
    }
});

// POST /api/auth/login - 로그인 (email과 password 모두 검증)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 로그인 요청:', { email, password: '***' });

        if (!email || !password) {
            return res.status(400).json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' });
        }

        // 사용자 조회
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('❌ 사용자 없음:', email);
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // password 확인 (정확히 일치해야 함)
        if (user.password !== password) {
            console.log('❌ 비밀번호 불일치:', email);
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        console.log('✅ 로그인 성공:', user.email);

        // 마지막 로그인 시간 업데이트
        user.lastActivity = new Date();
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
            }
        });
    } catch (error) {
        console.error('❌ 로그인 오류:', error);
        res.status(500).json({ success: false, error: '로그인에 실패했습니다.' });
    }
});

// POST /api/auth/gmail-login - Gmail 간단 로그인 (이메일만으로)
router.post('/gmail-login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: '이메일을 입력해주세요.' });
        }

        // 사용자 조회
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // 신규 사용자 생성 (기본 password 사용)
            user = await User.create({
                name: email.split('@')[0],
                email: email.toLowerCase(),
                password: 'rlaalswns00~', // 기본 password
                provider: 'gmail',
                providerId: email.toLowerCase(),
                isEmailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Gmail 신규 사용자 생성:', user.email);
        }

        // 마지막 활동 시간 업데이트
        user.lastActivity = new Date();
        await user.save();

        res.json({ 
            success: true, 
            message: 'Gmail 로그인 성공',
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
        console.error('❌ Gmail 로그인 오류:', error);
        res.status(500).json({ success: false, error: 'Gmail 로그인에 실패했습니다.' });
    }
});

// POST /api/auth/update-username - 닉네임 업데이트
router.post('/update-username', async (req, res) => {
    try {
        const { email, username } = req.body;

        console.log('📝 닉네임 업데이트 요청:', { email, username });

        if (!email || !username) {
            return res.status(400).json({ success: false, error: '이메일과 닉네임을 입력해주세요.' });
        }

        // 닉네임 중복 확인
        const existingUser = await User.findOne({ username: username.trim() });
        if (existingUser && existingUser.email !== email.toLowerCase()) {
            return res.status(400).json({ success: false, error: '이미 사용 중인 닉네임입니다.' });
        }

        // 사용자 찾기 및 업데이트
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        user.username = username.trim();
        user.updatedAt = new Date();
        await user.save();

        console.log('✅ 닉네임 업데이트 성공:', user.email, '->', user.username);

        res.json({ 
            success: true, 
            message: '닉네임이 설정되었습니다.',
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
        console.error('❌ 닉네임 업데이트 오류:', error);
        res.status(500).json({ success: false, error: '닉네임 업데이트에 실패했습니다.' });
    }
});

module.exports = router;
