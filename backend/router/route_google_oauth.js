const express = require('express');
const router = express.Router();
const { User } = require('../db');

// POST /api/auth/google-login - Google OAuth 로그인
router.post('/google-login', async (req, res) => {
    try {
        const { email, name, googleId, picture, accessToken } = req.body;

        console.log('Google OAuth 로그인 요청:', { email, name, googleId });

        // 필수 필드 검증
        if (!email || !googleId) {
            return res.status(400).json({
                success: false,
                message: '이메일과 Google ID는 필수입니다.'
            });
        }

        // 이메일로 기존 사용자 찾기
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // 기존 사용자가 있는 경우
            console.log('기존 사용자 발견:', user.email);

            // Google 계정으로 처음 로그인하는 경우 provider 정보 업데이트
            if (user.provider !== 'google') {
                user.provider = 'google';
                user.providerId = googleId;
                if (picture) {
                    user.profileImage = picture;
                }
                await user.save();
                console.log('사용자 provider 정보 업데이트됨');
            }

            // 사용자 정보 반환
            return res.status(200).json({
                success: true,
                message: '로그인 성공',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    picture: user.profileImage || picture,
                    provider: user.provider,
                    createdAt: user.createdAt,
                    notesCount: user.notes?.length || 0,
                    dailyStudyMinutes: user.dailyStudyMinutes || 0,
                    plannersCount: user.planners?.length || 0,
                }
            });
        }

        // 새 사용자 생성
        console.log('새 Google 사용자 생성 중...');
        
        const newUser = new User({
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            username: null, // 나중에 설정
            provider: 'google',
            providerId: googleId,
            profileImage: picture || null,
            isEmailVerified: true, // Google OAuth는 이메일 인증됨
            password: null, // OAuth 사용자는 비밀번호 없음
        });

        await newUser.save();
        console.log('새 Google 사용자 생성 완료:', newUser.email);

        return res.status(201).json({
            success: true,
            message: '회원가입 성공',
            user: {
                id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                username: newUser.username,
                picture: newUser.profileImage,
                provider: newUser.provider,
                createdAt: newUser.createdAt,
                notesCount: 0,
                dailyStudyMinutes: 0,
                plannersCount: 0,
            }
        });

    } catch (error) {
        console.error('Google OAuth 로그인 오류:', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/auth/google-update-username - Google 사용자 닉네임 설정
router.put('/google-update-username', async (req, res) => {
    try {
        const { email, username } = req.body;

        console.log('Google 사용자 닉네임 설정 요청:', { email, username });

        if (!email || !username) {
            return res.status(400).json({
                success: false,
                message: '이메일과 닉네임은 필수입니다.'
            });
        }

        // 닉네임 유효성 검사
        const usernameRegex = /^[가-힣a-zA-Z0-9]{2,12}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: '닉네임은 2-12자의 한글, 영문, 숫자만 사용 가능합니다.'
            });
        }

        // 닉네임 중복 확인
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 닉네임입니다.'
            });
        }

        // 사용자 찾기 및 업데이트
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        user.username = username;
        user.name = username; // name도 username으로 업데이트
        await user.save();

        console.log('닉네임 설정 완료:', username);

        return res.status(200).json({
            success: true,
            message: '닉네임이 설정되었습니다.',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                username: user.username,
                picture: user.profileImage,
                provider: user.provider,
                createdAt: user.createdAt,
                notesCount: user.notes?.length || 0,
                dailyStudyMinutes: user.dailyStudyMinutes || 0,
                plannersCount: user.planners?.length || 0,
            }
        });

    } catch (error) {
        console.error('닉네임 설정 오류:', error);
        return res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
