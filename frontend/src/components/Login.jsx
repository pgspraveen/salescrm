// Login.jsx = login form component
// onLogin = function passed from App.jsx, called after successful login
// useState manages form field values and error messages

import { useState } from 'react';
import { loginUser } from '../api';

export default function Login({ onLogin }) {

    const [form, setForm] = useState({
        username: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await loginUser(form);
            onLogin(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>

            <input
                placeholder="Username"
                value={form.username}
                onChange={e =>
                    setForm({ ...form, username: e.target.value })
                }
                style={s.input}
                required
            />

            <div style={s.passwordWrapper}>
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={e =>
                        setForm({ ...form, password: e.target.value })
                    }
                    style={s.passwordInput}
                    required
                />

                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={s.eyeBtn}
                >
                    {showPassword ? '🙈' : '👁️'}
                </button>
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button type="submit" disabled={loading} style={s.btn}>
                {loading ? 'Logging in...' : 'Login'}
            </button>

        </form>
    );
}

const s = {
    input: {
        display: 'block',
        width: '100%',
        padding: '10px 12px',
        marginBottom: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box'
    },

    passwordWrapper: {
        position: 'relative',
        marginBottom: '12px'
    },

    passwordInput: {
        width: '100%',
        padding: '10px 45px 10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box'
    },

    eyeBtn: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '18px'
    },

    btn: {
        width: '100%',
        background: '#4f46e5',
        color: '#fff',
        padding: '11px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px'
    },

    error: {
        color: '#ef4444',
        fontSize: '13px',
        marginBottom: '8px'
    },
};