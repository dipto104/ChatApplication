import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, activeConversationsRoute, deleteConversationRoute, deleteConversationForMeRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import OnlineSidebar from "../components/OnlineSidebar";
import VideoCall from "../components/VideoCall";

export default function Chat() {
    const navigate = useNavigate();
    const socket = useRef();
    const currentChatRef = useRef();
    const [contacts, setContacts] = useState([]); // This will now represent "Active Conversations"
    const contactsRef = useRef(contacts); // Ref to access latest contacts in socket listeners
    const [allUsers, setAllUsers] = useState([]); // This will represent "All Known Users" for online status
    const [currentChat, setCurrentChat] = useState(undefined);
    const [currentUser, setCurrentUser] = useState(undefined);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function checkUser() {
            if (!localStorage.getItem("chat-app-user")) {
                navigate("/login");
            } else {
                setCurrentUser(
                    await JSON.parse(localStorage.getItem("chat-app-user"))
                );
                setIsLoaded(true);
            }
        }
        checkUser();
    }, [navigate]);

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [userStatus, setUserStatus] = useState("online");
    const [arrivalMessage, setArrivalMessage] = useState(null);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [callType, setCallType] = useState("video");
    const [incomingCall, setIncomingCall] = useState(null);

    const [showChatOnMobile, setShowChatOnMobile] = useState(false);

    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    useEffect(() => {
        if (currentUser) {
            socket.current = io({
                transports: ["websocket"],
            });
            socket.current.emit("add-user", currentUser.id);
            setUserStatus(currentUser.status || "online");

            socket.current.on("get-online-users", (users) => {
                setOnlineUsers(users);
            });

            socket.current.on("msg-recieve", (data) => {
                setArrivalMessage({
                    from: data.from,
                    message: data.msg,
                    messageType: data.messageType,
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    senderName: data.senderName,
                    conversationId: data.conversationId,
                    isGroup: data.isGroup,
                    time: new Date()
                });

                // For Groups, the contact ID is the conversationId (groupId)
                // For 1-on-1, the contact ID is data.from (senderId)
                const targetId = data.isGroup ? data.conversationId : data.from;
                const isKnownContact = contactsRef.current.some(c => c.id == targetId && (c.isGroup === (data.isGroup || false)));

                if (!isKnownContact) {
                    fetchConversations();
                } else {
                    setContacts((prev) => {
                        const updatedContacts = prev.map((contact) => {
                            if (contact.id == targetId && (contact.isGroup === (data.isGroup || false))) {
                                return {
                                    ...contact,
                                    lastMessage: data.msg,
                                    senderName: data.senderName, // Update sender name for group preview
                                    lastMessageTime: new Date().toISOString(),
                                    unreadCount: currentChatRef.current?.id === targetId ? 0 : (contact.unreadCount || 0) + 1,
                                };
                            }
                            return contact;
                        });

                        return updatedContacts.sort((a, b) => {
                            const dateA = new Date(a.lastMessageTime || a.updatedAt || 0);
                            const dateB = new Date(b.lastMessageTime || b.updatedAt || 0);
                            return dateB - dateA;
                        });
                    });
                }
            });

            socket.current.on("new-group-added", (newGroup) => {
                // Check if already exists to avoid duplicates
                setContacts((prev) => {
                    if (prev.find(c => c.id === newGroup.id && c.isGroup)) return prev;
                    const updated = [newGroup, ...prev];
                    return updated.sort((a, b) => {
                        const dateA = new Date(a.lastMessageTime || a.updatedAt || 0);
                        const dateB = new Date(b.lastMessageTime || b.updatedAt || 0);
                        return dateB - dateA;
                    });
                });
            });

            socket.current.on("incoming-call", (data) => {
                setIncomingCall(data);
                setCallType(data.callType);
                setShowVideoCall(true);
            });

            socket.current.on("msg-delivered", (data) => {
                setArrivalMessage({
                    from: data.from,
                    type: "delivered"
                });
            });

            socket.current.on("msg-read", (data) => {
                setArrivalMessage({
                    from: data.from,
                    type: "read"
                });
            });

            return () => {
                socket.current.disconnect();
            };
        }
    }, [currentUser]);

    const handleStatusToggle = () => {
        const newStatus = userStatus === "online" ? "offline" : "online";
        setUserStatus(newStatus);
        socket.current.emit("toggle-status", {
            userId: currentUser.id,
            status: newStatus,
        });

        // Update local storage to persist status preference locally too
        const updatedUser = { ...currentUser, status: newStatus };
        localStorage.setItem("chat-app-user", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
    };

    const fetchConversations = async () => {
        if (currentUser) {
            // Add timestamp to prevent caching
            const data = await axios.get(`${activeConversationsRoute}/${currentUser.id}?t=${Date.now()}`);
            setContacts(data.data);
        }
    };

    // Fetch Active Conversations (Left Sidebar)
    useEffect(() => {
        fetchConversations();
    }, [currentUser]); // Re-fetch when user logs in or contacts need refresh

    // Sync contactsRef with state
    useEffect(() => {
        contactsRef.current = contacts;
    }, [contacts]);

    // Fetch All Users (Right Sidebar / Discovery)
    useEffect(() => {
        async function fetchAllUsers() {
            if (currentUser) {
                const data = await axios.get(`${allUsersRoute}/${currentUser.id}`);
                setAllUsers(data.data);
            }
        }
        fetchAllUsers();
    }, [currentUser]);

    // Sync Online Users with All Users Directory
    // If a new user comes online who wasn't in our initial fetch, re-fetch the directory.
    useEffect(() => {
        const checkForNewUsers = async () => {
            if (!currentUser || !allUsers || allUsers.length === 0) return;

            const knownUserIds = new Set(allUsers.map(u => u.id));
            const hasUnknownOnlineUser = onlineUsers.some(onlineId =>
                !knownUserIds.has(onlineId) && onlineId !== currentUser.id
            );

            if (hasUnknownOnlineUser) {
                console.log("New online user detected, refreshing user list...");
                const data = await axios.get(`${allUsersRoute}/${currentUser.id}`);
                setAllUsers(data.data);
            }
        };
        checkForNewUsers();
    }, [onlineUsers, allUsers, currentUser]);

    const handleChatChange = (chat) => {
        setCurrentChat(chat);
        setShowChatOnMobile(true);

        // Reset unread count locally for this contact
        setContacts((prev) =>
            prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c)
        );
    };

    const handleBackToContacts = () => {
        setShowChatOnMobile(false);
    };

    const handleCloseChat = () => {
        setCurrentChat(undefined);
        setShowChatOnMobile(false);
    };

    const handleDeleteConversation = async (conversationId, targetUserId) => {
        if (!conversationId) return;

        const confirmDelete = window.confirm("Are you sure you want to delete this conversation for everyone? This action is permanent and will delete all messages and files.");

        if (confirmDelete) {
            try {
                await axios.post(deleteConversationRoute, {
                    conversationId: conversationId
                });

                // Notify other user
                if (socket.current) {
                    socket.current.emit("delete-conversation", {
                        to: targetUserId,
                        from: currentUser.id,
                    });
                }

                // If the deleted chat is the one currently open, close it
                if (currentChat?.id === targetUserId) {
                    setCurrentChat(undefined);
                    setShowChatOnMobile(false);
                }

                // Refresh the contact list
                fetchConversations();
            } catch (err) {
                console.error("Failed to delete conversation", err);
            }
        }
    };

    const handleDeleteForMe = async (conversationId, targetUserId) => {
        if (!conversationId) return;

        try {
            await axios.post(deleteConversationForMeRoute, {
                conversationId: conversationId,
                userId: currentUser.id
            });

            // If the deleted chat is the one currently open, close it
            if (currentChat?.id === targetUserId) {
                setCurrentChat(undefined);
                setShowChatOnMobile(false);
            }

            // Refresh the contact list
            fetchConversations();
        } catch (err) {
            console.error("Failed to delete conversation for me", err);
        }
    };

    return (
        <Container>
            <div className={`container ${showChatOnMobile ? 'show-chat' : 'show-contacts'}`}>
                <div className="contacts-wrapper">
                    <Contacts
                        contacts={contacts}
                        allUsers={allUsers}
                        changeChat={handleChatChange}
                        onlineUsers={onlineUsers}
                        userStatus={userStatus}
                        onStatusToggle={handleStatusToggle}
                        isConversationList={true}
                        socket={socket}
                        onDeleteConversation={handleDeleteConversation}
                        onDeleteForMe={handleDeleteForMe}
                    />
                </div>
                <div className="chat-wrapper">
                    {currentChat === undefined ? (
                        <Welcome
                            currentUser={currentUser}
                            userStatus={userStatus}
                            onStatusToggle={handleStatusToggle}
                        />
                    ) : (
                        <ChatContainer
                            currentChat={currentChat}
                            socket={socket}
                            onlineUsers={onlineUsers}
                            currentUser={currentUser}
                            userStatus={userStatus}
                            onStatusToggle={handleStatusToggle}
                            onBack={handleBackToContacts}
                            onClose={handleCloseChat}
                            arrivalMessage={arrivalMessage}
                            refreshContacts={fetchConversations}
                            onDeleteConversation={handleDeleteConversation}
                            onVideoCall={() => {
                                setCallType("video");
                                setShowVideoCall(true);
                                setIncomingCall(null);
                            }}
                            onAudioCall={() => {
                                setCallType("audio");
                                setShowVideoCall(true);
                                setIncomingCall(null);
                            }}
                        />
                    )}
                </div>
                <div className="online-sidebar-wrapper">
                    <OnlineSidebar
                        onlineUsers={onlineUsers}
                        contacts={allUsers}
                        changeChat={handleChatChange}
                    />
                </div>
            </div>
            {showVideoCall && (
                <VideoCall
                    socket={socket}
                    currentUser={currentUser}
                    currentChat={currentChat}
                    type={callType}
                    incomingCallData={incomingCall}
                    onClose={() => {
                        setShowVideoCall(false);
                        setIncomingCall(null);
                    }}
                />
            )}
        </Container>
    );
}

