const express = require('express');
const router = express.Router();
let axios;
try {
    axios = require('axios');
} catch (e) {
    console.log('axios not found, using https module');
    const https = require('https');
    const { URL } = require('url');
    
    // axios 대체 함수
    axios = {
        post: (url, data, config) => {
            return new Promise((resolve, reject) => {
                const parsedUrl = new URL(url);
                const postData = JSON.stringify(data);
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 443,
                    path: parsedUrl.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        ...config.headers
                    }
                };
                
                const req = https.request(options, (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const parsedData = JSON.parse(responseData);
                            resolve({
                                status: res.statusCode,
                                data: parsedData
                            });
                        } catch (e) {
                            reject(new Error('Invalid JSON response'));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.write(postData);
                req.end();
            });
        }
    };
}

const { authenticateToken } = require('./route_2');
const { User } = require('../db');
const multer = require('multer');
const path = require('path');

// OpenAI API 설정
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 이미지 업로드 설정
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 제한
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

// 이메일 기반 인증 미들웨어
const authenticateByEmail = async (req, res, next) => {
    try {
        console.log('AI 인증 시도 - Headers:', req.headers);
        const authHeader = req.headers['authorization'];
        const email = authHeader && authHeader.split(' ')[1];
        console.log('추출된 이메일:', email);

        if (!email) {
            console.log('이메일이 없음');
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ email: email.toLowerCase() });
        console.log('찾은 사용자:', user ? user.email : '없음');
        
        if (!user) {
            console.log('사용자를 찾을 수 없음:', email);
            return res.status(401).json({ 
                success: false, 
                error: '사용자를 찾을 수 없습니다.' 
            });
        }

        req.user = user;
        console.log('인증 성공:', user.email);
        next();
    } catch (error) {
        console.error('인증 오류:', error);
        return res.status(500).json({ 
            success: false, 
            error: '인증 처리 중 오류가 발생했습니다.' 
        });
    }
};

// 응답 포맷팅 함수
function formatAIResponse(content) {
    // 섹션 구분을 위한 포맷팅
    let formatted = content;
    
    // 주요 섹션 헤더 포맷팅
    formatted = formatted.replace(/##\s*(.+)/g, '\n━━━━━━━━━━━━━━━━━━━━\n## $1\n━━━━━━━━━━━━━━━━━━━━\n');
    
    // 넘버링된 항목 강조
    formatted = formatted.replace(/(\d+)\.\s*\*\*(.+?)\*\*/g, '\n**$1. $2**');
    
    // 볼드 텍스트 정리
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '**$1**');
    
    return formatted.trim();
}

// POST /api/ai/chat - AI 채팅 (텍스트 전용)
router.post('/chat', authenticateByEmail, async (req, res) => {
    try {
        console.log('AI 채팅 요청 받음');
        console.log('사용자:', req.user.email);
        console.log('요청 본문:', req.body);
        
        const { message, conversationHistory, systemPrompt } = req.body;

        if (!message || !message.trim()) {
            console.log('메시지가 비어있음');
            return res.status(400).json({
                success: false,
                error: '메시지를 입력해주세요.'
            });
        }

        console.log('OpenAI API 호출 시작');

        // 시스템 프롬프트 설정 (기본값 또는 전달받은 값 사용)
        const defaultSystemPrompt = `당신은 StudyTime 앱의 AI 학습 어시스턴트예요. 학생들의 학습을 도와주는 친근하고 도움이 되는 AI입니다.

**답변 형식 규칙:**
1. **반말 금지**: 항상 "~예요", "~이에요", "~해요" 등의 요체를 사용해요
2. **구조화된 답변**: 섹션을 명확히 구분해요
3. **가독성**: 적절한 줄바꿈과 들여쓰기를 사용해요
4. **강조**: 중요한 내용은 **볼드**로 표시해요

**역할:**
- 학습 방법과 공부 팁 제공
- 시간 관리와 학습 계획 수립 도움
- 과목별 학습 전략 조언
- 학습 동기 부여와 슬럼프 극복 도움
- 학습 관련 질문에 대한 친절한 답변

**답변 스타일:**
- 친근하고 공감하는 톤
- 구체적이고 실용적인 조언
- 단계별로 명확하게 설명`;

        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

        // OpenAI API 호출
        const response = await axios.post(OPENAI_API_URL, {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: finalSystemPrompt
                },
                ...(conversationHistory || []),
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            }
        });

        console.log('OpenAI API 응답 상태:', response.status);
        const data = response.data;
        console.log('OpenAI API 응답 성공');
        const aiResponse = formatAIResponse(data.choices[0].message.content.trim());

        // AI 채팅 내역을 사용자 데이터에 저장
        try {
            req.user.addAiChat('user', message);
            req.user.addAiChat('assistant', aiResponse);
            await req.user.save();
        } catch (saveError) {
            console.error('AI 채팅 저장 오류:', saveError);
            // 저장 실패해도 응답은 보냄
        }

        res.json({
            success: true,
            response: aiResponse,
            usage: data.usage
        });

    } catch (error) {
        console.error('AI 채팅 전체 오류:', error);
        console.error('오류 스택:', error.stack);
        
        if (error.response) {
            console.error('OpenAI API 응답 오류:', error.response.status, error.response.data);
        }
        
        res.status(500).json({
            success: false,
            error: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        });
    }
});

