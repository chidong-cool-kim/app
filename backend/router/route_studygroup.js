const express = require('express');
const router = express.Router();
const { User, StudyGroup } = require('../db');

// 이메일 기반 인증 미들웨어
const authenticateByEmail = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const email = authHeader && authHeader.split(' ')[1];

        if (!email) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: '사용자를 찾을 수 없습니다.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('인증 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: '인증 처리 중 오류가 발생했습니다.' 
        });
    }
};

// GET /api/study-groups - 스터디그룹 목록 조회
router.get('/', authenticateByEmail, async (req, res) => {
    try {
        const { search, subject, page = 1, limit = 20 } = req.query;
        
        let query = { isActive: true, isPublic: true };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (subject && subject !== '전체') {
            query.subject = subject;
        }

        const groups = await StudyGroup.find(query)
            .populate('creator', 'name email username')
            .populate('members.user', 'name email username')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await StudyGroup.countDocuments(query);

        res.json({
            success: true,
            groups: groups.map(group => ({
                _id: group._id,
                name: group.name,
                description: group.description,
                subject: group.subject,
                creator: group.creator,
                maxMembers: group.maxMembers,
                currentMembers: group.currentMembers,
                isPublic: group.isPublic,
                createdAt: group.createdAt,
                members: group.members.map(member => ({
                    user: member.user,
                    joinedAt: member.joinedAt,
                    role: member.role
                }))
            })),
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: groups.length,
                totalGroups: total
            }
        });

    } catch (error) {
        console.error('스터디그룹 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 조회에 실패했습니다.'
        });
    }
});

// GET /api/study-groups/my - 내가 참여한 스터디그룹 조회
router.get('/my', authenticateByEmail, async (req, res) => {
    try {
        const groups = await StudyGroup.find({
            $or: [
                { creator: req.user._id },
                { 'members.user': req.user._id }
            ],
            isActive: true
        })
        .populate('creator', 'name email username')
        .populate('members.user', 'name email username')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            groups: groups.map(group => ({
                _id: group._id,
                name: group.name,
                description: group.description,
                subject: group.subject,
                creator: group.creator,
                maxMembers: group.maxMembers,
                currentMembers: group.currentMembers,
                isPublic: group.isPublic,
                createdAt: group.createdAt,
                isCreator: group.creator._id.toString() === req.user._id.toString(),
                members: group.members.map(member => ({
                    user: member.user,
                    joinedAt: member.joinedAt,
                    role: member.role
                }))
            }))
        });

    } catch (error) {
        console.error('내 스터디그룹 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '내 스터디그룹 조회에 실패했습니다.'
        });
    }
});

// POST /api/study-groups - 스터디그룹 생성
router.post('/', authenticateByEmail, async (req, res) => {
    try {
        const { name, description, subject, maxMembers = 10, isPublic = true } = req.body;

        if (!name || !description || !subject) {
            return res.status(400).json({
                success: false,
                error: '필수 정보를 입력해주세요.'
            });
        }

        // 같은 이름의 그룹이 있는지 확인
        const existingGroup = await StudyGroup.findOne({ 
            name: name.trim(),
            isActive: true 
        });

        if (existingGroup) {
            return res.status(400).json({
                success: false,
                error: '이미 존재하는 스터디그룹 이름입니다.'
            });
        }

        const studyGroup = new StudyGroup({
            name: name.trim(),
            description: description.trim(),
            subject,
            creator: req.user._id,
            maxMembers: parseInt(maxMembers),
            currentMembers: 1,
            isPublic,
            members: [{
                user: req.user._id,
                role: 'admin'
            }]
        });

        await studyGroup.save();

        // populate해서 반환
        await studyGroup.populate('creator', 'name email username');
        await studyGroup.populate('members.user', 'name email username');

        res.status(201).json({
            success: true,
            message: '스터디그룹이 생성되었습니다.',
            group: {
                _id: studyGroup._id,
                name: studyGroup.name,
                description: studyGroup.description,
                subject: studyGroup.subject,
                creator: studyGroup.creator,
                maxMembers: studyGroup.maxMembers,
                currentMembers: studyGroup.currentMembers,
                isPublic: studyGroup.isPublic,
                createdAt: studyGroup.createdAt
            }
        });

    } catch (error) {
        console.error('스터디그룹 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 생성에 실패했습니다.'
        });
    }
});

