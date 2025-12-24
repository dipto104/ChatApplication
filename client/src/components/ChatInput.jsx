import React, { useState } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emojiData) => {
    let message = msg;
    message += emojiData.emoji;
    setMsg(message);
  };

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      handleSendMsg(msg);
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerhideShow} />
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <Picker theme="dark" onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </div>
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        <input
          type="text"
          placeholder="Type your message here..."
          onChange={(e) => setMsg(e.target.value)}
          value={msg}
        />
        <button type="submit">
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 8% 92%;
  background-color: rgba(30, 41, 59, 0.5);
  padding: 0 2rem;
  border-top: 1px solid var(--glass-border);

  @media screen and (max-width: 719px) {
    grid-template-columns: 15% 85%;
    padding: 0 1rem;
    gap: 0.5rem;
  }

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }

  .button-container {
    display: flex;
    align-items: center;
    color: var(--text-main);
    gap: 1rem;
    .emoji {
      position: relative;
      svg {
        font-size: 1.6rem;
        color: #fca311;
        cursor: pointer;
        transition: var(--transition-smooth);
        &:hover {
          transform: scale(1.1);
        }
      }
      .emoji-picker-container {
        position: absolute;
        bottom: 50px;
        left: 0;
        z-index: 1000;
        
        /* Modern Picker Overrides */
        .EmojiPickerReact {
            border: 1px solid var(--glass-border) !important;
            background-color: var(--bg-card) !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
            border-radius: 1rem !important;
            --epr-bg-color: transparent !important;
            --epr-category-label-bg-color: rgba(255,255,255,0.05) !important;
            --epr-search-input-bg-color: rgba(255,255,255,0.05) !important;
            --epr-picker-border-color: var(--glass-border) !important;
        }
      }
    }
  }

  .input-container {
    width: 100%;
    border-radius: 1rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--glass-border);
    transition: var(--transition-smooth);

    &:focus-within {
      border-color: var(--primary-color);
      background-color: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    input {
      width: 100%;
      height: 40px;
      background-color: transparent;
      color: var(--text-main);
      border: none;
      padding-left: 1rem;
      font-size: 1rem;

      &::selection {
        background-color: var(--primary-color);
      }
      &:focus {
        outline: none;
      }
      &::placeholder {
        color: var(--text-dim);
      }
    }

    button {
      padding: 0.6rem 1.2rem;
      border-radius: 0.8rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--gradient-main);
      border: none;
      cursor: pointer;
      transition: var(--transition-smooth);

      &:hover {
        opacity: 0.9;
        transform: translateX(2px);
      }

      svg {
        font-size: 1.4rem;
        color: white;
      }
    }
  }
`;
