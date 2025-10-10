const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 플래너 데이터 조회
router.get('/planner/:email/:date', async (req, res) => {
    try {
        const { email, date } = req.params;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 해당 날짜의 플래너 데이터 찾기
        const plannerData = user.planners.find(p => p.date === date);
        
        if (!plannerData) {
            return res.json({ 
                success: true, 
                planner: { date, tasks: [], memo: '' } 
            });
        }

        res.json({ 
            success: true, 
            planner: plannerData 
        });
    } catch (error) {
        console.error('플래너 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 플래너 데이터 저장/업데이트
router.post('/planner', async (req, res) => {
    try {
        const { email, date, tasks, memo } = req.body;
        
        console.log('📅 [Planner API] 플래너 저장 요청:', {
            email,
            date,
            tasksCount: tasks?.length || 0,
            memoLength: memo?.length || 0
        });

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 기존 플래너 데이터 찾기
        const existingPlannerIndex = user.planners.findIndex(p => p.date === date);
        
        const plannerData = {
            date,
            tasks: tasks || [],
            memo: memo || '',
            updatedAt: new Date()
        };

        if (existingPlannerIndex >= 0) {
            // 기존 데이터 업데이트
            user.planners[existingPlannerIndex] = plannerData;
        } else {
            // 새 데이터 추가
            user.planners.push(plannerData);
        }

        await user.save();

        console.log('📅 [Planner API] 플래너 저장 성공');
        res.json({ 
            success: true, 
            planner: plannerData 
        });
    } catch (error) {
        console.error('플래너 저장 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
