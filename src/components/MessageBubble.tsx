import React from "react";
import ReactMarkdown from "react-markdown";
import doctorImg from "../assets/doctor.png";
import "../styles/MessageBubble.css";

interface MessageBubbleProps {
    text: string;
    sender: "user" | "bot" | "system";
    timestamp: Date;
    isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ text, sender, timestamp, isUser }) => {
    const formatTime = (date: Date) => {
        const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
        return `${day} ${time}`;
    };

    if (sender === "system") {
        return (
            <div style={{ textAlign: "center", margin: "15px 0", color: "#888", fontSize: "12px" }}>
                {text}
            </div>
        );
    }

    return (
        <div className={`msg-row ${isUser ? "user-row" : "bot-row"}`}>
            {!isUser && (
                <div className="msg-avatar-container">
                    <img src={doctorImg} className="msg-avatar" alt="" />
                </div>
            )}
            <div className="msg-content-wrapper" style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
                <div className={`msg-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
                    <ReactMarkdown
                        components={{
                            a: ({ node, ...props }) => (
                                <a
                                    style={{
                                        color: isUser ? "white" : "#00539B",
                                        textDecoration: "underline",
                                    }}
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                />
                            ),
                            p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                </div>
                <div className="msg-time">{formatTime(timestamp)}</div>
            </div>
        </div>
    );
};

export default MessageBubble;