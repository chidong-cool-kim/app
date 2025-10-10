const express = require('express');
const router = express.Router();
const User = require('../db/userSchema');

// 노트 생성
router.post('/', async (req, res) => {
    try {
        console.log('📝 [Notes API] 노트 생성 요청:', req.body);
        
        const { email, title, content } = req.body;

        if (!email || !title) {
            return res.status(400).json({
                success: false,
                message: '이메일과 제목은 필수입니다.'
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 사용자의 notes 배열에 직접 추가
        if (!user.notes) {
            user.notes = [];
        }

        const newNote = {
            title,
            content: content || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        user.notes.push(newNote);
        await user.save();

        // 방금 추가된 노트 가져오기 (마지막 노트)
        const savedNote = user.notes[user.notes.length - 1];
        console.log('✅ [Notes API] 노트 저장 완료:', savedNote._id);

        res.status(201).json({
            success: true,
            message: '노트가 성공적으로 생성되었습니다.',
            note: savedNote
        });

    } catch (error) {
        console.error('❌ [Notes API] 노트 생성 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 생성 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 노트 수정
router.put('/:noteId', async (req, res) => {
    try {
        console.log('📝 [Notes API] 노트 수정 요청:', req.params.noteId, req.body);
        
        const { noteId } = req.params;
        const { email, title, content } = req.body;

        if (!email || !title) {
            return res.status(400).json({
                success: false,
                message: '이메일과 제목은 필수입니다.'
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 사용자의 notes 배열에서 노트 찾기 및 수정
        const noteIndex = user.notes.findIndex(note => note._id.toString() === noteId);
        if (noteIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '노트를 찾을 수 없습니다.'
            });
        }

        // 노트 수정
        user.notes[noteIndex].title = title;
        user.notes[noteIndex].content = content;
        user.notes[noteIndex].updatedAt = new Date();

        await user.save();

        const updatedNote = user.notes[noteIndex];
        console.log('✅ [Notes API] 노트 수정 완료:', updatedNote._id);

        res.json({
            success: true,
            message: '노트가 성공적으로 수정되었습니다.',
            note: updatedNote
        });

    } catch (error) {
        console.error('❌ [Notes API] 노트 수정 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 수정 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 노트 삭제
router.delete('/:noteId', async (req, res) => {
    try {
        console.log('🗑️ [Notes API] 노트 삭제 요청:', req.params.noteId, req.body);
        
        const { noteId } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일은 필수입니다.'
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 사용자의 notes 배열에서 노트 찾기 및 삭제
        const noteIndex = user.notes.findIndex(note => note._id.toString() === noteId);
        if (noteIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '노트를 찾을 수 없습니다.'
            });
        }

        // 노트 삭제
        user.notes.splice(noteIndex, 1);
        await user.save();

        console.log('✅ [Notes API] 노트 삭제 완료:', noteId);

        res.json({
            success: true,
            message: '노트가 성공적으로 삭제되었습니다.'
        });

    } catch (error) {
        console.error('❌ [Notes API] 노트 삭제 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 삭제 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 특정 노트 조회
router.get('/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '이메일은 필수입니다.'
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 사용자의 notes 배열에서 노트 찾기
        const note = user.notes.find(note => note._id.toString() === noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: '노트를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            note
        });

    } catch (error) {
        console.error('❌ [Notes API] 노트 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '노트 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
