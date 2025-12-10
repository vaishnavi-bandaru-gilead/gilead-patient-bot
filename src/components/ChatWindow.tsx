import React, { useState } from "react";
import "../styles/ChatWindow.css";
import doctorImg from "../assets/doctor.png";
import gillianIntro from "../assets/gillian-intro.png";
import gileadLogo from "../assets/gilead-logo.png";

interface ChatWindowProps {
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onClose }) => {
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => onClose(), 300);
    };

    const hasText = inputValue.trim().length > 0;

    return (
        <div className={`chat-window-container ${closing ? "closing" : ""}`}>

            {/* HEADER */}
            <div className="chat-header">
                <div className="chat-header-icons">
                    <span className="header-icon-1">⤡</span>
                    <button className="header-icon-btn" onClick={handleClose}>—</button>
                </div>

                <img src={gileadLogo} alt="Gilead logo" className="gilead-logo"/>

                <div className="chat-header-icons">
                    <span className="header-icon menu">⋮</span>
                </div>
            </div>

            {/* WELCOME BANNER */}
            <div className="welcome-banner">
                <img src={gillianIntro} className="banner-avatar" alt="avatar"/>
            </div>

            <hr className="divider"/>

            {/* CHAT BODY */}
            <div className="chat-body">
                <div className="msg-row">
                    <div className="msg-header">
                        <img src={doctorImg} className="msg-avatar" alt=""/>
                    </div>

                    <div className="msg-bubble">
                        <div className="msg-content">
                            Welcome. If you would like to report an adverse event...
                            <br/><br/>
                            <strong>Please type your question below and include a Gilead drug name.</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* INPUT BAR */}
            <div className="chat-input">
                <input
                    id="chatInput"
                    type="text"
                    placeholder="Type your question here"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />

                <button
                    id="sendBtn"
                    className={`send-btn ${hasText ? "active" : ""}`}
                    disabled={!hasText}
                >
                    ➣
                </button>
            </div>

            {/* FOOTER */}
            <div className="chat-footer">
                <span className="footer-caret">›</span>
                Privacy Statement
            </div>
        </div>
    );
};

export default ChatWindow;