// POST /api/study-groups/:groupId/join - 스터디그룹 참여
router.post('/:groupId/join', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 이미 참여한 멤버인지 확인
        const isAlreadyMember = group.members.some(
            member => member.user.toString() === req.user._id.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({
                success: false,
                error: '이미 참여한 스터디그룹입니다.'
            });
        }

        // 정원 확인
        if (group.currentMembers >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                error: '스터디그룹 정원이 가득찼습니다.'
            });
        }

        // 멤버 추가
        group.members.push({
            user: req.user._id,
            role: 'member'
        });
        group.currentMembers += 1;

        await group.save();

        res.json({
            success: true,
            message: '스터디그룹에 참여했습니다.'
        });

    } catch (error) {
        console.error('스터디그룹 참여 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 참여에 실패했습니다.'
        });
    }
});

// POST /api/study-groups/:groupId/leave - 스터디그룹 나가기
router.post('/:groupId/leave', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 생성자는 나갈 수 없음
        if (group.creator.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: '그룹 생성자는 나갈 수 없습니다. 그룹을 삭제하거나 관리자를 위임하세요.'
            });
        }

        // 멤버에서 제거
        const memberIndex = group.members.findIndex(
            member => member.user.toString() === req.user._id.toString()
        );

        if (memberIndex === -1) {
            return res.status(400).json({
                success: false,
                error: '참여하지 않은 스터디그룹입니다.'
            });
        }

        group.members.splice(memberIndex, 1);
        group.currentMembers -= 1;

        await group.save();

        res.json({
            success: true,
            message: '스터디그룹을 나갔습니다.'
        });

    } catch (error) {
        console.error('스터디그룹 나가기 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 나가기에 실패했습니다.'
        });
    }
});

// GET /api/study-groups/:groupId/detail - 스터디그룹 상세 정보 (멤버만)
router.get('/:groupId/detail', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId)
            .populate('creator', 'name email username')
            .populate('members.user', 'name email username dailyStudy weeklyStudy levelSystem');

        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 사용자가 멤버인지 확인
        const isMember = group.members.some(
            member => member.user._id.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: '이 스터디그룹의 멤버만 접근할 수 있습니다.'
            });
        }

        // 로컬 타임존 기준 날짜 계산 함수
        const getLocalDateStr = (date = new Date()) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        // 멤버들의 공부시간 정보 포함 (dailyStudy, weeklyStudy, levelSystem)
        const membersWithStudyTime = group.members.map(member => {
            // 각 사용자의 일일 데이터 초기화 확인
            if (member.user.checkAndResetDaily) {
                member.user.checkAndResetDaily();
            }
            
            const today = getLocalDateStr();
            
            return {
                _id: member.user._id,
                name: member.user.name,
                email: member.user.email,
                username: member.user.username,
                role: member.role,
                joinedAt: member.joinedAt,
                dailyStudy: member.user.dailyStudy || { 
                    date: today, 
                    totalMinutes: 0,
                    sessions: []
                },
                weeklyStudy: member.user.weeklyStudy || {
                    weekStart: today,
                    dailyMinutes: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
                    totalMinutes: 0,
                    sessions: []
                },
                levelSystem: member.user.levelSystem || {
                    currentLevel: 1,
                    currentExp: 0,
                    totalStudyTime: 0,
                    lastUpdated: new Date()
                }
            };
        });

        res.json({
            success: true,
            group: {
                _id: group._id,
                name: group.name,
                description: group.description,
                subject: group.subject,
                creator: group.creator,
                maxMembers: group.maxMembers,
                currentMembers: group.currentMembers,
                isPublic: group.isPublic,
                createdAt: group.createdAt
            },
            members: membersWithStudyTime
        });

    } catch (error) {
        console.error('스터디그룹 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 상세 정보 조회에 실패했습니다.'
        });
    }
});

// DELETE /api/study-groups/:groupId - 스터디그룹 삭제 (생성자만)
router.delete('/:groupId', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 생성자 확인
        if (group.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: '그룹 생성자만 삭제할 수 있습니다.'
            });
        }

        // 소프트 삭제
        group.isActive = false;
        await group.save();

        res.json({
            success: true,
            message: '스터디그룹이 삭제되었습니다.'
        });

    } catch (error) {
        console.error('스터디그룹 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 삭제에 실패했습니다.'
        });
    }
});

