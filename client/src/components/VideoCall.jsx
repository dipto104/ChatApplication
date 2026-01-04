import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Peer from "simple-peer";
import { IoMdClose, IoMdMic, IoMdMicOff, IoMdVideocam } from "react-icons/io";
import { BiPhoneOff, BiPhone } from "react-icons/bi";

export default function VideoCall({
    socket,
    currentUser,
    currentChat,
    onClose,
    incomingCallData = null,
    type = "video"
}) {
    const [stream, setStream] = useState(null);
    const [localStreamLoaded, setLocalStreamLoaded] = useState(false);
    const [peers, setPeers] = useState([]); // Array of { peerId, peer, stream (optional) }

    // UI States
    const [receivingCall, setReceivingCall] = useState(!!incomingCallData);
    const [caller, setCaller] = useState(incomingCallData?.from || "");
    const [callerName, setCallerName] = useState(incomingCallData?.name || "");
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(type === "audio");
    const [devicesFound, setDevicesFound] = useState({ audio: true, video: type === "video" });

    const myVideo = useRef();
    const peersRef = useRef([]); // Map of peerID -> { peer, userName }
    const connectionRef = useRef(); // For 1-on-1 legacy, though we try to unify

    useEffect(() => {
        const getMedia = async () => {
            const constraints = {
                video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                audio: { echoCancellation: true, noiseSuppression: true }
            };

            try {
                const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(currentStream);
                setLocalStreamLoaded(true);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
                return currentStream;
            } catch (err) {
                console.warn("Media access error:", err);
                // Fallback to audio only if video failed
                if (type === "video") {
                    try {
                        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                        setStream(audioStream);
                        setLocalStreamLoaded(true);
                        setIsVideoOff(true);
                        setDevicesFound({ audio: true, video: false });
                        return audioStream;
                    } catch (e) { console.error("Audio fallback failed", e); }
                }
                setDevicesFound({ audio: false, video: false });
                return null;
            }
        };

        getMedia().then((myStream) => {
            if (!myStream && !incomingCallData && !currentChat.isGroup) return; // Cant start call without media usually

            if (currentChat.isGroup) {
                // Group Logic: Join the "Call Room"
                setCallAccepted(true); // Auto-accept/join for groups (sender side)
                // If we are joining an existing group call mechanism could be different, 
                // but for now we assume "Call" button -> Join/Start logic.

                // Emit join event
                socket.current.emit("join-call", {
                    groupId: currentChat.id,
                    from: currentUser.id,
                    name: currentUser.username,
                    // We don't send signal yet, we wait for 'user-connected' or existing users
                });

            } else {
                // 1-on-1 Logic
                if (!incomingCallData) {
                    callUser(myStream);
                }
            }
        });

        // --- Socket Events ---

        // Group: User joined, we must call them
        socket.current.on("user-connected-to-call", (data) => {
            // data: { from, name, socketId, signal? }
            console.log("User Connected to Group Call:", data.name);
            const peer = createPeer(data.from, socket.current.id, stream, data.name);
            peersRef.current.push({
                peerID: data.from,
                peer,
                userName: data.name
            });
            setPeers((prev) => [...prev, { peerID: data.from, peer, userName: data.name }]);
        });

        // Group: Receive Offer
        socket.current.on("receive-group-signal", (data) => {
            // We are receiving a call/signal from someone in the group
            const item = peersRef.current.find(p => p.peerID === data.from);
            if (item) {
                item.peer.signal(data.signal);
            } else {
                // Initial handshake from them
                const peer = addPeer(data.signal, data.from, stream, data.name);
                peersRef.current.push({
                    peerID: data.from,
                    peer,
                    userName: data.name
                });
                setPeers((prev) => [...prev, { peerID: data.from, peer, userName: data.name }]);
            }
        });

        // Group: Receive Answer
        socket.current.on("receive-returned-signal", (data) => {
            const item = peersRef.current.find(p => p.peerID === data.from);
            if (item) {
                item.peer.signal(data.signal);
            }
        });

        // 1-on-1 Events
        socket.current.on("call-accepted", (signal) => {
            setCallAccepted(true);
            connectionRef.current.signal(signal);
        });

        socket.current.on("call-ended", () => {
            handleEndCall();
        });

        return () => {
            // Cleanup
            socket.current.off("user-connected-to-call");
            socket.current.off("receive-group-signal");
            socket.current.off("receive-returned-signal");
            socket.current.off("call-accepted");
            socket.current.off("call-ended");

            // Destroy all peers
            peersRef.current.forEach(p => p.peer.destroy());
            if (connectionRef.current) connectionRef.current.destroy();
        };
    }, []);

    // --- Mesh Networking Functions ---

    function createPeer(userToSignal, callerID, stream, name) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (signal) => {
            socket.current.emit("offer-group-signal", {
                to: userToSignal,
                from: currentUser.id,
                signal,
                name: currentUser.username
            });
        });

        peer.on("stream", (remoteStream) => {
            // Update stream in state for this peer
            setPeers(prev => prev.map(p => p.peerID === userToSignal ? { ...p, stream: remoteStream } : p));
        });

        peer.on("close", () => {
            setPeers(prev => prev.filter(p => p.peerID !== userToSignal));
        });

        peer.on("error", () => {
            setPeers(prev => prev.filter(p => p.peerID !== userToSignal));
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream, name) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (signal) => {
            socket.current.emit("return-group-signal", {
                signal,
                to: callerID,
                from: currentUser.id
            });
        });

        peer.on("stream", (remoteStream) => {
            setPeers(prev => prev.map(p => p.peerID === callerID ? { ...p, stream: remoteStream } : p));
        });

        peer.on("close", () => {
            setPeers(prev => prev.filter(p => p.peerID !== callerID));
        });

        peer.on("error", () => {
            setPeers(prev => prev.filter(p => p.peerID !== callerID));
        });

        peer.signal(incomingSignal);
        return peer;
    }


    // --- 1-on-1 Legacy Functions ---
    const callUser = (myStream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: myStream,
        });
        peer.on("signal", (data) => {
            socket.current.emit("call-user", {
                to: currentChat.id,
                offer: data,
                from: currentUser.id,
                name: currentUser.username,
                callType: type,
            });
        });
        peer.on("stream", (remoteStream) => {
            // For 1-on-1 we can just use a single state or the peers array
            setPeers([{ peerID: currentChat.id, stream: remoteStream, userName: currentChat.username }]);
        });
        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
        });
        peer.on("signal", (data) => {
            socket.current.emit("answer-call", {
                to: incomingCallData.from,
                answer: data
            });
        });
        peer.on("stream", (remoteStream) => {
            setPeers([{ peerID: incomingCallData.from, stream: remoteStream, userName: incomingCallData.name }]);
        });
        peer.signal(incomingCallData.offer);
        connectionRef.current = peer;
    };


    const handleEndCall = () => {
        setCallEnded(true);
        if (stream) stream.getTracks().forEach(track => track.stop());
        socket.current.emit("end-call", { to: currentChat?.id || incomingCallData?.from });
        onClose();
    };

    const toggleMute = () => {
        if (stream) {
            const audio = stream.getAudioTracks()[0];
            if (audio) { audio.enabled = !audio.enabled; setIsMuted(!audio.enabled); }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const video = stream.getVideoTracks()[0];
            if (video) { video.enabled = !video.enabled; setIsVideoOff(!video.enabled); }
        }
    };


    // Render Video Element Component
    const VideoElement = ({ src, muted = false, name }) => {
        const ref = useRef();
        useEffect(() => {
            if (ref.current && src) ref.current.srcObject = src;
        }, [src]);
        return (
            <div className="video-card">
                <video ref={ref} autoPlay playsInline muted={muted} />
                {name && <span className="peer-name">{name}</span>}
            </div>
        );
    };


    return (
        <Overlay>
            <Container>
                <div className="status-header">
                    <h2>{currentChat.isGroup ? `${currentChat.name} Call` : (callAccepted ? "Connected" : (receivingCall ? "Incoming Call" : "Calling..."))}</h2>
                </div>

                <div className="video-grid-mesh">
                    {/* My Video */}
                    {stream && (
                        <div className="video-card my-video">
                            <video ref={myVideo} autoPlay playsInline muted />
                            <span className="peer-name">You</span>
                        </div>
                    )}

                    {/* Remote Videos */}
                    {peers.map((p) => (
                        p.stream && <VideoElement key={p.peerID} src={p.stream} name={p.userName} />
                    ))}
                </div>

                <div className="controls">
                    {receivingCall && !callAccepted && !currentChat.isGroup ? (
                        <>
                            <button className="accept" onClick={answerCall}><BiPhone /> Accept</button>
                            <button className="reject" onClick={onClose}><BiPhoneOff /> Reject</button>
                        </>
                    ) : (
                        <>
                            <button className={`control-btn ${isMuted ? "active" : ""}`} onClick={toggleMute}>
                                {isMuted ? <IoMdMicOff /> : <IoMdMic />}
                            </button>
                            {type === "video" && (
                                <button className={`control-btn ${isVideoOff ? "active" : ""}`} onClick={toggleVideo}>
                                    {isVideoOff ? <IoMdVideocam /> : <IoMdVideocam />}
                                </button>
                            )}
                            <button className="end" onClick={handleEndCall}><BiPhoneOff /></button>
                        </>
                    )}
                </div>
            </Container>
        </Overlay>
    );
}


