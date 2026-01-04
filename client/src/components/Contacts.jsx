import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { BsThreeDotsVertical } from "react-icons/bs";
import { BiPowerOff, BiChevronDown, BiSearch } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { searchUserRoute, getUserGroupsRoute } from "../utils/APIRoutes";
import CreateGroupModal from "./CreateGroupModal";
import { IoMdAdd } from "react-icons/io";

export default function Contacts({ contacts, allUsers, changeChat, onlineUsers, userStatus, onStatusToggle, isConversationList, socket, onDeleteConversation, onDeleteForMe }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [view, setView] = useState("recent"); // "recent" or "online"
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null); // contact.id of open menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = JSON.parse(
      localStorage.getItem("chat-app-user")
    );
    if (data) {
      setCurrentUser(data);
      setCurrentUserName(data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.username);
      setCurrentUserImage(data.avatarImage);
    }
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".contact-menu")) {
        setMenuVisible(null);
      }
      if (!e.target.closest(".current-user")) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const changeCurrentChat = (contact) => {
    setCurrentSelected(contact.id);
    changeChat(contact);
  };

  const isUserOnline = (userId) => {
    return onlineUsers?.includes(userId);
  };



  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 0) {
        try {
          // Assuming we have the current user's ID stored in localStorage or available via props
          // But wait, the API needs the current user's ID (req.params.id)
          // Let's get it from localStorage again if needed, or better, pass currentUser as prop?
          // data is parsed in useEffect above, let's store currentUser ID there too.
          const user = await JSON.parse(localStorage.getItem("chat-app-user"));
          if (user) {
            const { data } = await axios.get(`${searchUserRoute}/${user.id}?query=${searchQuery}`);
            setSearchResults(data);
          }
        } catch (error) {
          console.error("Error searching users:", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <>
      {currentUserName && (
        <Container>
          <div className="sidebar-header">
            <div className="brand">
              <img src={Logo} alt="logo" />
              <h1 className="brand-name">chat</h1>
              <IoMdAdd className="add-group-btn" onClick={() => setShowCreateGroup(true)} title="Create Group" />
            </div>


            <div className="search-bar">
              <BiSearch />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
          </div>

          <div className="contacts">
            {searchQuery.length > 0 ? (
              searchResults.length > 0 ? (
                searchResults.map((contact) => (
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
                          {contact.username ? contact.username[0].toUpperCase() : "U"}
                        </div>
                      )}
                      <div className={`status-dot ${isUserOnline(contact.id) ? "online" : "offline"}`}></div>
                    </div>
                    <div className="username">
                      <h3>{contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.username}</h3>
                      <p className="last-message">@{contact.username}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">No users found</div>
              )
            ) : (
              view === "recent" ? (
                contacts.map((contact, index) => {
                  return (
                    <div
                      key={contact.id}
                      className={`contact ${contact.id === currentSelected ? "selected" : ""}`}
                      onClick={() => changeCurrentChat(contact)}
                    >
                      <div className="avatar">
                        {contact.isGroup ? (
                          <div className="initial-avatar">
                            {contact.username ? contact.username.substring(0, 2).toUpperCase() : "GP"}
                          </div>
                        ) : (
                          contact.avatarImage ? (
                            <img
                              src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                              alt=""
                            />
                          ) : (
                            <div className="initial-avatar">
                              {contact.username[0].toUpperCase()}
                            </div>
                          )
                        )}
                        {!contact.isGroup && <div className={`status-dot ${isUserOnline(contact.id) ? "online" : "offline"}`}></div>}
                      </div>
                      <div className="username">
                        <h3>{contact.isGroup ? contact.username : (contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.username)}</h3>
                        {isConversationList && contact.lastMessage && (
                          <p className="last-message">
                            {contact.isGroup && contact.senderName && <span style={{ fontWeight: 'bold' }}>{contact.senderName}: </span>}
                            {contact.lastMessage.length > 25
                              ? contact.lastMessage.substring(0, 25) + "..."
                              : contact.lastMessage}
                          </p>
                        )}
                      </div>

                      {isConversationList && (
                        <div className="contact-meta">
                          {contact.lastMessageTime && (
                            <span className="time">
                              {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {contact.unreadCount > 0 && (
                            <div className="unread-badge">
                              {contact.unreadCount}
                            </div>
                          )}
                        </div>
                      )}

                      {isConversationList && (
                        <div className="contact-menu">
                          <BsThreeDotsVertical
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuVisible(menuVisible === contact.id ? null : contact.id);
                            }}
                          />
                          {menuVisible === contact.id && (
                            <div className="menu-dropdown">
                              <p
                                className="delete-me"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteForMe(contact.conversationId, contact.id);
                                  setMenuVisible(null);
                                }}
                              >
                                Delete for me
                              </p>
                              <p
                                className="delete-everyone"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConversation(contact.conversationId, contact.id);
                                  setMenuVisible(null);
                                }}
                              >
                                Delete for everyone
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                (() => {
                  const usersToFilter = (allUsers && allUsers.length > 0) ? allUsers : contacts;
                  const onlineList = usersToFilter.filter(c => !c.isGroup && onlineUsers.includes(c.id));

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
                        <h3>{contact.firstName && contact.lastName ? `${contact.firstName} ${contact.lastName}` : contact.username}</h3>
                        <p className="last-message">Active now</p>
                      </div>
                    </div>
                  ));
                })()
              ))}

          </div>
          <div className="current-user" onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}>
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
              <BiChevronDown className={`chevron ${userMenuOpen ? "rotate" : ""}`} />
            </div>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); onStatusToggle(); setUserMenuOpen(false); }}>
                  <div className={`status-toggle-dot ${userStatus === "online" ? "offline" : "online"}`}></div>
                  <span>Switch to {userStatus === "online" ? "Offline" : "Online"}</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout" onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
                  <BiPowerOff />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </Container >
      )
      }
      {
        showCreateGroup && (
          <CreateGroupModal
            currentUser={JSON.parse(localStorage.getItem("chat-app-user"))}
            onClose={() => setShowCreateGroup(false)}
            onGroupCreated={(newGroup) => {
              if (socket.current) {
                socket.current.emit("create-group", newGroup);
              }
              setShowCreateGroup(false);
            }}
          />
        )
      }
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 5rem 1fr 5.5rem; /* Header, Contacts (1fr), User Profile */
  overflow: hidden;
  height: 100%;
  background-color: var(--bg-card);
  border-right: 1px solid var(--glass-border);

  .sidebar-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  @media screen and (max-width: 719px) {
    width: 100%;
    grid-template-rows: auto 1fr 5rem; /* Let header size naturally, list takes rest */
    
    .sidebar-header {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--glass-border);
      background-color: var(--bg-card);
    }
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
      padding: 0.1rem 0; /* Bare minimum padding */
      img {
        height: 1.2rem;
      }
      .brand-name {
        font-size: 0.85rem;
      }
    }
    }
    
    .add-group-btn {
        color: var(--text-dim);
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: auto; /* Push to right */
        &:hover { color: var(--primary-color); }
    }
  }

  .search-bar {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    margin: 0 1rem;
    
    svg {
        color: var(--text-dim);
        font-size: 1.2rem;
    }

    input {
        background-color: transparent;
        border: none;
        color: var(--text-main);
        width: 100%;
        font-size: 1rem;
        &:focus {
            outline: none;
        }
        &::placeholder {
            color: var(--text-dim);
        }
    }
  }
  
  .no-results {
      text-align: center;
      color: var(--text-dim);
      margin-top: 2rem;
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
      
      @media screen and (max-width: 719px) {
        min-height: 4rem; /* Shorter items to see more on screen */
        padding: 0.6rem 1rem;
      }
      
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
        @media screen and (max-width: 719px) {
          img, .initial-avatar {
             height: 2.8rem;
             width: 2.8rem;
          }
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
        flex: 1;
        min-width: 0;
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
        @media screen and (max-width: 719px) {
          h3 { font-size: 0.95rem; }
          .last-message { font-size: 0.8rem; }
        }
      }
      &:hover {
        background-color: rgba(255, 255, 255, 0.03);
      }
    }
    .contact-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.3rem;
      margin-left: auto;
      
      .time {
        font-size: 0.7rem;
        color: var(--text-dim);
        font-weight: 400;
      }
    }

    .unread-badge {
      background-color: #3390ec;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      min-width: 1.2rem;
      height: 1.2rem;
      padding: 0 0.35rem;
      border-radius: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      width: fit-content;
      box-shadow: 0 0 12px rgba(51, 144, 236, 0.6);
      animation: pulse 2s infinite;
      line-height: 1;
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

    .contact-menu {
      position: relative;
      opacity: 0;
      transition: opacity 0.2s ease;
      svg {
        color: var(--text-dim);
        font-size: 1.1rem;
        cursor: pointer;
        &:hover {
          color: white;
        }
      }
      .menu-dropdown {
        position: absolute;
        top: 2rem;
        right: 0;
        background-color: var(--bg-dark);
        border: 1px solid var(--glass-border);
        border-radius: 0.5rem;
        min-width: 150px;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        padding: 0.5rem 0;
        animation: fadeIn 0.2s ease;
        
        p {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          margin: 0;
          cursor: pointer;
          
          &.delete-me {
            color: var(--text-main);
          }
          
          &.delete-everyone {
            color: #ef4444;
          }

          &:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }
        }
      }
    }

    .contact:hover .contact-menu {
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .current-user {
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem;
    border-top: 1px solid var(--glass-border);
    cursor: pointer;
    position: relative;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .avatar {
      position: relative;
      img {
        height: 3.5rem;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
      }
      .initial-avatar {
          height: 3.5rem;
          width: 3.5rem;
          background-color: #3390ec;
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
        align-items: center;
        gap: 0.5rem;
        flex: 1;

        .username {
          flex: 1;
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

        .chevron {
          color: var(--text-dim);
          font-size: 1.5rem;
          transition: transform 0.3s ease;
          &.rotate {
            transform: rotate(180deg);
          }
        }
    }

    .user-dropdown {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 10px;
      right: 10px;
      background-color: var(--bg-card);
      backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 1rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      padding: 0.5rem;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;

      .dropdown-item {
        padding: 0.8rem;
        border-radius: 0.6rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        color: var(--text-main);
        font-size: 0.9rem;
        font-weight: 500;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }

        &.logout {
          color: #ef4444;
          &:hover {
            background-color: rgba(239, 68, 68, 0.1);
          }
        }

        .status-toggle-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          &.online { background-color: #22c55e; }
          &.offline { background-color: #94a3b8; }
        }

        svg {
          font-size: 1.2rem;
        }
      }

      .dropdown-divider {
        height: 1px;
        background-color: var(--glass-border);
        margin: 0.4rem;
      }
    }

    @media screen and (max-width: 719px) {
      padding: 0.6rem 0.8rem; /* Slimmer current user area */
      gap: 0.8rem;
      .username {
        h2 {
          font-size: 0.9rem;
        }
        .my-status {
          font-size: 0.7rem;
        }
      }
      .avatar {
        img, .initial-avatar {
          height: 2.6rem;
          width: 2.6rem;
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
      padding: 0 1.2rem 0.4rem; /* Zero top padding */
      gap: 0.5rem;
      justify-content: center;
      
      button {
        flex: 1;
        max-width: 100px; 
        padding: 0.15rem 0.4rem; /* Ultra-flat buttons */
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--glass-border);
        color: var(--text-dim);
        border-radius: 0.4rem; 
        font-size: 0.7rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
          box-shadow: 0 2px 8px rgba(51, 144, 236, 0.3);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .group-tabs {
     display: flex !important; /* Force display even on desktop to show Tabs */
     padding-bottom: 0.5rem;
     margin-top: -0.5rem;
  }

  .no-online-mobile {
      color: var(--text-dim);
      text-align: center;
      padding: 2rem;
      font-size: 0.9rem;
  }
`;
