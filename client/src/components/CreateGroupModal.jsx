import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { IoMdClose, IoMdSearch } from "react-icons/io";
import axios from "axios";
import { searchUserRoute, createGroupRoute } from "../utils/APIRoutes";

export default function CreateGroupModal({ currentUser, onClose, onGroupCreated }) {
    const [groupName, setGroupName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                try {
                    const { data } = await axios.get(`${searchUserRoute}/${currentUser.id}?query=${searchQuery}`);
                    setSearchResults(data);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, currentUser]);

    const handleSelectUser = (user) => {
        if (!selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedUsers.length === 0) return;
        setIsLoading(true);
        try {
            const participantIds = selectedUsers.map(u => u.id);
            // Admin (current user) will be added by server if not included, but good to check
            const { data } = await axios.post(createGroupRoute, {
                name: groupName,
                participants: participantIds,
                adminId: currentUser.id
            });
            if (data.status) {
                onGroupCreated(data.group);
                onClose();
            }
        } catch (err) {
            console.error("Failed to create group", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Overlay>
            <ModalContainer>
                <div className="header">
                    <h3>Create New Group</h3>
                    <IoMdClose onClick={onClose} />
                </div>
                <div className="body">
                    <div className="input-group">
                        <label>Group Name</label>
                        <input
                            type="text"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Add Members</label>
                        <div className="search-box">
                            <IoMdSearch />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map(user => (
                                    <div key={user.id} className="user-item" onClick={() => handleSelectUser(user)}>
                                        <div className="avatar">
                                            <img src={`data:image/svg+xml;base64,${user.avatar}`} alt="" />
                                        </div>
                                        <div className="info">
                                            <span className="name">{user.firstName} {user.lastName}</span>
                                            <span className="username">@{user.username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="selected-members">
                        <h4>Selected Members ({selectedUsers.length})</h4>
                        <div className="chips">
                            {selectedUsers.map(user => (
                                <div key={user.id} className="chip">
                                    <span>{user.username}</span>
                                    <IoMdClose onClick={() => handleRemoveUser(user.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="footer">
                    <button onClick={onClose} className="cancel-btn">Cancel</button>
                    <button
                        onClick={handleCreateGroup}
                        className="create-btn"
                        disabled={!groupName || selectedUsers.length === 0 || isLoading}
                    >
                        {isLoading ? "Creating..." : "Create Group"}
                    </button>
                </div>
            </ModalContainer>
        </Overlay>
    );
}

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    background: var(--bg-card);
    width: 450px;
    max-width: 90%;
    border-radius: 1rem;
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--glass-border);
        background: rgba(255,255,255,0.05);

        h3 {
            color: var(--text-main);
            margin: 0;
        }

        svg {
            color: var(--text-dim);
            font-size: 1.5rem;
            cursor: pointer;
            &:hover { color: var(--text-main); }
        }
    }

    .body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
        max-height: 60vh;
        overflow-y: auto;

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;

            label {
                color: var(--text-dim);
                font-size: 0.9rem;
            }

            input {
                background: rgba(0,0,0,0.2);
                border: 1px solid var(--glass-border);
                padding: 0.8rem;
                border-radius: 0.5rem;
                color: white;
                &:focus { outline: 1px solid var(--primary-color); }
            }

            .search-box {
                position: relative;
                display: flex;
                align-items: center;
                input { width: 100%; padding-left: 2.5rem; }
                svg {
                    position: absolute;
                    left: 0.8rem;
                    color: var(--text-dim);
                    font-size: 1.2rem;
                }
            }

            .search-results {
                background: var(--bg-dark);
                border: 1px solid var(--glass-border);
                border-radius: 0.5rem;
                max-height: 150px;
                overflow-y: auto;
                margin-top: 0.2rem;
                
                .user-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.6rem 1rem;
                    cursor: pointer;
                    &:hover { background: rgba(255,255,255,0.1); }
                    
                    .avatar img {
                        width: 30px;
                        height: 30px;
                    }

                    .info {
                        display: flex;
                        flex-direction: column;
                        .name { color: white; font-size: 0.9rem; }
                        .username { color: var(--text-dim); font-size: 0.8rem; }
                    }
                }
            }
        }

        .selected-members {
            h4 { color: var(--text-main); font-size: 0.9rem; margin-bottom: 0.5rem; }
            .chips {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                
                .chip {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(99, 102, 241, 0.2);
                    padding: 0.3rem 0.6rem;
                    border-radius: 1rem;
                    border: 1px solid rgba(99, 102, 241, 0.4);
                    
                    span { color: white; font-size: 0.85rem; }
                    svg { 
                        cursor: pointer; 
                        font-size: 1rem;
                        &:hover { color: #f87171; }
                    }
                }
            }
        }
    }

    .footer {
        padding: 1rem 1.5rem;
        background: rgba(0,0,0,0.2);
        display: flex;
        justify-content: flex-end;
        gap: 1rem;

        button {
            padding: 0.6rem 1.2rem;
            border-radius: 0.5rem;
            border: none;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .cancel-btn {
            background: transparent;
            color: var(--text-dim);
            &:hover { color: white; background: rgba(255,255,255,0.1); }
        }

        .create-btn {
            background: var(--gradient-main);
            color: white;
            &:disabled { opacity: 0.5; cursor: not-allowed; }
            &:hover:not(:disabled) { transform: translateY(-1px); }
        }
    }
`;
