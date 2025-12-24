import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
    const navigate = useNavigate();
    const socket = useRef();
    const [contacts, setContacts] = useState([]);
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

    const [showChatOnMobile, setShowChatOnMobile] = useState(false);

    useEffect(() => {
        if (currentUser) {
            socket.current = io(host);
            socket.current.emit("add-user", currentUser.id);
            setUserStatus(currentUser.status || "online");

            socket.current.on("get-online-users", (users) => {
                setOnlineUsers(users);
            });
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

    useEffect(() => {
        async function fetchData() {
            if (currentUser) {
                const data = await axios.get(`${allUsersRoute}/${currentUser.id}`);
                setContacts(data.data);
            }
        }
        fetchData();
    }, [currentUser]);

    const handleChatChange = (chat) => {
        setCurrentChat(chat);
        setShowChatOnMobile(true);
    };

    const handleBackToContacts = () => {
        setShowChatOnMobile(false);
    };

    return (
        <Container>
            <div className={`container ${showChatOnMobile ? 'show-chat' : 'show-contacts'}`}>
                <div className="contacts-wrapper">
                    <Contacts
                        contacts={contacts}
                        changeChat={handleChatChange}
                        onlineUsers={onlineUsers}
                        userStatus={userStatus}
                        onStatusToggle={handleStatusToggle}
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
                        />
                    )}
                </div>
            </div>
        </Container>
    );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-dark);
  overflow: hidden;

  .container {
    height: 90vh;
    width: 90vw;
    background-color: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 1.5rem;
    display: grid;
    grid-template-columns: 320px 1fr;
    overflow: hidden;
    position: relative;
    box-shadow: var(--shadow-lg);

    .contacts-wrapper {
        height: 100%;
        overflow: hidden;
    }

    .chat-wrapper {
        height: 100%;
        overflow: hidden;
        background-color: #0e1621;
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
      width: 95vw;
    }

    @media screen and (max-width: 719px) {
       display: block; /* Disable grid for stacking */
       width: 100vw;
       height: 100vh;
       border-radius: 0;
       border: none;

       .contacts-wrapper {
         width: 100%;
         height: 100%;
       }

       .chat-wrapper {
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         z-index: 10;
         transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
         transform: translateX(100%);
       }

       &.show-chat {
         .chat-wrapper {
           transform: translateX(0);
         }
       }
    }
  }
`;
