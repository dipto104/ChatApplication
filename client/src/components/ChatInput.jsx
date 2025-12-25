import React, { useState, useRef } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend, IoMdImage } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";
import axios from "axios";
import { uploadImageRoute, host } from "../utils/APIRoutes";
import { compressImage } from "../utils/imageUtils";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emojiData) => {
    let message = msg;
    message += emojiData.emoji;
    setMsg(message);
  };

  const sendChat = async (event) => {
    event.preventDefault();
    if (msg.length > 0 || imageFile) {
      if (imageFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        try {
          const response = await axios.post(uploadImageRoute, formData);
          const { filename } = response.data;
          if (filename) {
            // filename is now "uploads/xyz.jpg" from server
            handleSendMsg(msg, "IMAGE", filename);
          }
        } catch (error) {
          console.error("Image upload failed:", error);
        } finally {
          setIsUploading(false);
          setImagePreview(null);
          setImageFile(null);
        }
      } else {
        handleSendMsg(msg, "TEXT");
      }
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  const handleImageSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setIsUploading(true);
        const compressed = await compressImage(file);
        setImageFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
          setIsUploading(false);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error("Compression failed:", err);
        setIsUploading(false);
      }
    }
    // Reset input so the same file can be selected again if removed
    event.target.value = "";
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  const handlePaste = async (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            setIsUploading(true);
            const compressed = await compressImage(file);
            setImageFile(compressed);
            const reader = new FileReader();
            reader.onloadend = () => {
              setImagePreview(reader.result);
              setIsUploading(false);
            };
            reader.readAsDataURL(compressed);
          } catch (err) {
            console.error("Paste compression failed:", err);
            setIsUploading(false);
          }
        }
      }
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
        <div className="image-upload">
          <IoMdImage onClick={triggerFileUpload} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            style={{ display: "none" }}
            accept="image/*"
          />
        </div>
      </div>
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        {imagePreview && (
          <div className="image-preview-wrapper">
            <div className="preview-container">
              <img src={imagePreview} alt="preview" />
              <div className="remove-image" onClick={removeImage}>
                ×
              </div>
            </div>
          </div>
        )}
        <input
          type="text"
          placeholder={imageFile ? "Add a caption..." : "Type your message here..."}
          onChange={(e) => setMsg(e.target.value)}
          onPaste={handlePaste}
          value={msg}
          disabled={isUploading}
        />
        <button type="submit" disabled={isUploading}>
          {isUploading ? <div className="loader"></div> : <IoMdSend />}
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 12% 88%;
  background-color: rgba(30, 41, 59, 0.5);
  padding: 0 2rem;
  border-top: 1px solid var(--glass-border);

  @media screen and (max-width: 719px) {
    grid-template-columns: 20% 80%;
    padding: 0 0.5rem;
    gap: 0.3rem;
    height: 4.5rem;
  }

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }

  /* Added for preview spacing when active */
  position: relative;

  .button-container {
    display: flex;
    align-items: center;
    color: var(--text-main);
    gap: 1rem;
    .emoji, .image-upload {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      
      svg {
        font-size: 1.8rem;
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
        
        @media screen and (max-width: 719px) {
          position: fixed;
          bottom: 5rem;
          left: 0.5rem;
          right: 0.5rem;
          width: auto;
          .EmojiPickerReact {
            width: 100% !important;
          }
        }

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

    .image-upload {
      svg {
        color: #7f91a4;
        &:hover {
          color: var(--primary-color);
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
      min-width: 50px;

      &:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateX(2px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      svg {
        font-size: 1.4rem;
        color: white;
      }

      .loader {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
      }
    }
  }

  .image-preview-wrapper {
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 100%;
    padding: 10px 2rem;
    background: transparent;
    pointer-events: none;
    
    @media screen and (max-width: 719px) {
        padding: 5px 0.5rem;
    }

    .preview-container {
      width: 80px;
      height: 80px;
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 0.8rem;
      position: relative;
      pointer-events: auto;
      box-shadow: var(--shadow-lg);
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0.8rem;
      }

      .remove-image {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: transform 0.2s;
        &:hover {
          transform: scale(1.1);
        }
      }
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
