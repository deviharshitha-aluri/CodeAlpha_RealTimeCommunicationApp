import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [token, user]);

    const handleLogout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <Router>
            <div className="app-container">
                <nav className="navbar">
                    <div className="navbar-brand">
                        <Link to="/">MeetStream</Link>
                    </div>
                    <div className="nav-links">
                        {token ? (
                            <>
                                <span style={{ fontWeight: 500 }}>Hi, {user?.name}</span>
                                <Link to="/dashboard" className="btn">Dashboard</Link>
                                <button onClick={handleLogout} className="btn btn-danger">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn">Login</Link>
                                <Link to="/register" className="btn btn-primary">Register</Link>
                            </>
                        )}
                    </div>
                </nav>

                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={!token ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/dashboard" />} />
                    <Route path="/register" element={!token ? <Register setToken={setToken} setUser={setUser} /> : <Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={token ? <Dashboard token={token} user={user} /> : <Navigate to="/login" />} />
                    <Route path="/meeting/:roomId" element={token ? <MeetingRoom token={token} user={user} /> : <Navigate to={`/login`} />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
