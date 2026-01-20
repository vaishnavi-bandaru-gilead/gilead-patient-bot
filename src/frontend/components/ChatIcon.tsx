import React from "react";
import "../styles/ChatIcon.css";
import "../App.css"
import doctorImg from "../assets/doctor.png";

interface ChatIconProps {
    onClick: () => void;
}

const ChatIcon: React.FC<ChatIconProps> = ({ onClick }) => {
    return (
        <div className="chat-icon" onClick={onClick}>
            <img src={doctorImg} alt="Chat Icon" />
        </div>
    );
};

export default ChatIcon;
