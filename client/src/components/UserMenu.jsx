import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { BiPowerOff, BiChevronDown } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.svg";

export default function UserMenu({ userStatus, onStatusToggle, currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <Container ref={menuRef}>
      <div className="menu-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="avatar">
          {currentUser?.avatarImage ? (
            <img
              src={`data:image/svg+xml;base64,${currentUser.avatarImage}`}
              alt="user"
            />
          ) : (
            <div className="initial-avatar">
              {currentUser?.username[0].toUpperCase()}
            </div>
          )}
          <div className={`status-dot ${userStatus}`}></div>
        </div>
        <BiChevronDown className={isOpen ? "rotate" : ""} />
      </div>

      {isOpen && (
        <Dropdown>
          <div className="user-info">
            <p className="name">{currentUser?.username}</p>
            <p className="status-label">Status: <span className={userStatus}>{userStatus}</span></p>
          </div>
          <Divider />
          <MenuItem onClick={() => { onStatusToggle(); setIsOpen(false); }}>
            <div className="item-content">
              <div className={`status-toggle-preview ${userStatus}`}></div>
              <span>Switch to {userStatus === "online" ? "Offline" : "Online"}</span>
            </div>
          </MenuItem>
          <MenuItem onClick={handleLogout} className="logout">
            <div className="item-content">
              <BiPowerOff />
              <span>Logout</span>
            </div>
          </MenuItem>
        </Dropdown>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  z-index: 100;

  .menu-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.4rem 0.8rem;
    border-radius: 2rem;
    background-color: rgba(255, 255, 255, 0.05);
    transition: var(--transition-smooth);
    border: 1px solid var(--glass-border);

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .avatar {
      position: relative;
      height: 2rem;
      width: 2rem;
      img {
        height: 100%;
        width: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      .initial-avatar {
        height: 100%;
        width: 100%;
        background-color: #3390ec;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .status-dot {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid var(--bg-card);
        &.online { background-color: #22c55e; }
        &.offline { background-color: #94a3b8; }
      }
    }

    svg {
      color: var(--text-dim);
      font-size: 1.2rem;
      transition: transform 0.3s ease;
      &.rotate {
        transform: rotate(180deg);
      }
    }
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 220px;
  background-color: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  animation: fadeIn 0.2s ease-out;

  .user-info {
    padding: 0.8rem;
    .name {
      color: var(--text-main);
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .status-label {
      font-size: 0.8rem;
      color: var(--text-dim);
      span {
        text-transform: capitalize;
        &.online { color: #22c55e; }
        &.offline { color: #94a3b8; }
      }
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const MenuItem = styled.div`
  padding: 0.8rem;
  border-radius: 0.6rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  color: var(--text-main);

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.logout {
    color: #ef4444;
    &:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
  }

  .item-content {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 0.9rem;
    font-weight: 500;

    svg {
      font-size: 1.2rem;
    }

    .status-toggle-preview {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      &.online { background-color: #94a3b8; } /* shows opposite for toggle preview */
      &.offline { background-color: #22c55e; }
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background-color: var(--glass-border);
  margin: 0.5rem;
`;
