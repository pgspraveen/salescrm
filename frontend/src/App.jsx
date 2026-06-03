// App.jsx = main entry point of React app
// Controls which page to show: login/register OR main dashboard
// token stored in localStorage so user stays logged in after page refresh

import { useState } from 'react';
import Login           from './components/Login';
import Register        from './components/Register';
import Dashboard       from './components/Dashboard';
import CustomerSection from './components/CustomerSection';
import DealSection     from './components/DealSection';

export default function App() {
    // token = null means not logged in, string means logged in
    const [token,     setToken]     = useState(localStorage.getItem('token'));
    const [username,  setUsername]  = useState(localStorage.getItem('username'));
    const [page,      setPage]      = useState('login');        // login or register tab
    const [activeTab, setActiveTab] = useState('dashboard');    // which main section is open

    const handleLogin = (data) => {
        // save token and username to localStorage so they survive page refresh
        localStorage.setItem('token',    data.token);
        localStorage.setItem('username', data.username);
        setToken(data.token);
        setUsername(data.username);
    };

    const handleLogout = () => {
        // clear everything from localStorage and send user back to login
        localStorage.clear();
        setToken(null);
        setUsername(null);
        setPage('login');
    };

    // if no token exists = user not logged in = show auth screen
    if (!token) {
        return (
            <div style={s.authPage}>
                <div style={s.authCard}>
                    <h1 style={s.logo}>💼 SalesPulse CRM</h1>

                    {/* tab switcher: Login or Register */}
                    <div style={s.tabRow}>
                        <button onClick={() => setPage('login')}
                            style={{ ...s.tabBtn, ...(page === 'login' ? s.tabActive : {}) }}>
                            🔑 Login
                        </button>
                        <button onClick={() => setPage('register')}
                            style={{ ...s.tabBtn, ...(page === 'register' ? s.tabActive : {}) }}>
                            📝 Register
                        </button>
                    </div>

                    {/* conditional render: show Login or Register component */}
                    {page === 'login'
                        ? <Login    onLogin={handleLogin} />
                        : <Register onRegisterSuccess={() => setPage('login')} />
                    }
                </div>
            </div>
        );
    }

    // tabs array: each tab has id (used for state) and label (shown in sidebar)
    const tabs = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'customers', label: '👥 Customers' },
        { id: 'deals',     label: '💰 Deals'     },
    ];

    // token exists = user logged in = show main app with sidebar
    return (
        <div style={s.page}>

            {/* sidebar = left navigation menu */}
            <div style={s.sidebar}>
                <h2 style={s.sidebarLogo}>💼 SalesPulse</h2>
                <p style={s.welcomeText}>👋 Hi, {username}!</p>

                {/* render one nav button per tab */}
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        style={{ ...s.navBtn, ...(activeTab === t.id ? s.navActive : {}) }}>
                        {t.label}
                    </button>
                ))}

                {/* logout button at bottom of sidebar */}
                <button onClick={handleLogout} style={s.logoutBtn}>
                    🚪 Logout
                </button>
            </div>

            {/* main content: renders component based on active tab */}
            <div style={s.main}>
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'customers' && <CustomerSection />}
                {activeTab === 'deals'     && <DealSection />}
            </div>
        </div>
    );
}

// CSS-in-JS styles: camelCase instead of kebab-case
// e.g. backgroundColor not background-color
const s = {
    authPage:    { minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    authCard:    { background: '#fff', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
    logo:        { textAlign: 'center', color: '#4f46e5', marginBottom: '24px', fontSize: '26px' },
    tabRow:      { display: 'flex', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' },
    tabBtn:      { flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '15px', color: '#64748b' },
    tabActive:   { color: '#4f46e5', borderBottom: '2px solid #4f46e5', marginBottom: '-2px' },
    page:        { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
    sidebar:     { width: '200px', minWidth: '200px', background: '#0f172a', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
    sidebarLogo: { color: '#fff', margin: '0 0 8px', fontSize: '18px', fontWeight: 700 },
    welcomeText: { color: '#94a3b8', fontSize: '12px', marginBottom: '16px' },
    navBtn:      { background: 'transparent', color: '#94a3b8', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '13px' },
    navActive:   { background: '#1e293b', color: '#fff' },    // active tab gets darker background
    logoutBtn:   { marginTop: 'auto', background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    main:        { flex: 1, padding: '20px 16px', overflowY: 'auto', minWidth: 0, background: '#f8fafc' },
};