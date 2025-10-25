const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 구독 만료 체크 함수
async function checkExpiredSubscriptions() {
    try {
        const now = new Date();
        
        // 활성 구독 중 만료된 것들 찾기
        const expiredUsers = await User.find({
            'subscription.isActive': true,
            'subscription.endDate': { $lt: now }
        });

        if (expiredUsers.length > 0) {
            console.log(`만료된 구독 ${expiredUsers.length}개 발견`);
            
            for (const user of expiredUsers) {
                user.subscription.isActive = false;
                user.subscription.updatedAt = new Date();
                await user.save();
                console.log(`구독 만료 처리: ${user.email}`);
            }
        }
    } catch (error) {
        console.error('구독 만료 체크 오류:', error);
    }
}

// 매 시간마다 구독 만료 체크 (1시간 = 3600000ms)
setInterval(checkExpiredSubscriptions, 3600000);

// 서버 시작 시 즉시 한 번 실행
checkExpiredSubscriptions();

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

// 구독 정보 조회 (만료 체크 포함)
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

        // 구독 만료 체크
        if (user.subscription && user.subscription.isActive) {
            const now = new Date();
            const endDate = new Date(user.subscription.endDate);
            
            // 만료되었으면 isActive를 false로 변경
            if (endDate < now) {
                user.subscription.isActive = false;
                user.subscription.updatedAt = new Date();
                await user.save();
                
                console.log(`구독 만료: ${email}, 만료일: ${endDate}`);
            }
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