// POST /api/ai/analyze-problem - 문제 이미지 분석
router.post('/analyze-problem', authenticateByEmail, upload.single('image'), async (req, res) => {
    try {
        const { message, systemPrompt } = req.body;
        const imageFile = req.file;

        if (!imageFile) {
            return res.status(400).json({
                success: false,
                error: '이미지를 업로드해주세요.'
            });
        }

        // 이미지를 base64로 변환
        const base64Image = imageFile.buffer.toString('base64');
        const imageDataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

        // 시스템 프롬프트 설정 (기본값 또는 전달받은 값 사용)
        const defaultImageSystemPrompt = `당신은 StudyTime 앱의 학습 문제 분석 AI 어시스턴트예요. 학생들이 올린 문제를 자세히 분석하고 풀이해주는 전문가입니다.

**답변 형식 (반드시 이 순서대로):**

## 📝 문제 분석
- 문제 유형과 난이도를 분석해요
- 어떤 개념이 필요한지 파악해요

## 📖 보기 분석 (객관식인 경우)
- 각 보기의 특징을 설명해요
- 왜 틀렸는지, 맞는지 간단히 언급해요

## 🔍 풀이 과정
**1단계: [단계 설명]**
- 구체적인 계산이나 논리 전개
- 중간 과정을 상세히 설명해요

**2단계: [단계 설명]**
- 다음 단계로 이어지는 과정
- 핵심 개념 적용 방법

**3단계: [최종 단계]**
- 최종 답을 도출하는 과정

## ✅ 정답
**정답: [명확한 정답]**
- 왜 이것이 정답인지 명확하게 설명해요

## 💡 추가 설명
- 이 문제의 핵심 개념
- 주의해야 할 점
- 유사 문제 풀이 팁

**답변 규칙:**
- 반드시 "~예요", "~해요" 요체 사용
- 친근하고 격려하는 톤 유지
- 중요한 부분은 **볼드**로 강조
- 이모지를 적절히 사용해서 가독성 높이기`;

        const finalImageSystemPrompt = systemPrompt || defaultImageSystemPrompt;

        // GPT-4 Vision API 호출
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: finalImageSystemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: message || '이 문제를 자세히 분석하고 풀이해주세요.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 3000,
                temperature: 0.5,
            }),
        });

        if (!response.ok) {
            console.error('OpenAI Vision API 오류:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI Vision API 오류 상세:', errorData);
            
            return res.status(500).json({
                success: false,
                error: 'AI 이미지 분석 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.'
            });
        }

        const data = await response.json();
        const aiResponse = formatAIResponse(data.choices[0].message.content.trim());

        // AI 채팅 내역을 사용자 데이터에 저장
        try {
            const userMessage = message || '이 문제를 자세히 분석하고 풀이해주세요.';
            req.user.addAiChat('user', `[이미지 문제] ${userMessage}`);
            req.user.addAiChat('assistant', aiResponse);
            await req.user.save();
        } catch (saveError) {
            console.error('AI 채팅 저장 오류:', saveError);
            // 저장 실패해도 응답은 보냄
        }

        res.json({
            success: true,
            response: aiResponse,
            usage: data.usage
        });

    } catch (error) {
        console.error('이미지 분석 오류:', error);
        res.status(500).json({
            success: false,
            error: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        });
    }
});

// POST /api/ai/image-chat - 이미지 포함 대화
router.post('/image-chat', authenticateByEmail, upload.single('image'), async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        const imageFile = req.file;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: '메시지를 입력해주세요.'
            });
        }

        if (!imageFile) {
            return res.status(400).json({
                success: false,
                error: '이미지를 업로드해주세요.'
            });
        }

        // 이미지를 base64로 변환
        const base64Image = imageFile.buffer.toString('base64');
        const imageDataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

        // 대화 히스토리 파싱
        let parsedHistory = [];
        try {
            parsedHistory = conversationHistory ? JSON.parse(conversationHistory) : [];
        } catch (e) {
            parsedHistory = conversationHistory || [];
        }

        // GPT-4 Vision API 호출
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 StudyTime 앱의 AI 학습 어시스턴트예요. 이미지를 분석하고 학생들의 질문에 답변해요.

**답변 규칙:**
- 항상 "~예요", "~해요" 요체 사용
- 이미지 내용을 정확히 파악하고 설명
- 구조화된 답변으로 가독성 확보
- 친근하고 도움이 되는 톤 유지`
                    },
                    ...parsedHistory,
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: message
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            console.error('OpenAI Vision API 오류:', response.status, response.statusText);
            return res.status(500).json({
                success: false,
                error: 'AI 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.'
            });
        }

        const data = await response.json();
        const aiResponse = formatAIResponse(data.choices[0].message.content.trim());

        res.json({
            success: true,
            response: aiResponse,
            usage: data.usage
        });

    } catch (error) {
        console.error('이미지 채팅 오류:', error);
        res.status(500).json({
            success: false,
            error: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        });
    }
});

module.exports = router;