import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";


export default function Welcome({ currentUser }) {
  const [userName, setUserName] = useState("");
  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.username);
    }
  }, [currentUser]);

  return (
    <Container>
      <div className="welcome-content">
        <img src={Logo} alt="Welcome" />
        <h1>
          Welcome, <span>{userName}!</span>
        </h1>
        <h3>Please select a contact to start your premium chat experience.</h3>
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  color: var(--text-main);
  background-color: #17212b;

  .welcome-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 1.5rem;
      padding: 2rem;

      img {
        height: 15rem;
        filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.3));
        animation: float 4s ease-in-out infinite;
      }

      h1 {
        font-size: 2.5rem;
        font-weight: 600;
        span {
          background: var(--gradient-main);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      }

      h3 {
        color: var(--text-dim);
        font-weight: 400;
        max-width: 400px;
        line-height: 1.6;
      }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
`;
