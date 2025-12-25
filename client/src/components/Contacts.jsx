import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";

export default function Contacts({ contacts, allUsers, changeChat, onlineUsers, userStatus, onStatusToggle, isConversationList }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [view, setView] = useState("recent"); // "recent" or "online"

  useEffect(() => {
    const data = JSON.parse(
      localStorage.getItem("chat-app-user")
    );
    if (data) {
      setCurrentUserName(data.username);
      setCurrentUserImage(data.avatarImage);
    }
  }, []);

  const changeCurrentChat = (contact) => {
    setCurrentSelected(contact.id);
    changeChat(contact);
  };

  const isUserOnline = (userId) => {
    return onlineUsers?.includes(userId);
  };

  return (
    <>
      {currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h1 className="brand-name">chat</h1>
          </div>
          <div className="view-toggle">
            <button
              className={view === "recent" ? "active" : ""}
              onClick={() => setView("recent")}
            >
              Recent
            </button>
            <button
              className={view === "online" ? "active" : ""}
              onClick={() => setView("online")}
            >
              Online
            </button>
          </div>
          <div className="contacts">
            {view === "recent" ? (
              contacts.map((contact, index) => {
                return (
                  <div
                    key={contact.id}
                    className={`contact ${contact.id === currentSelected ? "selected" : ""}`}
                    onClick={() => changeCurrentChat(contact)}
                  >
                    <div className="avatar">
                      {contact.avatarImage ? (
                        <img
                          src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                          alt=""
                        />
                      ) : (
                        <div className="initial-avatar">
                          {contact.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className={`status-dot ${isUserOnline(contact.id) ? "online" : "offline"}`}></div>
                    </div>
                    <div className="username">
                      <h3>{contact.username}</h3>
                      {isConversationList && contact.lastMessage && (
                        <p className="last-message">
                          {contact.lastMessage.length > 25
                            ? contact.lastMessage.substring(0, 25) + "..."
                            : contact.lastMessage}
                        </p>
                      )}
                    </div>
                    {isConversationList && contact.unreadCount > 0 && (
                      <div className="unread-badge">
                        {contact.unreadCount}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              (() => {
                const usersToFilter = (allUsers && allUsers.length > 0) ? allUsers : contacts;
                const onlineList = usersToFilter.filter(c => onlineUsers.includes(c.id));

                if (onlineList.length === 0) {
                  return <div className="no-online-mobile">No one is online</div>;
                }

                return onlineList.map((contact) => (
                  <div
                    key={contact.id}
                    className={`contact ${contact.id === currentSelected ? "selected" : ""}`}
                    onClick={() => changeCurrentChat(contact)}
                  >
                    <div className="avatar">
                      {contact.avatarImage ? (
                        <img
                          src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                          alt=""
                        />
                      ) : (
                        <div className="initial-avatar">
                          {contact.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="status-dot online"></div>
                    </div>
                    <div className="username">
                      <h3>{contact.username}</h3>
                      <p className="last-message">Active now</p>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
          <div className="current-user">
            <div className="avatar">
              {currentUserImage ? (
                <img
                  src={`data:image/svg+xml;base64,${currentUserImage}`}
                  alt="avatar"
                />
              ) : (
                <div className="initial-avatar">
                  {currentUserName ? currentUserName[0].toUpperCase() : "U"}
                </div>
              )}
              <div className={`status-dot ${userStatus}`}></div>
            </div>
            <div className="user-details-wrapper">
              <div className="username">
                <h2>{currentUserName}</h2>
                <p className="my-status">{userStatus}</p>
              </div>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 5rem 1fr 6rem;
  overflow: hidden;
  height: 100%;
  background-color: var(--bg-card);
  border-right: 1px solid var(--glass-border);

  @media screen and (max-width: 719px) {
    width: 100%;
    grid-template-rows: 8rem 1fr 5.5rem; /* Increased top row for buttons */
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 2.5rem;
    }
    .brand-name {
       color: var(--text-main);
       text-transform: uppercase;
       font-weight: 600;
       letter-spacing: 0.1rem;
       font-size: 1.5rem;
    }
    @media screen and (max-width: 719px) {
      gap: 0.5rem;
      img {
        height: 2rem;
      }
      .brand-name {
        font-size: 1.2rem;
      }
    }
  }

  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    padding: 1rem 0;
    
    &::-webkit-scrollbar {
      width: 0.3rem;
      &-thumb {
        background-color: var(--glass-border);
        background-color: rgba(255, 255, 255, 0.1);
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
      }
    }

    .contact {
      background-color: transparent;
      min-height: 4.5rem;
      cursor: pointer;
      width: 100%;
      padding: 0.8rem 1.2rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: background-color 0.2s ease;
      
      .avatar {
        position: relative;
        img {
          height: 3.2rem;
          border-radius: 50%;
        }
        .initial-avatar {
          height: 3.2rem;
          width: 3.2rem;
          background-color: #3390ec; /* Telegram Global Blue Fallback */
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: 600;
          font-size: 1.2rem;
        }
        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          border: 2px solid var(--bg-card);
          border-radius: 50%;
          &.online {
              background-color: #22c55e;
          }
          &.offline {
              background-color: #7f91a4;
          }
        }
      }

      .username {
        h3 {
          color: var(--text-main);
          transition: color 0.3s ease;
          font-size: 1rem;
        }
        .last-message {
          color: var(--text-dim);
          font-size: 0.8rem;
          margin-top: 0.1rem;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
      &:hover {
        background-color: rgba(255, 255, 255, 0.03);
      }
    }
    .unread-badge {
      background-color: #3390ec;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      min-width: 1.2rem;
      height: 1.2rem;
      padding: 0 0.4rem;
      border-radius: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(51, 144, 236, 0.7); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(51, 144, 236, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(51, 144, 236, 0); }
    }

    .selected {
      background-color: #2b5278 !important;
      border-left: 3px solid #3390ec;
      .username h3 {
          color: white;
          font-weight: 600;
      }
    }
  }

  .current-user {
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem;
    border-top: 1px solid var(--glass-border);
    
    .avatar {
      position: relative;
      img {
        height: 3.5rem;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
      }
      .status-dot {
        position: absolute;
        bottom: 5px;
        right: 5px;
        width: 12px;
        height: 12px;
        border: 2px solid #000;
        border-radius: 50%;
        &.online {
            background-color: #22c55e;
            box-shadow: 0 0 8px #22c55e;
        }
        &.offline {
            background-color: #94a3b8;
        }
      }
    }

    .user-details-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        flex: 1;

        .username {
          h2 {
            color: var(--text-main);
            font-size: 1.1rem;
            font-weight: 600;
          }
          .my-status {
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: capitalize;
          }
        }
    }

    @media screen and (max-width: 719px) {
      padding: 1rem;
      .username {
        h2 {
          font-size: 1rem;
        }
      }
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username {
        h2 {
          font-size: 0.9rem;
        }
      }
    }
  }

  .view-toggle {
    display: none;
    @media screen and (max-width: 719px) {
      display: flex;
      padding: 0 1rem 0.5rem;
      gap: 0.5rem;
      button {
        flex: 1;
        padding: 0.5rem;
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--glass-border);
        color: var(--text-dim);
        border-radius: 0.5rem;
        font-size: 0.8rem;
        cursor: pointer;
        &.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
      }
    }
  }

  .no-online-mobile {
      color: var(--text-dim);
      text-align: center;
      padding: 2rem;
      font-size: 0.9rem;
  }
`;
