import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ token, user }) {
    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCreateMeeting = async () => {
        try {
            const generatedRoomId = Math.random().toString(36).substring(2, 11).toUpperCase();

            const res = await fetch('http://localhost:5000/api/meeting/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roomId: generatedRoomId })
            });

            if (!res.ok) {
                throw new Error('Failed to create meeting');
            }

            const data = await res.json();
            navigate(`/meeting/${data.roomId}`);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleJoinMeeting = async (e) => {
        e.preventDefault();
        if (!joinRoomId.trim()) return;

        try {
            const res = await fetch(`http://localhost:5000/api/meeting/${joinRoomId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Meeting not found or invalid ID');
            }

            navigate(`/meeting/${joinRoomId}`);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1rem' }}>
            <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Create Meeting</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>Start a new instant meeting and invite others.</p>
                    <button onClick={handleCreateMeeting} className="btn btn-primary" style={{ width: '100%' }}>New Meeting</button>
                </div>

                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>Join Meeting</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>Enter a meeting ID to join an existing room.</p>
                    {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
                    <form onSubmit={handleJoinMeeting} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Meeting ID (e.g. ABC)"
                            value={joinRoomId}
                            onChange={e => setJoinRoomId(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                        />
                        <button type="submit" className="btn btn-primary">Join</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