const Container = styled.div`
  height: 100dvh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-dark);
  overflow: hidden;

  .container {
    height: 94dvh;
    width: 95vw;
    background-color: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 1.5rem;
    display: grid;
    grid-template-columns: 320px 1fr 280px;
    overflow: hidden;
    position: relative;
    box-shadow: var(--shadow-lg);

    .contacts-wrapper, .chat-wrapper, .online-sidebar-wrapper {
        height: 100%;
        overflow: hidden;
    }

    .chat-wrapper {
        background-color: #0e1621;
    }

    @media screen and (min-width: 1081px) and (max-width: 1440px) {
      grid-template-columns: 300px 1fr 250px;
      width: 98vw;
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 300px 1fr 240px;
      width: 98vw;
    }

    @media screen and (max-width: 719px) {
       display: flex;
       flex-direction: column;
       width: 100vw;
       height: 100dvh;
       border-radius: 0;
       border: none;

       .contacts-wrapper {
         width: 100%;
         height: 100%;
         transition: opacity 0.3s ease;
       }

       .chat-wrapper {
         position: fixed;
         top: 0;
         left: 0;
         width: 100vw;
         height: 100dvh;
         z-index: 100;
         transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;
         transform: translateX(100%);
         visibility: hidden;
       }

       .online-sidebar-wrapper {
         display: none;
       }

       &.show-chat {
         .contacts-wrapper {
           opacity: 0;
           pointer-events: none;
         }
         .chat-wrapper {
           transform: translateX(0);
           visibility: visible;
         }
       }
    }
  }
`;
