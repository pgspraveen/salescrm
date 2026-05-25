// CustomerSection.jsx = full CRUD for customers + churn prediction
// editing = null means create mode, object means edit mode

import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, predictChurn } from '../api';

export default function CustomerSection() {
    const [customers, setCustomers] = useState([]);
    const [showForm,  setShowForm]  = useState(false);
    const [editing,   setEditing]   = useState(null);   // null = create, object = edit
    const [churn,     setChurn]     = useState({});     // { customerId: prediction result }
    const [search,    setSearch]    = useState('');

    // empty form state - reused when resetting after save
    const emptyForm = { name: '', email: '', phone: '', company: '', industry: 'tech', annual_revenue: '', employee_count: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { load(); }, []);

    const load = async () => {
        const res = await getCustomers(search);
        setCustomers(res.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editing) {
            await updateCustomer(editing.id, form);     // PUT = update existing
        } else {
            await createCustomer(form);                  // POST = create new
        }
        resetForm();
        load();     // refresh list after save
    };

    const resetForm = () => {
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const handleEdit = (c) => {
        setEditing(c);          // set editing mode with customer data
        setForm(c);             // pre-fill form with existing values
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return;
        await deleteCustomer(id);
        load();
    };

    const handleChurn = async (id) => {
        // show loading state while waiting for prediction
        setChurn(prev => ({ ...prev, [id]: { loading: true } }));
        const res = await predictChurn(id);
        setChurn(prev => ({ ...prev, [id]: res.data }));
    };

    // color coding for risk levels
    const riskColor = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };

    return (
        <div>
            <div style={s.header}>
                <h1 style={s.title}>Customers</h1>
                <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={s.addBtn}>
                    {showForm ? 'Cancel' : '+ Add Customer'}
                </button>
            </div>

            {/* search input - triggers load() on every keystroke */}
            <input
                placeholder="Search by name or company"
                value={search}
                onChange={e => { setSearch(e.target.value); load(); }}
                style={s.search}
            />

            {/* create/edit form */}
            {showForm && (
                <div style={s.formCard}>
                    <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>
                        {editing ? 'Edit Customer' : 'New Customer'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        {/* auto-fit grid: min 200px per column, fills available space */}
                        <div style={s.grid}>
                            <input placeholder="Full Name *" value={form.name} required
                                onChange={e => setForm({ ...form, name: e.target.value })} style={s.input} />
                            <input placeholder="Email *" type="email" value={form.email} required
                                onChange={e => setForm({ ...form, email: e.target.value })} style={s.input} />
                            <input placeholder="Phone" value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })} style={s.input} />
                            <input placeholder="Company *" value={form.company} required
                                onChange={e => setForm({ ...form, company: e.target.value })} style={s.input} />
                            <select value={form.industry}
                                onChange={e => setForm({ ...form, industry: e.target.value })} style={s.input}>
                                <option value="tech">Technology</option>
                                <option value="finance">Finance</option>
                                <option value="healthcare">Healthcare</option>
                                <option value="retail">Retail</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="other">Other</option>
                            </select>
                            <input placeholder="Annual Revenue" type="number" value={form.annual_revenue}
                                onChange={e => setForm({ ...form, annual_revenue: e.target.value })} style={s.input} />
                            <input placeholder="Employee Count" type="number" value={form.employee_count}
                                onChange={e => setForm({ ...form, employee_count: e.target.value })} style={s.input} />
                        </div>
                        <button type="submit" style={s.addBtn}>
                            {editing ? 'Update Customer' : 'Create Customer'}
                        </button>
                    </form>
                </div>
            )}

            {customers.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>
                    No customers yet. Add one to get started!
                </p>
            )}

            {/* customer cards list */}
            {customers.map(c => (
                <div key={c.id} style={s.card}>
                    <div style={s.cardRow}>
                        <div>
                            <div style={s.name}>{c.name}</div>
                            <div style={s.sub}>{c.company} • {c.industry_display}</div>
                            <div style={s.sub}>{c.email} {c.phone && `• ${c.phone}`}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            {/* toLocaleString() = formats number with commas: 5000000 -> 5,000,000 */}
                            <div style={s.revenue}>${parseFloat(c.annual_revenue || 0).toLocaleString()}</div>
                            <div style={s.sub}>{c.total_deals} deals • Revenue: ${c.total_revenue?.toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={s.btnRow}>
                        <button onClick={() => handleEdit(c)} style={s.editBtn}>Edit</button>
                        <button onClick={() => handleDelete(c.id)} style={s.delBtn}>Delete</button>
                        <button onClick={() => handleChurn(c.id)} style={s.aiBtn}>Churn Risk</button>
                    </div>

                    {/* show churn result when available */}
                    {churn[c.id] && !churn[c.id].loading && (
                        <div style={{ ...s.churnBox, borderColor: riskColor[churn[c.id].churn_risk] }}>
                            <span style={{ color: riskColor[churn[c.id].churn_risk], fontWeight: 600 }}>
                                Risk: {churn[c.id].churn_risk}
                            </span>
                            {' '}— Health Score: {churn[c.id].customer_health_score}/100
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>
                                {churn[c.id].retention_actions[0]}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const s = {
    header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title:    { fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 },
    addBtn:   { background: '#4f46e5', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    search:   { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
    formCard: { background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
    grid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' },
    input:    { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
    card:     { background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
    cardRow:  { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
    name:     { fontWeight: 600, fontSize: '16px', color: '#0f172a' },
    sub:      { fontSize: '12px', color: '#64748b', marginTop: '2px' },
    revenue:  { fontWeight: 700, fontSize: '16px', color: '#0f172a' },
    btnRow:   { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    editBtn:  { background: '#fef3c7', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    delBtn:   { background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    aiBtn:    { background: '#ede9fe', color: '#6d28d9', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    churnBox: { marginTop: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid', background: '#f8fafc', fontSize: '13px' },
};