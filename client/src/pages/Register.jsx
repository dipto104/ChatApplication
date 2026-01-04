import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { registerRoute } from "../utils/APIRoutes";

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  useEffect(() => {
    if (localStorage.getItem("chat-app-user")) {
      navigate("/");
    }
  }, []);

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleValidation = () => {
    const { password, confirmPassword, username, email } = values;
    if (password !== confirmPassword) {
      toast.error(
        "Password and confirm password should be same.",
        toastOptions
      );
      return false;
    } else if (username.length < 3) {
      toast.error(
        "Username should be greater than 3 characters.",
        toastOptions
      );
      return false;
    } else if (password.length < 8) {
      toast.error(
        "Password should be equal or greater than 8 characters.",
        toastOptions
      );
      return false;
    } else if (email === "") {
      toast.error("Email is required.", toastOptions);
      return false;
    } else if (username === "") {
      toast.error("Username is required.", toastOptions);
      return false;
    } else if (values.firstName === "") {
      toast.error("First Name is required.", toastOptions);
      return false;
    } else if (values.lastName === "") {
      toast.error("Last Name is required.", toastOptions);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (handleValidation()) {
      const { email, username, password, firstName, lastName } = values;
      const { data } = await axios.post(registerRoute, {
        username,
        email,
        firstName,
        lastName,
        password,
      });

      if (data.status === false) {
        toast.error(data.msg, toastOptions);
      }
      if (data.status === true) {
        localStorage.setItem(
          "chat-app-user",
          JSON.stringify(data.user)
        );
        navigate("/");
      }
    }
  };

  return (
    <>
      <FormContainer>
        <form action="" onSubmit={(event) => handleSubmit(event)}>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h1>chat</h1>
          </div>
          <input
            type="text"
            placeholder="First Name"
            name="firstName"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="text"
            placeholder="Last Name"
            name="lastName"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="text"
            placeholder="Username"
            name="username"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="email"
            placeholder="Email"
            name="email"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="password"
            placeholder="Password"
            name="password"
            onChange={(e) => handleChange(e)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            name="confirmPassword"
            onChange={(e) => handleChange(e)}
          />
          <button type="submit">Create User</button>
          <span>
            Already have an account? <Link to="/login">Login.</Link>
          </span>
        </form>
      </FormContainer>
      <ToastContainer />
    </>
  );
}

const FormContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 3.5rem;
    }
    h1 {
      color: var(--text-main);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.1rem;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background-color: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 2rem;
    padding: 3rem 5rem;
    box-shadow: var(--shadow-lg);
    width: 450px;
    
    input {
      background-color: rgba(255, 255, 255, 0.05);
      padding: 1rem;
      border: 1px solid var(--glass-border);
      border-radius: 0.8rem;
      color: var(--text-main);
      width: 100%;
      font-size: 1rem;
      transition: var(--transition-smooth);
      
      &:focus {
        border-color: var(--primary-color);
        outline: none;
        background-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
      }
    }

    button {
      background: var(--gradient-main);
      color: white;
      padding: 1rem 2rem;
      border: none;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0.8rem;
      font-size: 1rem;
      text-transform: uppercase;
      transition: var(--transition-smooth);
      margin-top: 0.5rem;
      
      &:hover {
        opacity: 0.9;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }
      
      &:active {
        transform: translateY(0);
      }
    }

    span {
      color: var(--text-dim);
      text-align: center;
      font-size: 0.9rem;
      
      a {
        color: var(--primary-color);
        font-weight: 600;
        text-decoration: none;
        transition: var(--transition-smooth);
        
        &:hover {
          color: var(--accent-color);
        }
      }
    }
  }

  @media screen and (max-width: 480px) {
    form {
      width: 90%;
      padding: 2.5rem 2rem;
    }
  }
`;
