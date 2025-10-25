const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const MockExam = require('../db/mockExamSchema');
const User = require('../db/userSchema');

// drda00001@gmail.com 인증 미들웨어
const authenticateDrda = async (req, res, next) => {
    try {
        // body에서 userEmail 가져오기
        const userEmail = req.body.userEmail;

        if (!userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }

        const user = await User.findOne({ email: userEmail.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: '사용자를 찾을 수 없습니다.' 
            });
        }

        // drda00001@gmail.com 계정만 허용
        if (user.email !== 'drda00001@gmail.com') {
            return res.status(403).json({ 
                success: false, 
                error: '권한이 없습니다. 관리자만 업로드할 수 있습니다.' 
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

// uploads/mockexams 디렉토리 생성
const mockExamsDir = path.join(__dirname, '..', 'uploads', 'mockexams');
if (!fs.existsSync(mockExamsDir)) {
    fs.mkdirSync(mockExamsDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, mockExamsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
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

// POST /api/mock-exams/images - 새 모의고사 업로드 (drda00001@gmail.com만 가능)
router.post('/mock-exams/images', upload.array('images', 20), authenticateDrda, async (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title || !req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: '제목과 이미지를 모두 제공해야 합니다.' 
            });
        }

        const images = req.files.map(file => `/uploads/mockexams/${file.filename}`);

        const newMockExam = new MockExam({
            title,
            images,
            createdBy: req.user.email,
        });

        await newMockExam.save();
        console.log('모의고사 업로드 성공:', newMockExam._id);
        
        res.status(201).json({ 
            success: true, 
            message: '모의고사가 성공적으로 업로드되었습니다.', 
            mockExam: newMockExam 
        });
    } catch (error) {
        console.error('모의고사 업로드 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.', 
            error: error.message 
        });
    }
});

// GET /api/mock-exams - 모든 모의고사 조회 (누구나 가능)
router.get('/mock-exams', async (req, res) => {
    try {
        const mockExams = await MockExam.find().sort({ createdAt: -1 });
        console.log('모의고사 목록 조회:', mockExams.length, '개');
        
        res.json({ 
            success: true, 
            mockExams 
        });
    } catch (error) {
        console.error('모의고사 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.', 
            error: error.message 
        });
    }
});

// DELETE /api/mock-exams/:id - 모의고사 삭제 (drda00001@gmail.com만 가능)
router.delete('/mock-exams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.headers['authorization']?.split(' ')[1];

        if (!userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }

        const user = await User.findOne({ email: userEmail.toLowerCase() });
        if (!user || user.email !== 'drda00001@gmail.com') {
            return res.status(403).json({ 
                success: false, 
                error: '권한이 없습니다.' 
            });
        }

        const mockExam = await MockExam.findById(id);
        if (!mockExam) {
            return res.status(404).json({ 
                success: false, 
                error: '모의고사를 찾을 수 없습니다.' 
            });
        }

        // 이미지 파일 삭제
        mockExam.images.forEach(imagePath => {
            const fullPath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });

        await MockExam.findByIdAndDelete(id);

        res.json({ 
            success: true, 
            message: '모의고사가 삭제되었습니다.' 
        });
    } catch (error) {
        console.error('모의고사 삭제 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: '삭제 중 오류가 발생했습니다.' 
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Mock Exam Router is healthy' });
});

module.exports = router;