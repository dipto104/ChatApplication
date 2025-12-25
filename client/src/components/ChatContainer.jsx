import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import { v4 as uuidv4 } from "uuid";
import Logo from "../assets/logo.svg";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute, markAsReadRoute, unsendMessageRoute, removeMessageRoute, deleteConversationRoute, addReactionRoute, removeReactionRoute, host } from "../utils/APIRoutes";
import { IoArrowBack, IoClose } from "react-icons/io5";
import { BsCheck, BsCheckAll, BsThreeDotsVertical } from "react-icons/bs";
import { MdAddReaction } from "react-icons/md";

export default function ChatContainer({ currentChat, socket, onlineUsers, currentUser, userStatus, onStatusToggle, onBack, onClose, arrivalMessage, refreshContacts, onDeleteConversation }) {
  const [messages, setMessages] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [msgMenuVisible, setMsgMenuVisible] = useState(null); // id of the message whose menu is open
  const [reactionPickerVisible, setReactionPickerVisible] = useState(null); // id of the message whose reaction picker is open
  const [pinnedReactionMsgId, setPinnedReactionMsgId] = useState(null); // id of the message whose picker is pinned open
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef();
  const chatMessagesRef = useRef(null);
  const isFirstLoad = useRef(true);
  const skipAutoScroll = useRef(false);
  const MESSAGE_LIMIT = 20;

  const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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
        setHasMore(true);
        isFirstLoad.current = true;
        const response = await axios.post(recieveMessageRoute, {
          from: currentUser.id,
          to: currentChat.id,
          limit: MESSAGE_LIMIT,
        });
        setMessages(response.data);
        setHasMore(response.data.length === MESSAGE_LIMIT);
        markMessagesAsRead();
      }
    }
    fetchData();
  }, [currentChat]);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight } = e.currentTarget;
    if (scrollTop <= 10 && hasMore && !isLoadingMore && messages.length > 0) {
      setIsLoadingMore(true);
      const firstMessage = messages[0];
      const previousScrollHeight = scrollHeight;

      try {
        const response = await axios.post(recieveMessageRoute, {
          from: currentUser.id,
          to: currentChat.id,
          before: firstMessage.time,
          limit: MESSAGE_LIMIT,
        });

        if (response.data.length > 0) {
          const newMessages = response.data;
          skipAutoScroll.current = true;
          setMessages((prev) => [...newMessages, ...prev]);
          if (newMessages.length < MESSAGE_LIMIT) {
            setHasMore(false);
          }

          // Scroll Anchoring: Maintain scroll position after content is prepended
          requestAnimationFrame(() => {
            if (chatMessagesRef.current) {
              const currentScrollHeight = chatMessagesRef.current.scrollHeight;
              chatMessagesRef.current.scrollTop = currentScrollHeight - previousScrollHeight;
            }
          });
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to load older messages", err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const handleSendMsg = async (msg, type = "TEXT", fileUrl = null) => {
    const messageData = {
      to: currentChat.id,
      from: currentUser.id,
      msg,
      messageType: type,
      fileUrl,
    };

    await axios.post(sendMessageRoute, {
      from: currentUser.id,
      to: currentChat.id,
      message: msg,
      messageType: type,
      fileUrl,
    });

    socket.current.emit("send-msg", messageData);

    setMessages((prev) => [...prev, {
      id: uuidv4(),
      fromSelf: true,
      message: msg,
      messageType: type,
      fileUrl,
      status: isOnline ? "DELIVERED" : "SENT",
      time: new Date()
    }]);

    if (refreshContacts) refreshContacts();
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
            id: uuidv4(),
            fromSelf: false,
            message: arrivalMessage.message,
            messageType: arrivalMessage.messageType || "TEXT",
            fileUrl: arrivalMessage.fileUrl || null,
            status: "SENT",
            time: arrivalMessage.time
          }]);
          markMessagesAsRead();
        }
      }
    }
  }, [arrivalMessage]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-unsend", (data) => {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      });

      socket.current.on("reaction-added", (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, reactions: [...(m.reactions || []), data.reaction] }
              : m
          )
        );
      });

      socket.current.on("reaction-removed", (data) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, reactions: (m.reactions || []).filter(r => r.userId !== data.userId) }
              : m
          )
        );
      });

      socket.current.on("conversation-deleted", (data) => {
        if (currentChat?.id === data.from) {
          setMessages([]);
          if (onClose) onClose();
        }
        if (refreshContacts) refreshContacts();
      });
    }

    const handleGlobalClick = (e) => {
      // Close pinned picker if clicking outside
      if (!e.target.closest(".reaction-trigger")) {
        setPinnedReactionMsgId(null);
        setReactionPickerVisible(null);
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);

  }, [socket]);

  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await axios.post(addReactionRoute, {
        messageId,
        userId: currentUser.id,
        emoji,
      });

      // Update local state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const existingReactions = m.reactions || [];
            const userReactionIndex = existingReactions.findIndex(r => r.userId === currentUser.id);

            if (userReactionIndex >= 0) {
              // Update existing reaction
              const updated = [...existingReactions];
              updated[userReactionIndex] = response.data.reaction;
              return { ...m, reactions: updated };
            } else {
              // Add new reaction
              return { ...m, reactions: [...existingReactions, response.data.reaction] };
            }
          }
          return m;
        })
      );

      // Emit to socket for real-time update
      socket.current.emit("add-reaction", {
        messageId,
        reaction: response.data.reaction,
        to: currentChat.id,
        from: currentUser.id,
      });

      setReactionPickerVisible(null);
      setPinnedReactionMsgId(null);
    } catch (err) {
      console.error("Failed to add reaction", err);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      await axios.delete(removeReactionRoute, {
        data: {
          messageId,
          userId: currentUser.id,
        },
      });

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: (m.reactions || []).filter(r => r.userId !== currentUser.id) }
            : m
        )
      );

      // Emit to socket for real-time update
      socket.current.emit("remove-reaction", {
        messageId,
        userId: currentUser.id,
        to: currentChat.id,
        from: currentUser.id,
      });

      setReactionPickerVisible(null);
      setPinnedReactionMsgId(null);
    } catch (err) {
      console.error("Failed to remove reaction", err);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUnsend = async (messageId) => {
    try {
      await axios.post(unsendMessageRoute, { messageId });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      socket.current.emit("unsend-msg", {
        messageId,
        to: currentChat.id,
        from: currentUser.id,
      });
      setMsgMenuVisible(null);
    } catch (err) {
      console.error("Failed to unsend message", err);
    }
  };

  const handleRemoveForMe = async (messageId) => {
    try {
      await axios.post(removeMessageRoute, { messageId, userId: currentUser.id });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setMsgMenuVisible(null);
    } catch (err) {
      console.error("Failed to remove message", err);
    }
  };



  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        scrollToBottom();
        isFirstLoad.current = false;
        return;
      }

      if (skipAutoScroll.current) {
        if (!isLoadingMore) {
          skipAutoScroll.current = false;
        }
        return;
      }

      const container = chatMessagesRef.current;
      if (container && !isLoadingMore) {
        // If last message is from self, always scroll to bottom
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.fromSelf) {
          scrollToBottom();
          return;
        }

        // If user is near bottom, scroll for new incoming messages
        const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }
  }, [messages, isLoadingMore]);

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
          <div className="close-button" onClick={onClose} title="Close Chat">
            <IoClose />
          </div>
        </div>
      </div>
      <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
        {isLoadingMore && (
          <div className="loading-more">
            <div className="loader"></div>
            <span>Loading older messages...</span>
          </div>
        )}
        {messages.map((message) => {
          return (
            <div key={message.id}>
              <div
                className={`message ${message.fromSelf ? "sended" : "recieved"
                  }`}
              >
                <div className="content">
                  <div className="message-options">
                    <BsThreeDotsVertical
                      onClick={() => setMsgMenuVisible(msgMenuVisible === message.id ? null : message.id)}
                    />
                    {msgMenuVisible === message.id && (
                      <div className="options-dropdown">
                        <p onClick={() => handleRemoveForMe(message.id)}>Remove for me</p>
                        {message.fromSelf && (
                          <p className="unsend" onClick={() => handleUnsend(message.id)}>Unsend for everyone</p>
                        )}
                      </div>
                    )}
                  </div>

                  {message.messageType === "IMAGE" ? (
                    <div className="image-content">
                      <img
                        src={message.fileUrl ? (message.fileUrl.startsWith('http') ? message.fileUrl : `/${message.fileUrl}`) : ''}
                        alt="sent-uploaded"
                        onLoad={() => {
                          // Only auto-scroll for new messages (not when loading history)
                          if (!isLoadingMore && !skipAutoScroll.current) {
                            const container = chatMessagesRef.current;
                            if (container) {
                              const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 400;
                              const isLastMessage = messages[messages.length - 1]?.id === message.id;
                              if ((isNearBottom && isLastMessage) || message.fromSelf) {
                                scrollToBottom();
                              }
                            }
                          }
                        }}
                        onClick={() => setViewingImage(message.fileUrl)}
                        style={{ cursor: "pointer" }}
                      />
                      {message.message && <p>{message.message}</p>}
                    </div>
                  ) : (
                    <p>{message.message}</p>
                  )}
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
                  {/* Reaction Picker */}
                  <div
                    className="reaction-trigger"
                    onMouseEnter={() => setReactionPickerVisible(message.id)}
                    onMouseLeave={() => {
                      if (pinnedReactionMsgId !== message.id) {
                        setReactionPickerVisible(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pinnedReactionMsgId === message.id) {
                        // Unpin
                        setPinnedReactionMsgId(null);
                      } else {
                        // Pin
                        setPinnedReactionMsgId(message.id);
                        setReactionPickerVisible(message.id);
                      }
                    }}
                  >
                    <MdAddReaction />
                    {reactionPickerVisible === message.id && (
                      <div className="reaction-picker">
                        {QUICK_REACTIONS.map((emoji) => {
                          const existingReaction = message.reactions?.find(r => r.userId === currentUser.id);
                          const isSelected = existingReaction?.emoji === emoji;

                          return (
                            <span
                              key={emoji}
                              className={`reaction-emoji ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                if (isSelected) {
                                  handleRemoveReaction(message.id);
                                } else {
                                  handleAddReaction(message.id, emoji);
                                }
                              }}
                            >
                              {emoji}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reaction Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="reactions-display">
                    {(() => {
                      const reactionCounts = {};
                      message.reactions.forEach(r => {
                        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
                      });

                      const userReaction = message.reactions.find(r => r.userId === currentUser.id);

                      return Object.entries(reactionCounts).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className={`reaction-bubble ${userReaction?.emoji === emoji ? 'user-reacted' : ''}`}
                          onClick={() => {
                            if (userReaction?.emoji === emoji) {
                              handleRemoveReaction(message.id);
                            } else {
                              handleAddReaction(message.id, emoji);
                            }
                          }}
                          title={message.reactions
                            .filter(r => r.emoji === emoji)
                            .map(r => r.user.username)
                            .join(', ')}
                        >
                          {emoji} {count > 1 && count}
                        </span>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />

      {
        viewingImage && (
          <LightboxOverlay onClick={() => { setViewingImage(null); setZoom(1); }}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={viewingImage}
                alt="lightbox"
                style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? "zoom-out" : "zoom-in" }}
                onClick={() => setZoom(zoom === 1 ? 2 : 1)}
              />
              <button className="close-btn" onClick={() => { setViewingImage(null); setZoom(1); }}>
                <IoClose />
              </button>
              <div className="zoom-controls">
                <button onClick={() => setZoom(Math.max(1, zoom - 0.5))}>-</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(3, zoom + 0.5))}>+</button>
              </div>
            </div>
          </LightboxOverlay>
        )
      }
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
    width: 100vw;
    height: 100dvh;
    grid-template-rows: 4.5rem 1fr 4.5rem;
    background-color: var(--bg-dark);
    position: fixed;
    top: 0;
    left: 0;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    background-color: rgba(30, 41, 59, 0.5);
    border-bottom: 1px solid var(--glass-border);
    
    @media screen and (max-width: 719px) {
      padding: 0 0.8rem;
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

    .loading-more {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0;
      color: var(--text-dim);
      font-size: 0.85rem;

      .loader {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        border-top-color: var(--primary-color);
        animation: spin 1s ease-in-out infinite;
      }
    }

    .message {
      display: flex;
      align-items: center;
      animation: fadeIn 0.3s ease-out;

      .content {
        max-width: 55%;
        overflow-wrap: break-word;
        font-size: 0.95rem;
        border-radius: 0.8rem;
        color: #f5f5f5;
        line-height: 1.4;
        position: relative;
        
        @media screen and (max-width: 719px) {
          max-width: 85%;
        }

        &.unsent {
          font-style: italic;
          color: rgba(255, 255, 255, 0.4);
          background-color: rgba(255, 255, 255, 0.05) !important;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .message-options {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: all 0.2s;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.4);
          z-index: 10;
          
          svg {
            font-size: 1rem;
            &:hover {
              color: white;
            }
          }
        }

        &:hover .message-options {
          opacity: 1;
        }

        .options-dropdown {
          position: absolute;
          background: #17212b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem;
          width: 160px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          z-index: 100;
          animation: fadeInMenu 0.2s ease;

          p {
            margin: 0;
            padding: 0.6rem 0.8rem;
            font-size: 0.85rem;
            color: #f5f5f5;
            border-radius: 0.3rem;
            white-space: nowrap;
            display: block;
            text-align: left;
            &:hover {
              background: rgba(255, 255, 255, 0.05);
            }
            &.unsend {
              color: #ff595a;
              &:hover {
                background: rgba(255, 89, 90, 0.1);
              }
            }
          }
        }

        @keyframes fadeInMenu {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .image-content {
          padding: 0.3rem;
          img {
            max-width: 100%;
            max-height: 400px;
            border-radius: 0.6rem;
            display: block;
            object-fit: contain;
            background-color: rgba(0,0,0,0.2);
          }
          p {
            padding: 0.5rem 0.7rem 0.2rem;
          }
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

        .reaction-trigger {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity 0.2s;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.4);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;

          svg {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.6);
            &:hover {
              color: white;
            }
          }

          .reaction-picker {
            position: absolute;
            bottom: 100%;
            right: 0;
            background: #17212b;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 2rem;
            padding: 0.5rem 0.8rem;
            display: flex;
            gap: 0.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            animation: fadeInMenu 0.2s ease;

            .reaction-emoji {
              font-size: 1.5rem;
              cursor: pointer;
              transition: transform 0.2s;
              &:hover {
                transform: scale(1.3);
              }
              &.selected {
                background: rgba(51, 144, 236, 0.3);
                border-radius: 50%;
                transform: scale(1.1);
              }
            }
          }
        }

        &:hover .reaction-trigger {
          opacity: 1;
        }


        .reactions-display {
          display: flex;
          gap: 0.3rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;

          .reaction-bubble {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 1rem;
            padding: 0.2rem 0.5rem;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.2rem;

            &:hover {
              background: rgba(255, 255, 255, 0.15);
              transform: scale(1.05);
            }

            &.user-reacted {
              background: rgba(51, 144, 236, 0.3);
              border-color: #3390ec;
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
        .message-options {
          left: -1.5rem;
        }
        .reaction-trigger {
          left: -3.5rem;
          right: auto;
        }
      }
    }

    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #182533;
        border-bottom-left-radius: 0.2rem;
        .message-options {
          right: -1.5rem;
        }
        .reaction-trigger {
          right: -3.5rem;
          left: auto;
        }
        .options-dropdown {
          left: 100%;
          bottom: 0;
          margin-left: 0.5rem;
        }
      }
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const LightboxOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeInModal 0.3s ease;

  .lightbox-content {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 90dvh;
      object-fit: contain;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 0.5rem;
    }

    .close-btn {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(5px);
      transition: all 0.2s;
      z-index: 2100;
      &:hover {
        background: rgba(239, 68, 68, 0.5);
        transform: scale(1.1);
      }
    }

    .zoom-controls {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 0.5rem 1.5rem;
        border-radius: 2rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        color: white;
        z-index: 2100;
        border: 1px solid rgba(255,255,255,0.1);

        button {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            width: 30px;
            &:hover {
                color: var(--primary-color);
            }
        }
    }
  }

  @keyframes fadeInModal {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
