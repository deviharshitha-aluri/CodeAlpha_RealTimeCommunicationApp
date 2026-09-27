import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register({ setToken, setUser }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.msg || 'Registration failed');
            }

            setToken(data.token);
            setUser(data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="form-container">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Create Account</h2>
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>{error}</div>}
            <form onSubmit={handleRegister}>
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register</button>
            </form>
        </div>
    );
}
