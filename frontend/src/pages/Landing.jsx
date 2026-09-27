import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
    return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Welcome to MeetStream</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
                A professional, secure, and fully functional real-time communication platform.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left' }}>
                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>📹 Video Calling</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>High-quality multi-user video and audio calling using WebRTC.</p>
                </div>
                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>🖥️ Screen Sharing</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Share your screen with participants instantly.</p>
                </div>
                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>📁 File Sharing & Chat</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Real-time chat and secure file sharing in meeting rooms.</p>
                </div>
                <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h3>🎨 Collaborative Whiteboard</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Draw and collaborate in real-time with other users.</p>
                </div>
            </div>

            <div style={{ marginTop: '4rem' }}>
                <Link to="/register" className="btn btn-primary" style={{ marginRight: '1rem', padding: '1rem 2rem', fontSize: '1.2rem' }}>Get Started</Link>
                <Link to="/login" className="btn" style={{ padding: '1rem 2rem', fontSize: '1.2rem', border: '1px solid var(--border)' }}>Login</Link>
            </div>
        </div>
    );
}
