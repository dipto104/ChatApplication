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
    const [receivingCall, setReceivingCall] = useState(!!incomingCallData);
    const [caller, setCaller] = useState(incomingCallData?.from || "");
    const [callerName, setCallerName] = useState(incomingCallData?.name || "");
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(type === "audio");
    const [devicesFound, setDevicesFound] = useState({ audio: true, video: type === "video" });


    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        const getMedia = async () => {
            const constraints = {
                video: type === "video" ? { width: 1280, height: 720 } : false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1, // Mono helps with echo cancellation
                    // Chrome specific constraints for robust processing
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                }
            };

            console.log("Requesting media stream with constraints:", constraints);

            try {
                const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log("Media stream acquired:", currentStream);
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
                return currentStream;
            } catch (err) {
                console.warn("Initial media request failed, trying fallback:", err.name);

                // Fallback 1: Try only audio if video failed
                if (type === "video") {
                    try {
                        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                            video: false,
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                                channelCount: 1,
                                googEchoCancellation: true,
                                googAutoGainControl: true,
                                googNoiseSuppression: true,
                            }
                        });
                        console.log("Fallback: Audio-only stream acquired");
                        setIsVideoOff(true);
                        setStream(audioOnlyStream);
                        setDevicesFound({ audio: true, video: false });
                        return audioOnlyStream;
                    } catch (audioErr) {
                        console.warn("Audio fallback also failed:", audioErr.name);
                    }
                }

                // Fallback 2: Proceed with no stream (Data only)
                setDevicesFound({ audio: false, video: false });
                console.error("No media devices found or access denied. Proceeding without local stream.");
                return null;
            }
        };

        getMedia().then((finalStream) => {
            // If it's an outgoing call, initiate immediately
            if (!incomingCallData) {
                console.log("Initiating outgoing call...");
                callUser(finalStream);
            }
        });

        // Listen for socket events
        socket.current.on("call-accepted", (signal) => {
            setCallAccepted(true);
            connectionRef.current.signal(signal);
        });

        socket.current.on("call-rejected", () => {
            alert("Call rejected");
            handleEndCall();
        });

        socket.current.on("call-ended", () => {
            handleEndCall();
        });





        return () => {
            // Cleanup socket listeners
            socket.current.off("call-accepted");
            socket.current.off("call-rejected");
            socket.current.off("call-ended");
            socket.current.off("call-rejected");
            socket.current.off("call-ended");


            // Destroy peer connection if exists
            if (connectionRef.current) {
                connectionRef.current.destroy();
            }
        };
    }, []);

    const callUser = (myStream) => {
        try {
            const peer = new Peer({
                initiator: true,
                trickle: false,
                stream: myStream,
                config: {
                    iceServers: [

                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun.relay.metered.ca:80" },
                        {
                            urls: "turn:global.relay.metered.ca:80",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:80?transport=tcp",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:443",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turns:global.relay.metered.ca:443?transport=tcp",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                    ],
                },
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
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                }
            });

            peer.on("error", (err) => {
                console.error("Peer connection error:", err);
                alert(`Call Error: ${err.message || "Connection failed"} (${err.code || "Unknown"})`);
                handleEndCall();
            });

            connectionRef.current = peer;
        } catch (err) {
            console.error("Peer initialization failed:", err);
            alert(`Failed to start call engine: ${err.message}`);
        }
    };

    const answerCall = () => {
        setCallAccepted(true);
        try {
            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: stream,
                config: {
                    iceServers: [

                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun.relay.metered.ca:80" },
                        {
                            urls: "turn:global.relay.metered.ca:80",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:80?transport=tcp",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:443",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                        {
                            urls: "turns:global.relay.metered.ca:443?transport=tcp",
                            username: "20a64d7e57d9829d17ee0189",
                            credential: "aSDgkiEbA78wdBhr",
                        },
                    ],
                },
            });

            peer.on("signal", (data) => {
                socket.current.emit("answer-call", {
                    to: incomingCallData.from,
                    answer: data
                });
            });

            peer.on("stream", (remoteStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                }
            });

            peer.on("error", (err) => {
                console.error("Answer Peer error:", err);
                alert(`Call Connection Error: ${err.message}.`);
            });

            peer.signal(incomingCallData.offer);
            connectionRef.current = peer;
        } catch (err) {
            console.error("Peer answer failed:", err);
            alert(`Failed to answer call: ${err.message}`);
        }
    };

    const rejectCall = () => {
        socket.current.emit("reject-call", { to: incomingCallData.from });
        onClose();
    };

    const handleEndCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        socket.current.emit("end-call", { to: currentChat?.id || incomingCallData?.from });
        onClose();
    };

    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (stream && type === "video") {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <Overlay>
            <Container>
                <div className="status-header">
                    <h2>
                        {callAccepted
                            ? (!devicesFound.audio ? "Connected (Listening Only - No Mic)" : "In Call")
                            : receivingCall
                                ? `Incoming ${type} call...`
                                : `Calling ${currentChat?.username}...`
                        }
                    </h2>
                    {!callAccepted && <div className="pulse"></div>}
                </div>

                <div className="video-grid">
                    <div className="video-container main">
                        {callAccepted ? (
                            <video playsInline ref={userVideo} autoPlay />
                        ) : (
                            <div className="placeholder">
                                <span>{currentChat?.username[0] || callerName[0]}</span>
                            </div>
                        )}
                    </div>
                    <div className="video-container small">
                        {stream ? (
                            <video playsInline muted ref={myVideo} autoPlay />
                        ) : (
                            <div className="placeholder mini">
                                <span>No Media</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="controls">
                    {receivingCall && !callAccepted ? (
                        <>
                            <button className="accept" onClick={answerCall}>
                                <BiPhone /> Accept
                            </button>
                            <button className="reject" onClick={rejectCall}>
                                <BiPhoneOff /> Reject
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={`control-btn ${(!devicesFound.audio || isMuted) ? "active" : ""}`}
                                onClick={toggleMute}
                                title={!devicesFound.audio ? "No Microphone Found" : "Toggle Mute"}
                            >
                                {(!devicesFound.audio || isMuted) ? <IoMdMicOff /> : <IoMdMic />}
                                <span>{(!devicesFound.audio || isMuted) ? "Unmute" : "Mute"}</span>
                            </button>
                            {type === "video" && (
                                <button
                                    className={`control-btn ${(!devicesFound.video || isVideoOff) ? "active" : ""}`}
                                    onClick={toggleVideo}
                                    title={!devicesFound.video ? "No Camera Found" : "Toggle Video"}
                                >
                                    {(!devicesFound.video || isVideoOff) ? <IoMdVideocam /> : <IoMdVideocam />}
                                    <span>{(!devicesFound.video || isVideoOff) ? "Start Video" : "Stop Video"}</span>
                                </button>
                            )}
                            <button className="end" onClick={handleEndCall}>
                                <BiPhoneOff />
                                <span>End Call</span>
                            </button>
                        </>
                    )}
                </div>

            </Container>
        </Overlay>
    );
}

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(10px);
`;

const Container = styled.div`
    width: 95%;
    max-width: 1200px;
    height: 90%;
    max-height: 900px;
    background: #1a1a1a;
    border-radius: 1.5rem;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);

    @media screen and (max-width: 768px) {
        width: 100%;
        height: 100%;
        border-radius: 0;
        max-height: none;
    }

    .status-header {
        padding: 1rem;
        text-align: center;
        flex-shrink: 0;
        h2 { color: white; font-size: 1rem; margin: 0; }
        .pulse {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            margin: 8px auto;
            animation: pulse 1.5s infinite;
        }
    }

    .video-grid {
        flex: 1;
        position: relative;
        background: #000;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;

        .video-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;

            video {
                width: 100%;
                height: 100%;
                object-fit: contain; // Changed to contain so video isn't zoomed too much
                @media screen and (max-width: 768px) {
                    object-fit: cover; // Cover might be better for mobile full height
                }
            }

            &.small {
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 150px;
                height: 110px;
                border-radius: 0.8rem;
                overflow: hidden;
                border: 2px solid var(--primary-color);
                z-index: 2;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                
                @media screen and (max-width: 768px) {
                    width: 100px;
                    height: 140px; // Portrait mode aspect
                    bottom: 120px; // Move up to avoid controls
                    right: 15px;
                }
            }

            .placeholder {
                font-size: 4rem;
                color: white;
                background: var(--primary-color);
                width: 120px;
                height: 120px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;

                &.mini {
                    width: 50px;
                    height: 50px;
                    font-size: 0.7rem;
                    text-align: center;
                }
            }
        }
    }

    .controls {
        padding: 1.5rem;
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
        background: #1a1a1a;
        flex-shrink: 0; // Prevent controls from squishing
        z-index: 10;

        @media screen and (max-width: 768px) {
            padding: 1rem;
            padding-bottom: 5rem; // Significantly lift buttons up
            gap: 1.5rem; // More space between buttons
            flex-wrap: nowrap;
            justify-content: space-evenly;
            background: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(26,26,26,0.9) 100%);
        }

        button {
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.8rem 1.5rem;
            border-radius: 3rem;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            white-space: nowrap;
            
            svg { font-size: 1.2rem; }

            &.control-btn {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                &.active { background: #ef4444; }
                &:hover { background: rgba(255, 255, 255, 0.2); }
                &.active:hover { background: #dc2626; }
            }

            &.accept { background: #22c55e; color: white; &:hover { background: #16a34a; } }
            &.reject { background: #ef4444; color: white; &:hover { background: #dc2626; } }
            &.end { 
                background: #ef4444; 
                color: white; 
                &:hover { background: #dc2626; }
            }

            @media screen and (max-width: 768px) {
                padding: 0.8rem;
                border-radius: 50%; // Back to circles for mobile space saving?
                // Actually user liked text. Let's try stacked or smaller text.
                // Let's use vertical stack or simpler style.
                // Reverting to icon prominent for mobile or smaller text?
                // Let's keep text but hide it on very small screens? 
                
                span {
                    display: none; // Hide text on mobile to save space
                }
                width: 55px;
                height: 55px;
                border-radius: 50%;
                
                svg { font-size: 1.5rem; }
            }
        }
    }

    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
`;
