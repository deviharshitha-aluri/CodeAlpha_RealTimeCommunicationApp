import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function MeetingRoom({ token, user }) {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [peers, setPeers] = useState({});
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const [micMuted, setMicMuted] = useState(false);
    const [videoOff, setVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);

    const localVideoRef = useRef();
    const peersRef = useRef({});
    const localStreamRef = useRef();

    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const [files, setFiles] = useState([]);

    useEffect(() => {
        fetchFiles();

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            socket.emit('join-room', { roomId, user });

            socket.on('user-connected', async ({ userId, user: remoteUser }) => {
                const peerConnection = createPeerConnection(userId, stream);
                peersRef.current[userId] = peerConnection;

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', { target: userId, sdp: peerConnection.localDescription, user });
            });

            socket.on('offer', async (data) => {
                const peerConnection = createPeerConnection(data.caller, stream);
                peersRef.current[data.caller] = peerConnection;

                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', { target: data.caller, sdp: peerConnection.localDescription });
            });

            socket.on('answer', async (data) => {
                const peerConnection = peersRef.current[data.caller];
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                }
            });

            socket.on('ice-candidate', async (data) => {
                const peerConnection = peersRef.current[data.caller];
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });

            socket.on('user-disconnected', (userId) => {
                if (peersRef.current[userId]) {
                    peersRef.current[userId].close();
                    delete peersRef.current[userId];
                    setPeers(prev => {
                        const newPeers = { ...prev };
                        delete newPeers[userId];
                        return newPeers;
                    });
                }
            });
        }).catch(err => {
            console.error('Error accessing media', err);
            alert('Could not access camera/microphone');
        });

        socket.on('receive-message', (message) => {
            setChatMessages(prev => [...prev, message]);
        });

        socket.on('file-shared-notify', () => {
            fetchFiles();
        });

        socket.on('draw-collaborate', (data) => {
            if (!ctxRef.current) return;
            ctxRef.current.lineTo(data.x, data.y);
            ctxRef.current.stroke();
        });

        return () => {
            socket.off('user-connected');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('user-disconnected');
            socket.off('receive-message');
            socket.off('file-shared-notify');
            socket.off('draw-collaborate');
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [roomId]);

    useEffect(() => {
        if (showWhiteboard && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight - 60; // adjust for toolbar
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctxRef.current = ctx;
        }
    }, [showWhiteboard]);

    const createPeerConnection = (userId, stream) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { target: userId, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = (event) => {
            setPeers(prev => ({
                ...prev,
                [userId]: event.streams[0]
            }));
        };

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        return peerConnection;
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoOff(!videoTrack.enabled);
            }
        }
    };

    const shareScreen = async () => {
        if (isScreenSharing) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                const videoTrack = stream.getVideoTracks()[0];
                replaceVideoTrack(videoTrack);
                localVideoRef.current.srcObject = stream;
                localStreamRef.current = stream;
                setIsScreenSharing(false);
            });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            replaceVideoTrack(videoTrack);
            localVideoRef.current.srcObject = stream;
            setIsScreenSharing(true);

            videoTrack.onended = () => {
                shareScreen(); // toggle back
            };
        } catch (err) {
            console.error('Error sharing screen', err);
        }
    };

    const replaceVideoTrack = (newTrack) => {
        for (const userId in peersRef.current) {
            const pc = peersRef.current[userId];
            const sender = pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) sender.replaceTrack(newTrack);
        }
    };

    const leaveMeeting = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        navigate('/dashboard');
        window.location.reload();
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = { text: chatInput, sender: user.name };
        socket.emit('send-message', msg);
        setChatInput('');
    };

    // Canvas drawing handlers
    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        if (ctxRef.current) {
            ctxRef.current.beginPath();
            ctxRef.current.moveTo(offsetX, offsetY);
            setIsDrawing(true);
        }
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        if (ctxRef.current) {
            ctxRef.current.lineTo(offsetX, offsetY);
            ctxRef.current.stroke();
            socket.emit('draw', { x: offsetX, y: offsetY });
        }
    };

    const stopDrawing = () => {
        if (ctxRef.current) ctxRef.current.closePath();
        setIsDrawing(false);
    };

    const clearWhiteboard = () => {
        if (ctxRef.current && canvasRef.current) {
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const fetchFiles = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/meeting/files/${roomId}`);
            const data = await res.json();
            setFiles(data);
        } catch (err) {
            console.error('Error fetching files', err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            return alert('File too large (max 10MB)');
        }
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://localhost:5000/api/meeting/upload/${roomId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            socket.emit('file-shared', data);
            fetchFiles();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="meeting-container" style={{ position: 'relative' }}>

            {/* Video Area */}
            <div className="main-video-area">
                <div style={{ padding: '0.5rem 1rem', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Meeting ID: </strong> {roomId}</div>
                    <button className="btn" style={{ background: '#334155', color: 'white', padding: '0.2rem 0.5rem' }} onClick={() => navigator.clipboard.writeText(roomId)}>Copy ID</button>
                </div>

                <div className="video-grid">
                    {/* Local Video */}
                    <div className="video-card">
                        {!videoOff ? (
                            <video ref={localVideoRef} autoPlay muted playsInline></video>
                        ) : (
                            <div className="avatar-fallback">{user.name.charAt(0)}</div>
                        )}
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>You {micMuted ? '(Muted)' : ''}</div>
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(peers).map(([userId, stream]) => (
                        <RemoteVideo key={userId} stream={stream} userId={userId} />
                    ))}
                </div>

                <div className="meeting-controls">
                    <button className={`control-btn ${micMuted ? 'active' : ''}`} onClick={toggleMic} title="Toggle Audio">
                        🎤
                    </button>
                    <button className={`control-btn ${videoOff ? 'active' : ''}`} onClick={toggleVideo} title="Toggle Video">
                        📹
                    </button>
                    <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={shareScreen} title="Share Screen">
                        🖥️
                    </button>
                    <button className={`control-btn ${showWhiteboard ? 'active' : ''}`} onClick={() => setShowWhiteboard(!showWhiteboard)} title="Whiteboard">
                        🎨
                    </button>
                    <button className="control-btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={leaveMeeting} title="Leave Meeting">
                        ❌
                    </button>
                </div>
            </div>

            {/* Right Panel (Chat & Files) */}
            <div className="right-panel">
                <div className="panel-header">
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Chat & Files</h3>
                </div>

                {/* Files Section */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9rem' }}>Shared Files</strong>
                        <label className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: 'var(--border)', cursor: 'pointer' }}>
                            Upload
                            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                        </label>
                    </div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.85rem' }}>
                        {files.map((f, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span title={f.originalName}>{f.originalName.length > 20 ? f.originalName.substring(0, 20) + '...' : f.originalName}</span>
                                <a href={`http://localhost:5000/api/meeting/download/${roomId}/${f.id}`} download style={{ color: 'var(--primary-color)' }}>Download</a>
                            </div>
                        ))}
                        {files.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No files shared</span>}
                    </div>
                </div>

                {/* Chat Section */}
                <div className="chat-messages">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className="message">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                {msg.sender} <span style={{ fontSize: '0.7rem' }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div style={{ fontSize: '0.95rem' }}>{msg.text}</div>
                        </div>
                    ))}
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Send</button>
                </form>
            </div>

            {/* Whiteboard Overlay */}
            {showWhiteboard && (
                <div className="whiteboard-container">
                    <div className="wb-toolbar">
                        <span style={{ fontWeight: 'bold' }}>Collaborative Whiteboard</span>
                        <button onClick={clearWhiteboard}>Clear</button>
                        <button onClick={() => setShowWhiteboard(false)} style={{ marginLeft: 'auto' }}>Close</button>
                    </div>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        style={{ flex: 1, cursor: 'crosshair' }}
                    />
                </div>
            )}

        </div>
    );
}

function RemoteVideo({ stream, userId }) {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="video-card">
            <video ref={videoRef} autoPlay playsInline></video>
        </div>
    );
}
