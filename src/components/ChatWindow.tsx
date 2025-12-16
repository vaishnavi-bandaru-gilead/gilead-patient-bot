import React, { useState, useEffect, useRef } from "react";
import "../styles/ChatWindow.css";
import doctorImg from "../assets/doctor.png";
import gillianIntro from "../assets/gillian-intro.png";
import gileadLogo from "../assets/gilead-logo.png";
import ReactMarkdown from 'react-markdown';
import MessageBubble from "../components/MessageBubble";

interface ChatWindowProps {
    onClose: () => void;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: Date;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onClose }) => {
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-msg',
            text: "Welcome. If you would like to report an adverse event at any time, you can visit Gilead's Adverse Event Reporting portal, or call 1‑800‑GILEAD‑5 (press option #3).\n\n**Please type your question below and include a Gilead drug name.**",            sender: 'bot',
            timestamp: new Date()
        },
        // {
        //     id: 'sys-init',
        //     text: "Here is **bold** text and a [link](https://gilead.com).",
        //     sender: 'bot',
        //     timestamp: new Date()
        // },
        // {
        //     id: 'sys-1',
        //     text: "Hello. I'm Gillian, your virtual help assistant. How can I help you today?",
        //     sender: 'bot',
        //     timestamp: new Date()
        // }
    ]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [watermark, setWatermark] = useState<number>(0);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    // Unique User ID
    const userId = useRef(`user-${Date.now()}`).current;

    //Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            try {
                // Get Token
                const tokenRes = await fetch('/api/directline/token');
                if (!tokenRes.ok) throw new Error("Backend connection failed");
                const tokenData = await tokenRes.json();
                setToken(tokenData.token);

                // Start Conversation
                const startRes = await fetch(`https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/conversations/${conversationId}/activities`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${tokenData.token}` }
                });
                const startData = await startRes.json();
                setConversationId(startData.conversationId);

            } catch (error) {
                console.error("Init failed:", error);
                setMessages(prev => [...prev, {
                    id: 'sys-init',
                    text: "⚠️ Service unavailable. Please check your connection.",
                    sender: 'system',
                    timestamp: new Date()
                }]);
            }
        };
        initChat();
    }, []);

    //Polling for new messages
    // useEffect(() => {
    //     if (!conversationId || !token) return;
    //
    //     const intervalId = setInterval(async () => {
    //         try {
    //             const res = await fetch(
    //                 `https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/token?api-version=2022-03-01-preview/conversations/${conversationId}/activities?watermark=${watermark}`,
    //                 { headers: { 'Authorization': `Bearer ${token}` } }
    //             );
    //             const data = await res.json();
    //
    //             if (data.watermark) setWatermark(data.watermark);
    //
    //             if (data.activities && data.activities.length > 0) {
    //                 const newMessages: Message[] = [];
    //                 data.activities.forEach((activity: any) => {
    //                     if (activity.from.id !== userId && activity.type === 'message') {
    //                         newMessages.push({
    //                             id: activity.id,
    //                             text: activity.text,
    //                             sender: 'bot',
    //                             timestamp: new Date(activity.timestamp || Date.now())
    //                         });
    //                     }
    //                 });
    //                 if (newMessages.length > 0) {
    //                     setMessages(prev => [...prev, ...newMessages]);
    //                 }
    //             }
    //         } catch (error) {
    //             console.error("Polling error:", error);
    //         }
    //     }, 3000);
    //
    //     return () => clearInterval(intervalId);
    // }, [conversationId, token, watermark]);



    //Polling for new messages
    useEffect(() => {
        if (!conversationId || !token) return;

        const intervalId = setInterval(async () => {
            try {
                const pollUrl =
                    `https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/conversations/${conversationId}/activities?watermark=${watermark}`;

                const res = await fetch(pollUrl, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                const data = await res.json();

                if (data.watermark) setWatermark(data.watermark);

                if (data.activities?.length) {
                    const newMessages = data.activities
                        .filter((activity: any) =>
                            activity.type === "message" &&
                            activity.from?.id !== userId &&
                            activity.text
                        )
                        .map((activity: any) => ({
                            id: activity.id,
                            text: activity.text,
                            sender: "bot",
                            timestamp: new Date(activity.timestamp)
                        }));

                    if (newMessages.length > 0) {
                        setMessages(prev => [...prev, ...newMessages]);
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 1500);

        return () => clearInterval(intervalId);
    }, [conversationId, token, watermark]);


    //Auto-scroll
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => onClose(), 300);
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const textToSend = inputValue;
        setInputValue("");

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date()
        }]);

        if (!conversationId || !token) {
            // If not connected, show a system message AFTER the user's message
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: 'sys-' + Date.now(),
                    text: "⚠️ Connecting to server... please wait.",
                    sender: 'system',
                    timestamp: new Date()
                }]);
            }, 500);
            return;
        }

        try {
            // await fetch(`https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/conversations/${conversationId}/activities`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${token}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({
            //         type: 'message',
            //         from: { id: userId },
            //         text: textToSend
            //     })
            // });
            await fetch(
                `https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/conversations/${conversationId}/activities`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        type: "message",
                        from: { id: userId },
                        text: textToSend
                    })
                }
            );


        } catch (error) {
            console.error("Send failed:", error);
            setMessages(prev => [...prev, {
                id: 'err-' + Date.now(),
                text: "❌ Failed to send message.",
                sender: 'system',
                timestamp: new Date()
            }]);
        }
    };


    const hasText = inputValue.trim().length > 0;

    return (
        <div className={`chat-container`}>
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

            {/* CHAT BODY */}
            <div className="chat-body" ref={chatBodyRef}>

                {/* WELCOME BANNER */}
                <div className="welcome-banner">
                    <img src={gillianIntro} className="banner-avatar" alt="avatar"/>
                </div>

                <hr className="divider"/>

                {/* Dynamic Messages */}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        text={msg.text}
                        sender={msg.sender}
                        timestamp={msg.timestamp}
                        isUser={msg.sender === "user"}
                    />
                ))}
            </div>

            {/* INPUT BAR */}
            <div className="chat-input">
                <input
                    id="chatInput"
                    type="text"
                    placeholder="Type your question here"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                    id="sendBtn"
                    className={`send-btn ${hasText ? "active" : ""}`}
                    disabled={!hasText}
                    onClick={handleSend}
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
        </div>
    );
};

export default ChatWindow;