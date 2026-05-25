// Dashboard.jsx = overview page showing key sales numbers and AI insights
// First page user sees after login
// useEffect fetches deals once on load to calculate stats

import { useState, useEffect } from 'react';
import { getDeals, getSalesInsights } from '../api';

export default function Dashboard() {
    const [deals,    setDeals]    = useState([]);   // all deals from API
    const [insights, setInsights] = useState(null); // AI insights, null until button clicked
    const [loading,  setLoading]  = useState(false);

    // useEffect with [] = runs once when component first loads
    useEffect(() => {
        getDeals().then(r => setDeals(r.data));
    }, []);

    const loadInsights = async () => {
        setLoading(true);
        const res = await getSalesInsights(30);  // analyze last 30 days
        setInsights(res.data);
        setLoading(false);
    };

    // calculate stats from deals array using filter and reduce
    const won    = deals.filter(d => d.stage === 'closed_won').length;
    const lost   = deals.filter(d => d.stage === 'closed_lost').length;
    const active = deals.filter(d => !['closed_won','closed_lost'].includes(d.stage)).length;

    // reduce = loop through array and sum up values
    const pipeline = deals
        .filter(d => !['closed_won','closed_lost'].includes(d.stage))
        .reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

    // stats array: each object = one stat card on dashboard
    // color = number color, bg = icon background color
    const stats = [
        { label: 'Total Deals',    value: deals.length,                   color: '#4f46e5', bg: '#ede9fe', icon: '📋' },
        { label: 'Active',         value: active,                         color: '#f59e0b', bg: '#fef3c7', icon: '⚙️' },
        { label: 'Won',            value: won,                            color: '#10b981', bg: '#d1fae5', icon: '🏆' },
        { label: 'Lost',           value: lost,                           color: '#ef4444', bg: '#fee2e2', icon: '❌' },
        { label: 'Pipeline Value', value: `$${pipeline.toLocaleString()}`, color: '#0369a1', bg: '#e0f2fe', icon: '💰' },
    ];

    return (
        <div>
            <h1 style={s.title}>📊 Dashboard</h1>

            {/* stat cards grid: auto-fit = fills available columns automatically */}
            <div style={s.statsRow}>
                {stats.map(stat => (
                    // borderTop = colored line at top of each card matching stat color
                    <div key={stat.label} style={{ ...s.statCard, borderTop: `3px solid ${stat.color}` }}>
                        {/* icon box with soft background color */}
                        <div style={{ ...s.iconBox, background: stat.bg }}>
                            <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                        </div>
                        <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* AI insights card: empty until Get Insights button clicked */}
            <div style={s.card}>
                <div style={s.cardHeader}>
                    <h3 style={s.cardTitle}>🤖 AI Sales Insights</h3>
                    {/* disabled while loading to prevent double clicks */}
                    <button onClick={loadInsights} disabled={loading} style={s.aiBtn}>
                        {loading ? '⏳ Analyzing...' : '✨ Get Insights'}
                    </button>
                </div>

                {/* show placeholder text before insights are loaded */}
                {!insights && (
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                        Click "Get Insights" to analyze your sales pipeline.
                    </p>
                )}

                {/* show real insights once API response received */}
                {insights && (
                    <div>
                        {/* performance_summary = one paragraph overview */}
                        <p style={s.summary}>{insights.performance_summary}</p>

                        {/* two column grid: insights on left, actions on right */}
                        <div style={s.insightGrid}>
                            <div>
                                <div style={s.insightTitle}>💡 Key Insights</div>
                                {/* map = loop through array and render one div per item */}
                                {insights.key_insights.map((item, i) => (
                                    <div key={i} style={s.insightItem}>• {item}</div>
                                ))}
                            </div>
                            <div>
                                <div style={s.insightTitle}>✅ Action Items</div>
                                {insights.action_items.map((item, i) => (
                                    <div key={i} style={s.insightItem}>• {item}</div>
                                ))}
                            </div>
                        </div>

                        {/* forecast = revenue prediction for next 30 days */}
                        <div style={s.forecast}>📈 {insights.forecast}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    title:       { fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' },
    // auto-fit = create as many columns as fit, each minimum 140px wide
    statsRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' },
    statCard:    { background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', textAlign: 'center' },
    iconBox:     { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' },
    statNum:     { fontSize: '26px', fontWeight: 700 },
    statLabel:   { color: '#64748b', fontSize: '12px', marginTop: '4px' },
    card:        { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
    cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    cardTitle:   { margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' },
    aiBtn:       { background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    summary:     { color: '#475569', lineHeight: 1.6, marginBottom: '16px' },
    // two equal columns for insights and actions
    insightGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' },
    insightTitle:{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '8px' },
    insightItem: { fontSize: '13px', color: '#475569', marginBottom: '6px', lineHeight: 1.5 },
    // green background box for forecast section
    forecast:    { background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', color: '#166534', fontSize: '13px' },
};