import React from "react";
import styled from "styled-components";

export default function OnlineSidebar({ onlineUsers, contacts, changeChat }) {
    // Filter contacts to only show those who are online
    const onlineContacts = contacts.filter((contact) =>
        onlineUsers.includes(contact.id)
    );

    return (
        <Container>
            <div className="header">
                <h3>Online Users</h3>
                <div className="count">{onlineContacts.length}</div>
            </div>
            <div className="online-list">
                {onlineContacts.length > 0 ? (
                    onlineContacts.map((contact) => (
                        <div
                            key={contact.id}
                            className="online-user"
                            onClick={() => changeChat(contact)}
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
                                <p>Active now</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-online">
                        <p>No one is online right now</p>
                    </div>
                )}
            </div>
        </Container>
    );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-card);
  border-left: 1px solid var(--glass-border);
  overflow: hidden;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    height: 5rem;
    border-bottom: 1px solid var(--glass-border);
    
    h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .count {
      background-color: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      padding: 0.2rem 0.6rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
    }
  }

  .online-list {
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: 1rem 0;

    &::-webkit-scrollbar {
      width: 0.3rem;
      &-thumb {
        background-color: rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
      }
    }

    .online-user {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.8rem 1.2rem;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.03);
      }

      .avatar {
        position: relative;
        img {
          height: 2.8rem;
          border-radius: 50%;
        }
        .initial-avatar {
          height: 2.8rem;
          width: 2.8rem;
          background-color: #3390ec;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }
        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          border: 2px solid var(--bg-card);
          border-radius: 50%;
          background-color: #22c55e;
          box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
        }
      }

      .username {
        h3 {
          font-size: 0.95rem;
          color: var(--text-main);
          font-weight: 500;
        }
        p {
          font-size: 0.75rem;
          color: #22c55e;
          font-weight: 400;
        }
      }
    }

    .no-online {
      display: flex;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      p {
        color: var(--text-dim);
        font-size: 0.9rem;
      }
    }
  }

  @media screen and (max-width: 1080px) {
    display: none;
  }
`;
