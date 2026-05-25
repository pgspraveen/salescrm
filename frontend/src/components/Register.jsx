import { useState } from 'react';
import { registerUser } from '../api';

export default function Register({ onLogin }) {
    const [form,    setForm]    = useState({ username: '', email: '', password: '' });
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await registerUser(form);   // POST /api/register/
            onLogin(res.data);                       // auto-login after register
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                placeholder="Username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                style={s.input} required
            />
            <input
                type="email"        // type=email validates email format in browser
                placeholder="Email (used for notifications)"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={s.input} required
            />
            <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={s.input} required
            />
            {error && <p style={s.error}>{error}</p>}
            <button type="submit" disabled={loading} style={s.btn}>
                {loading ? 'Creating account...' : 'Create Account'}
            </button>
        </form>
    );
}

const s = {
    input: { display: 'block', width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    btn:   { width: '100%', background: '#4f46e5', color: '#fff', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
    error: { color: '#ef4444', fontSize: '13px', marginBottom: '8px' },
};