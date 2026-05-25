// Login.jsx = login form component
// onLogin = function passed from App.jsx, called after successful login
// useState manages form field values and error messages

import { useState } from 'react';
import { loginUser } from '../api';

export default function Login({ onLogin }) {
    // form = object holding input values, updated on every keystroke
    const [form,    setForm]    = useState({ username: '', password: '' });
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();     // prevent page refresh on form submit
        setLoading(true);
        setError('');

        try {
            const res = await loginUser(form);  // POST /api/login/
            onLogin(res.data);                   // pass token up to App.jsx
        } catch (err) {
            // err.response.data.error = error message from Django
            setError(err.response?.data?.error || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                placeholder="Username"
                value={form.username}
                // spread: copy all form fields, only update username
                onChange={e => setForm({ ...form, username: e.target.value })}
                style={s.input}
                required
            />
            <input
                type="password"     // type=password hides characters
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={s.input}
                required
            />
            {/* only show error div if error string is not empty */}
            {error && <p style={s.error}>{error}</p>}
            <button type="submit" disabled={loading} style={s.btn}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
}

const s = {
    input: { display: 'block', width: '100%', padding: '10px 12px', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    btn:   { width: '100%', background: '#4f46e5', color: '#fff', padding: '11px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' },
    error: { color: '#ef4444', fontSize: '13px', marginBottom: '8px' },
};