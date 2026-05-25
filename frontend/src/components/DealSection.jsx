// DealSection.jsx = full CRUD for deals + AI win/loss prediction + activity log
// Each deal card shows stage, value, prediction result, and activities

import { useState, useEffect } from 'react';
import {
    getDeals, createDeal, updateDeal, deleteDeal,
    predictDeal, getCustomers, getActivities, createActivity, deleteActivity
} from '../api';

export default function DealSection() {
    const [deals,      setDeals]      = useState([]);
    const [customers,  setCustomers]  = useState([]);
    const [showForm,   setShowForm]   = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [predictions, setPred]      = useState({});   // { dealId: prediction }
    const [activities,  setActivities] = useState({});  // { dealId: [activities] }
    const [showAct,    setShowAct]    = useState({});   // { dealId: true/false }
    const [actForm,    setActForm]    = useState({});   // { dealId: true/false }

    // new activity form fields
    const [newAct, setNewAct] = useState({
        activity_type: 'call', subject: '', description: '', outcome: '', activity_date: ''
    });

    const emptyForm = { customer: '', title: '', value: '', stage: 'prospecting', probability: 20, expected_close: '', notes: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        getDeals().then(r => setDeals(r.data));
        getCustomers().then(r => setCustomers(r.data));
    }, []);

    const load = () => getDeals().then(r => setDeals(r.data));

    const resetForm = () => {
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editing) {
            await updateDeal(editing.id, form);
        } else {
            await createDeal(form);
        }
        resetForm();
        load();
    };

    const handleEdit = (d) => {
        setEditing(d);
        setForm({
            customer: d.customer, title: d.title, value: d.value,
            stage: d.stage, probability: d.probability,
            expected_close: d.expected_close, notes: d.notes || ''
        });
        setShowForm(true);
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this deal?')) return;
        await deleteDeal(id);
        load();
    };

    // call AI prediction endpoint for specific deal
    const handlePredict = async (id) => {
        setPred(prev => ({ ...prev, [id]: { loading: true } }));
        const res = await predictDeal(id);
        setPred(prev => ({ ...prev, [id]: res.data }));
    };

    // toggle activities section - fetch from API on first open
    const toggleActivities = async (dealId) => {
        const isOpen = showAct[dealId];
        setShowAct(prev => ({ ...prev, [dealId]: !isOpen }));
        if (!isOpen) {
            const res = await getActivities(null, dealId);
            setActivities(prev => ({ ...prev, [dealId]: res.data }));
        }
    };

    const handleAddActivity = async (dealId, customerId) => {
        await createActivity({ ...newAct, customer: customerId, deal: dealId });
        setActForm(prev => ({ ...prev, [dealId]: false }));
        setNewAct({ activity_type: 'call', subject: '', description: '', outcome: '', activity_date: '' });
        // refresh activities list for this deal
        const res = await getActivities(null, dealId);
        setActivities(prev => ({ ...prev, [dealId]: res.data }));
    };

    const handleDeleteActivity = async (actId, dealId) => {
        if (!confirm('Delete this activity?')) return;
        await deleteActivity(actId);
        const res = await getActivities(null, dealId);
        setActivities(prev => ({ ...prev, [dealId]: res.data }));
    };

    // stage badge colors - each stage gets distinct color
    const stageColor = {
        prospecting: '#6366f1', qualification: '#8b5cf6',
        proposal: '#f59e0b', negotiation: '#f97316',
        closed_won: '#10b981', closed_lost: '#ef4444'
    };

    const actIcon = { call: '📞', email: '📧', meeting: '🤝', demo: '💻', follow_up: '🔔' };

    return (
        <div>
            <div style={s.header}>
                <h1 style={s.title}>Deals</h1>
                <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={s.addBtn}>
                    {showForm ? 'Cancel' : '+ New Deal'}
                </button>
            </div>

            {showForm && (
                <div style={s.formCard}>
                    <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>
                        {editing ? 'Edit Deal' : 'New Deal'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={s.grid}>
                            {/* dropdown populated from customers API response */}
                            <select value={form.customer} required
                                onChange={e => setForm({ ...form, customer: e.target.value })} style={s.input}>
                                <option value="">Select Customer *</option>
                                {customers.map(c =>
                                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                                )}
                            </select>
                            <input placeholder="Deal Title *" value={form.title} required
                                onChange={e => setForm({ ...form, title: e.target.value })} style={s.input} />
                            <input placeholder="Deal Value ($) *" type="number" value={form.value} required
                                onChange={e => setForm({ ...form, value: e.target.value })} style={s.input} />
                            <select value={form.stage}
                                onChange={e => setForm({ ...form, stage: e.target.value })} style={s.input}>
                                <option value="prospecting">Prospecting</option>
                                <option value="qualification">Qualification</option>
                                <option value="proposal">Proposal</option>
                                <option value="negotiation">Negotiation</option>
                                <option value="closed_won">Closed Won</option>
                                <option value="closed_lost">Closed Lost</option>
                            </select>
                            <input placeholder="Probability (0-100)" type="number" min="0" max="100"
                                value={form.probability}
                                onChange={e => setForm({ ...form, probability: e.target.value })} style={s.input} />
                            <input type="date" value={form.expected_close} required
                                onChange={e => setForm({ ...form, expected_close: e.target.value })} style={s.input} />
                        </div>
                        <textarea placeholder="Notes..." value={form.notes} rows={2}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            style={{ ...s.input, width: '100%', marginBottom: '12px' }} />
                        <button type="submit" style={s.addBtn}>
                            {editing ? 'Update Deal' : 'Create Deal'}
                        </button>
                    </form>
                </div>
            )}

            {deals.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>
                    No deals yet. Create one to start tracking!
                </p>
            )}

            {deals.map(d => (
                <div key={d.id} style={s.card}>
                    {/* deal header: title + value + stage badge */}
                    <div style={s.cardHeader}>
                        <div>
                            <div style={s.dealTitle}>{d.title}</div>
                            <div style={s.sub}>{d.customer_name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={s.value}>${parseFloat(d.value).toLocaleString()}</div>
                            {/* stage badge with dynamic background color */}
                            <span style={{
                                ...s.badge,
                                background: stageColor[d.stage] + '22',   // 22 = hex for low opacity
                                color: stageColor[d.stage]
                            }}>
                                {d.stage_display}
                            </span>
                        </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                        Probability: {d.probability}% • Expected Close: {d.expected_close}
                    </div>

                    <div style={s.btnRow}>
                        <button onClick={() => handleEdit(d)} style={s.editBtn}>Edit</button>
                        <button onClick={() => handleDelete(d.id)} style={s.delBtn}>Delete</button>
                        <button onClick={() => handlePredict(d.id)} style={s.aiBtn}>Predict Outcome</button>
                        <button onClick={() => toggleActivities(d.id)} style={s.actBtn}>
                            {showAct[d.id] ? 'Hide Activities' : 'Activities'}
                        </button>
                    </div>

                    {/* prediction result - shown below buttons */}
                    {predictions[d.id] && !predictions[d.id].loading && (
                        <div style={{
                            ...s.predBox,
                            background:   predictions[d.id].prediction === 'WIN' ? '#f0fdf4' : '#fef2f2',
                            borderColor:  predictions[d.id].prediction === 'WIN' ? '#86efac' : '#fca5a5',
                        }}>
                            <div style={{
                                fontWeight: 600,
                                color: predictions[d.id].prediction === 'WIN' ? '#166534' : '#991b1b'
                            }}>
                                {predictions[d.id].prediction === 'WIN' ? 'WIN' : 'LOSS'} — {predictions[d.id].confidence}% confidence
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '4px', color: '#374151' }}>
                                Next Action: {predictions[d.id].next_action}
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '2px', color: '#6b7280' }}>
                                {predictions[d.id].reason}
                            </div>
                        </div>
                    )}

                    {/* activities section - shown when toggle button clicked */}
                    {showAct[d.id] && (
                        <div style={s.actSection}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <strong style={{ fontSize: '13px' }}>
                                    Activities ({(activities[d.id] || []).length})
                                </strong>
                                <button onClick={() => setActForm(prev => ({ ...prev, [d.id]: !prev[d.id] }))} style={s.addBtn}>
                                    {actForm[d.id] ? 'Cancel' : '+ Add'}
                                </button>
                            </div>

                            {/* add activity inline form */}
                            {actForm[d.id] && (
                                <div style={s.actFormBox}>
                                    <div style={s.grid}>
                                        <select value={newAct.activity_type}
                                            onChange={e => setNewAct({ ...newAct, activity_type: e.target.value })} style={s.input}>
                                            <option value="call">Phone Call</option>
                                            <option value="email">Email</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="demo">Product Demo</option>
                                            <option value="follow_up">Follow Up</option>
                                        </select>
                                        <input placeholder="Subject *" value={newAct.subject}
                                            onChange={e => setNewAct({ ...newAct, subject: e.target.value })} style={s.input} />
                                        <input placeholder="Description" value={newAct.description}
                                            onChange={e => setNewAct({ ...newAct, description: e.target.value })} style={s.input} />
                                        <input placeholder="Outcome" value={newAct.outcome}
                                            onChange={e => setNewAct({ ...newAct, outcome: e.target.value })} style={s.input} />
                                        {/* datetime-local = date + time picker in one input */}
                                        <input type="datetime-local" value={newAct.activity_date}
                                            onChange={e => setNewAct({ ...newAct, activity_date: e.target.value })} style={s.input} />
                                    </div>
                                    <button onClick={() => handleAddActivity(d.id, d.customer)} style={s.addBtn}>
                                        Save Activity
                                    </button>
                                </div>
                            )}

                            {(activities[d.id] || []).length === 0 && (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No activities yet.</p>
                            )}

                            {(activities[d.id] || []).map(a => (
                                <div key={a.id} style={s.actItem}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: '12px', color: '#4f46e5' }}>
                                                {actIcon[a.activity_type]} {a.activity_type_display}
                                            </span>
                                            <span style={{ fontSize: '13px' }}> — {a.subject}</span>
                                        </div>
                                        <button onClick={() => handleDeleteActivity(a.id, d.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                            Delete
                                        </button>
                                    </div>
                                    {a.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{a.description}</div>}
                                    {a.outcome    && <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>Result: {a.outcome}</div>}
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                        {new Date(a.activity_date).toLocaleDateString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const s = {
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title:      { fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 },
    addBtn:     { background: '#4f46e5', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    formCard:   { background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' },
    input:      { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
    card:       { background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
    dealTitle:  { fontWeight: 600, fontSize: '15px', color: '#0f172a' },
    sub:        { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    value:      { fontWeight: 700, fontSize: '18px', color: '#0f172a' },
    badge:      { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', marginTop: '4px', display: 'inline-block' },
    btnRow:     { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
    editBtn:    { background: '#fef3c7', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    delBtn:     { background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    aiBtn:      { background: '#ede9fe', color: '#6d28d9', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    actBtn:     { background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    predBox:    { padding: '10px 14px', borderRadius: '8px', border: '1px solid', fontSize: '13px', marginBottom: '8px' },
    actSection: { borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '8px' },
    actFormBox: { background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' },
    actItem:    { background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '8px' },
};