// GET /api/study-groups/:groupId/invite-link - 초대 링크 생성
router.get('/:groupId/invite-link', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 멤버인지 확인
        const isMember = group.members.some(
            member => member.user.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: '그룹 멤버만 초대 링크를 생성할 수 있습니다.'
            });
        }

        // 초대 링크 생성 (Deep Link와 Web Link 모두 제공)
        const deepLink = `myapp://invite/studygroup/${groupId}`;
        const webLink = `https://myapp.com/invite/studygroup/${groupId}`;
        
        res.json({
            success: true,
            inviteLink: {
                deepLink,
                webLink,
                groupId: group._id,
                groupName: group.name
            }
        });

    } catch (error) {
        console.error('초대 링크 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: '초대 링크 생성에 실패했습니다.'
        });
    }
});

// GET /api/study-groups/invite/:groupId - 초대 링크로 그룹 정보 조회 (인증 불필요)
router.get('/invite/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId)
            .populate('creator', 'name email username');

        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 공개 그룹 정보만 반환
        res.json({
            success: true,
            group: {
                _id: group._id,
                name: group.name,
                description: group.description,
                subject: group.subject,
                creator: group.creator,
                maxMembers: group.maxMembers,
                currentMembers: group.currentMembers,
                isPublic: group.isPublic,
                createdAt: group.createdAt
            }
        });

    } catch (error) {
        console.error('초대 그룹 정보 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '그룹 정보 조회에 실패했습니다.'
        });
    }
});

// POST /api/study-groups/invite/:groupId/accept - 초대 링크로 그룹 가입
router.post('/invite/:groupId/accept', authenticateByEmail, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.isActive) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 이미 참여한 멤버인지 확인
        const isAlreadyMember = group.members.some(
            member => member.user.toString() === req.user._id.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({
                success: false,
                error: '이미 참여한 스터디그룹입니다.'
            });
        }

        // 정원 확인
        if (group.currentMembers >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                error: '스터디그룹 정원이 가득찼습니다.'
            });
        }

        // 멤버 추가
        group.members.push({
            user: req.user._id,
            role: 'member'
        });
        group.currentMembers += 1;

        await group.save();

        res.json({
            success: true,
            message: '스터디그룹에 참여했습니다.',
            group: {
                _id: group._id,
                name: group.name
            }
        });

    } catch (error) {
        console.error('초대 수락 오류:', error);
        res.status(500).json({
            success: false,
            error: '스터디그룹 참여에 실패했습니다.'
        });
    }
});

// GET /api/study-groups/:id/members/status - 스터디그룹 멤버 온라인 상태 조회
router.get('/:id/members/status', authenticateByEmail, async (req, res) => {
    try {
        const { id } = req.params;
        
        const group = await StudyGroup.findById(id)
            .populate('members.user', 'name email username')
            .populate('creator', 'name email username');

        if (!group) {
            return res.status(404).json({
                success: false,
                error: '스터디그룹을 찾을 수 없습니다.'
            });
        }

        // 사용자가 그룹 멤버인지 확인
        const isMember = group.members.some(member => 
            member.user._id.toString() === req.user._id.toString()
        ) || group.creator._id.toString() === req.user._id.toString();

        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: '그룹 멤버만 접근할 수 있습니다.'
            });
        }

        // 온라인 사용자 목록 가져오기 (실제로는 Socket.IO에서 관리)
        // 여기서는 시뮬레이션으로 처리
        const membersWithStatus = group.members.map(member => ({
            user: member.user,
            role: member.role,
            joinedAt: member.joinedAt,
            status: 'offline', // 실제로는 Socket.IO에서 상태 확인
            lastSeen: new Date()
        }));

        res.json({
            success: true,
            group: {
                _id: group._id,
                name: group.name,
                creator: group.creator,
                members: membersWithStatus
            }
        });

    } catch (error) {
        console.error('멤버 상태 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '멤버 상태 조회에 실패했습니다.'
        });
    }
});

module.exports = router;
