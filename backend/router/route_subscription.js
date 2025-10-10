const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 구독 정보 업데이트
router.post('/subscription', async (req, res) => {
    try {
        const { email, planId, planName, price, aiQuestions, aiModel, startDate, endDate, isActive, productId, transactionId, purchaseToken, grantedBy } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        // 관리자가 부여하는 경우 권한 확인
        if (grantedBy) {
            const adminUser = await User.findOne({ email: grantedBy });
            if (!adminUser || adminUser.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '관리자 권한이 필요합니다.'
                });
            }
        }

        // 사용자 찾기
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 구독 정보 업데이트
        const subscriptionData = {
            planId,
            planName,
            price,
            aiQuestions,
            aiModel,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive,
            productId,
            transactionId,
            purchaseToken,
            grantedBy, // 관리자가 부여한 경우 기록
            updatedAt: new Date()
        };

        user.subscription = subscriptionData;
        await user.save();

        res.json({
            success: true,
            message: '구독 정보가 업데이트되었습니다.',
            subscription: subscriptionData
        });

    } catch (error) {
        console.error('구독 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '구독 정보 업데이트에 실패했습니다.',
            error: error.message
        });
    }
});

// 구독 정보 조회
router.get('/subscription/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            subscription: user.subscription || null
        });

    } catch (error) {
        console.error('구독 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '구독 정보 조회에 실패했습니다.',
            error: error.message
        });
    }
});

// AI 질문 사용량 추가
router.post('/ai-usage', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일이 필요합니다.'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // AI 사용량 증가
        if (!user.aiUsage) {
            user.aiUsage = {
                questionsUsed: 0,
                lastResetDate: new Date()
            };
        }

        user.aiUsage.questionsUsed += 1;
        await user.save();

        res.json({
            success: true,
            message: 'AI 사용량이 업데이트되었습니다.',
            aiUsage: user.aiUsage
        });

    } catch (error) {
        console.error('AI 사용량 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: 'AI 사용량 업데이트에 실패했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
