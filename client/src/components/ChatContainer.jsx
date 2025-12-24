import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import UserMenu from "./UserMenu";
import { v4 as uuidv4 } from "uuid";
import Logo from "../assets/logo.svg";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

import { IoArrowBack, IoClose } from "react-icons/io5";
import { BsCheck, BsCheckAll } from "react-icons/bs";
import { markAsReadRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket, onlineUsers, onBack, onClose, currentUser, userStatus, onStatusToggle, arrivalMessage, refreshContacts }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();

  const isOnline = onlineUsers?.includes(currentChat.id);

  // Mark as read function
  const markMessagesAsRead = async () => {
    if (currentChat && currentUser) {
      await axios.post(markAsReadRoute, {
        conversationId: currentChat.conversationId || 0,
        researcherId: currentUser.id,
        senderId: currentChat.id, // The person who sent the messages we are reading
      });
      socket.current.emit("read-msg", {
        to: currentChat.id,
        from: currentUser.id,
      });
      if (refreshContacts) refreshContacts();
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (currentChat && currentUser) {
        const response = await axios.post(recieveMessageRoute, {
          from: currentUser.id,
          to: currentChat.id,
        });
        setMessages(response.data);
        markMessagesAsRead();
      }
    }
    fetchData();
  }, [currentChat]);

  const handleSendMsg = async (msg) => {
    socket.current.emit("send-msg", {
      to: currentChat.id,
      from: currentUser.id,
      msg,
    });
    await axios.post(sendMessageRoute, {
      from: currentUser.id,
      to: currentChat.id,
      message: msg,
    });

    setMessages((prev) => [...prev, {
      fromSelf: true,
      message: msg,
      status: isOnline ? "DELIVERED" : "SENT",
      time: new Date()
    }]);
  };

  // Handle incoming status/message events from prop
  useEffect(() => {
    if (arrivalMessage) {
      if (arrivalMessage.type === "delivered") {
        if (currentChat?.id === arrivalMessage.from) {
          setMessages((prev) =>
            prev.map(msg => (msg.fromSelf && msg.status === "SENT") ? { ...msg, status: "DELIVERED" } : msg)
          );
        }
      } else if (arrivalMessage.type === "read") {
        if (currentChat?.id === arrivalMessage.from) {
          setMessages((prev) =>
            prev.map(msg => msg.fromSelf ? { ...msg, status: "READ" } : msg)
          );
        }
      } else {
        // Normal message
        if (currentChat?.id === arrivalMessage.from) {
          setMessages((prev) => [...prev, {
            fromSelf: false,
            message: arrivalMessage.message,
            status: "SENT",
            time: arrivalMessage.time
          }]);
          markMessagesAsRead();
        }
      }
    }
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (time) => {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="back-button" onClick={onBack}>
            <IoArrowBack />
          </div>
          <div className="avatar">
            {currentChat.avatarImage ? (
              <img
                src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
                alt=""
              />
            ) : (
              <div className="initial-avatar">
                {currentChat.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
            <span className={`status ${isOnline ? "online" : "offline"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <UserMenu
            currentUser={currentUser}
            userStatus={userStatus}
            onStatusToggle={onStatusToggle}
          />
          <div className="close-button" onClick={onClose} title="Close Chat">
            <IoClose />
          </div>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${message.fromSelf ? "sended" : "recieved"
                  }`}
              >
                <div className="content">
                  <p>{message.message}</p>
                  <div className="meta">
                    <span className="time">{formatTime(message.time)}</span>
                    {message.fromSelf && (
                      <span className="status-icon">
                        {message.status === "READ" ? (
                          <BsCheckAll className="read" />
                        ) : message.status === "DELIVERED" ? (
                          <BsCheckAll className="delivered" />
                        ) : (
                          <BsCheck className="sent" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 5rem 1fr 5rem;
  gap: 0.1rem;
  overflow: hidden;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.4);

  @media screen and (max-width: 719px) {
    width: 100%;
    height: 100%;
    grid-template-rows: 4.5rem 1fr 4.5rem;
    background-color: var(--bg-dark);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    background-color: rgba(30, 41, 59, 0.5);
    border-bottom: 1px solid var(--glass-border);
    
    @media screen and (max-width: 719px) {
      padding: 0 1rem;
    }

    .user-details {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      
      .back-button {
        display: none;
        font-size: 1.5rem;
        color: var(--text-main);
        cursor: pointer;
        
        @media screen and (max-width: 719px) {
          display: flex;
          align-items: center;
          margin-right: 0.5rem;
        }
      }

      .avatar {
        img {
          height: 3rem;
          border-radius: 50%;
          border: 2px solid var(--primary-color);
        }
        .initial-avatar {
          height: 3rem;
          width: 3rem;
          background-color: #3390ec;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: 600;
          font-size: 1.2rem;
        }
      }
      .username {
        display: flex;
        flex-direction: column;
        h3 {
          color: var(--text-main);
          font-size: 1.1rem;
          font-weight: 600;
        }
        .status {
          font-size: 0.8rem;
          font-weight: 500;
          &.online {
            color: #22c55e;
          }
          &.offline {
            color: var(--text-dim);
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;

      .close-button {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.5rem;
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        color: var(--text-main);
        font-size: 1.4rem;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          transform: rotate(90deg);
        }
      }
    }
  }

  .chat-messages {
    padding: 1.5rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    overflow: auto;
    background-image: radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%);

    &::-webkit-scrollbar {
      width: 0.3rem;
      &-thumb {
        background-color: var(--glass-border);
        border-radius: 1rem;
      }
    }

    .message {
      display: flex;
      align-items: center;
      animation: fadeIn 0.3s ease-out;

      .content {
        max-width: 50%;
        overflow-wrap: break-word;
        padding: 1rem 1.4rem;
        font-size: 1rem;
        padding: 0.7rem 1rem;
        font-size: 0.95rem;
        border-radius: 0.8rem;
        color: #f5f5f5;
        line-height: 1.4;
        
        @media screen and (max-width: 719px) {
          max-width: 85%;
        }

        .meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
          margin-top: 0.2rem;
          font-size: 0.7rem;
          
          .time {
            color: rgba(255, 255, 255, 0.5);
          }

          .status-icon {
            display: flex;
            align-items: center;
            font-size: 1.1rem;
            
            .sent, .delivered {
              color: rgba(255, 255, 255, 0.4);
            }
            .read {
              color: #3390ec;
            }
          }
        }
      }
    }

    .sended {
      justify-content: flex-end;
      .content {
        background-color: #2b5278;
        border-bottom-right-radius: 0.2rem;
      }
    }

    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #182533;
        border-bottom-left-radius: 0.2rem;
      }
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
