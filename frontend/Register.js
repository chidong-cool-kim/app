import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleRegister = async () => {
        // 입력값 검증
        if (!email || !username || !password || !name) {
            setError('모든 필드를 입력해주세요.');
            return;
        }

        try {
            console.log('회원가입 요청 데이터:', { email, username, password, name }); // 디버깅 로그 추가

            const response = await axios.post('http://192.168.45.53:5000/api/auth/register', {
                email,
                username,
                password,
                name,
            });

            console.log('회원가입 성공:', response.data);
            alert('회원가입이 완료되었습니다!');
        } catch (err) {
            console.error('회원가입 오류:', err.response?.data || err.message);
            setError(err.response?.data?.message || '회원가입에 실패했습니다.');
        }
    };

    return (
        <div>
            <h1>회원가입</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="text"
                placeholder="사용자명"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <button onClick={handleRegister}>회원가입</button>
        </div>
    );
};

export default Register;