const Overlay = styled.div`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.9); z-index: 10000;
    display: flex; justify-content: center; align-items: center;
`;

const Container = styled.div`
    width: 95%; max-width: 1200px; height: 90%; background: #1a1a1a;
    border-radius: 1rem; overflow: hidden; display: flex; flex-direction: column;
    
    .status-header {
        padding: 1rem; text-align: center; color: white;
    }
    
    .video-grid-mesh {
        flex: 1; display: grid; gap: 1rem; padding: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        overflow-y: auto; background: #000;
        
        .video-card {
            background: #333; border-radius: 0.5rem; overflow: hidden; position: relative;
            video { width: 100%; height: 100%; object-fit: cover; }
            .peer-name {
                position: absolute; bottom: 10px; left: 10px; 
                background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 4px;
                color: white; font-size: 0.8rem;
            }
        }
    }
    
    .controls {
        padding: 1rem; display: flex; justify-content: center; gap: 1rem;
        button {
            border: none; padding: 1rem; border-radius: 50%; font-size: 1.5rem; cursor: pointer;
            &.control-btn { background: rgba(255,255,255,0.1); color: white; &.active { background: #ef4444; } }
            &.end { background: #ef4444; color: white; }
            &.accept { background: #22c55e; color: white; border-radius: 2rem; padding: 0.8rem 2rem; font-size: 1rem; }
            &.reject { background: #ef4444; color: white; border-radius: 2rem; padding: 0.8rem 2rem; font-size: 1rem; }
        }
    }
`;
