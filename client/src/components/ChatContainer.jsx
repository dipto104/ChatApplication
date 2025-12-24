import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import UserMenu from "./UserMenu";
import { v4 as uuidv4 } from "uuid";
import Logo from "../assets/logo.svg";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

import { IoArrowBack } from "react-icons/io5";

export default function ChatContainer({ currentChat, socket, onlineUsers, onBack, currentUser, userStatus, onStatusToggle }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);

  const isOnline = onlineUsers?.includes(currentChat.id);

  useEffect(() => {
    async function fetchData() {
      const data = await JSON.parse(
        localStorage.getItem("chat-app-user")
      );
      if (currentChat) {
        const response = await axios.post(recieveMessageRoute, {
          from: data.id,
          to: currentChat.id,
        });
        setMessages(response.data);
      }
    }
    fetchData();
  }, [currentChat]);

  useEffect(() => {
    const getCurrentChat = async () => {
      if (currentChat) {
        await JSON.parse(
          localStorage.getItem("chat-app-user")
        );
      }
    };
    getCurrentChat();
  }, [currentChat]);

  const handleSendMsg = async (msg) => {
    const data = await JSON.parse(
      localStorage.getItem("chat-app-user")
    );
    socket.current.emit("send-msg", {
      to: currentChat.id,
      from: data.id,
      msg,
    });
    await axios.post(sendMessageRoute, {
      from: data.id,
      to: currentChat.id,
      message: msg,
    });

    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg });
    setMessages(msgs);
  };

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (data) => {
        setArrivalMessage({ from: data.from, fromSelf: false, message: data.msg });
      });
    }
  }, []);

  useEffect(() => {
    arrivalMessage &&
      currentChat?.id === arrivalMessage.from &&
      setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="back-button" onClick={onBack}>
            <IoArrowBack />
          </div>
          <div className="avatar">
            {currentChat.avatar ? (
              <img
                src={`data:image/svg+xml;base64,${currentChat.avatar}`}
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
        <UserMenu
          currentUser={currentUser}
          userStatus={userStatus}
          onStatusToggle={onStatusToggle}
        />
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
