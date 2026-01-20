import React, { useEffect, useRef, useState } from "react";
import "../styles/ChatWindow.css";
import gillianIntro from "../assets/gillian-intro.png";
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from "./MessageBubble.tsx";
import AdaptiveCardForm from "./AdaptiveCardForm.tsx";
import ChatHeader from "./ChatHeader.tsx";
import { PaperPlaneTilt } from 'phosphor-react';

interface ChatWindowProps {
    onClose: () => void;
    onMinimize: () => void;
    isMinimized: boolean;
}

type Sender = "user" | "bot" | "system";
interface Message {
    id: string;
    text?: string | null;
    sender: Sender;
    timestamp: Date;
    attachments?: any[];
    suggestedActions?: any[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onClose, onMinimize, isMinimized }) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [watermark, setWatermark] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([{
        id: 'welcome-msg',
        text: "Welcome. If you would like to report an adverse event at any time, you can visit Gilead's Adverse Event Reporting portal, or call 1-800-GILEAD-5 (press option #3).\n\n**Please type your question below and include a Gilead drug name.**",
        sender: 'bot',
        timestamp: new Date(),
    }]);

    const getUserId = () => {
        let id = localStorage.getItem('bot_user_id');
        if (!id) {
            id = `dl_${uuidv4()}`;
            localStorage.setItem('bot_user_id', id);
        }
        return id;
    };

    const chatBodyRef = useRef<HTMLDivElement>(null);
    const sessionStartedRef = useRef(false);
    const [telemetry, setTelemetry] = useState<any>(null);

    useEffect(() => {
        const getTelemetry = async () => {
            try {
                const geoRes = await fetch('https://ipapi.co/json/');
                const geoData = await geoRes.json();
                setTelemetry({
                    country: geoData.country_name,
                    city: geoData.city,
                    browser: navigator.userAgent,
                    platform: navigator.platform,
                    source: new URLSearchParams(window.location.search).get('utm_source') || document.referrer || "Direct"
                });
            } catch (err) {
                console.error("Telemetry capture failed", err);
            }
        };
        getTelemetry();
    }, []);

    const startSession = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/session/start", { method: "POST" });
            const data = await res.json();
            setConversationId(data.conversationId);
            setToken(data.token);
        } catch (err) { console.error("Session init error:", err); }
    };

    useEffect(() => {
        if (!sessionStartedRef.current) {
            sessionStartedRef.current = true;
            startSession();
        }
    }, []);

    const handleSend = async (customValue?: any) => {
        if (!customValue && !inputValue.trim()) return;
        if (!conversationId || !token) return;

        const isCardSubmit = typeof customValue === 'object' && customValue !== null;
        const textToSend = typeof customValue === 'string' ? customValue : (isCardSubmit ? "" : inputValue);

        if (!customValue) setInputValue("");
        setLoading(true);

        if (textToSend) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: textToSend, sender: 'user', timestamp: new Date() }]);
        }

        setMessages(prev => prev.map(m => ({ ...m, suggestedActions: [] })));

        try {
            const res = await fetch("http://localhost:8000/api/session/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId,
                    token,
                    message: textToSend,
                    watermark,
                    userId: getUserId(),
                    value: isCardSubmit ? customValue : null,
                    context: telemetry
                }),
            });

            const data = await res.json();
            setWatermark(data.watermark);

            if (data.text || (data.attachments && data.attachments.length > 0)) {
                setMessages(prev => [...prev, {
                    id: data.id || `bot-${Date.now()}`,
                    text: data.text,
                    sender: "bot",
                    timestamp: new Date(),
                    attachments: data.attachments || [],
                    suggestedActions: data.suggestedActions || []
                }]);
            }
        } catch (error) { console.error("Send failed:", error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages, loading]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => onClose(), 300);
    };

    const hasText = inputValue.trim().length > 0;

    const renderActions = (msg: Message) => {
        if (!msg.suggestedActions || msg.suggestedActions.length === 0) return null;
        return (
            <div className="suggested-actions-container">
                {msg.suggestedActions.map((action: any, i: number) => (
                    <button key={i} onClick={() => handleSend(action.value)} className="suggested-action-btn">
                        {action.title}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className={`chat-container 
            ${isMaximized ? "is-maximized" : "is-minimized"} 
            ${isMinimized ? "is-hidden" : "is-visible"}
        `}>
            <div className={`chat-window-container ${closing ? "closing" : ""}`}>
                <ChatHeader
                    isMaximized={isMaximized}
                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                    onMinimize={onMinimize}
                    onClose={handleClose}
                />

                <div className="chat-body" ref={chatBodyRef}>
                    <div className="welcome-banner"><img src={gillianIntro} className="banner-avatar" alt="avatar"/></div>
                    <hr className="divider"/>
                    {messages.map((msg, index) => {
                        const isBot = msg.sender === 'bot';
                        const showAvatar = isBot && (index === 0 || messages[index - 1].sender !== 'bot');
                        const isLastBotMessage = isBot && (index === messages.length - 1 || messages[index + 1].sender !== 'bot');
                        const adaptiveCard = msg.attachments?.find(a => a.contentType === "application/vnd.microsoft.card.adaptive");

                        return (
                            <div key={msg.id}>
                                {msg.text && (
                                    <MessageBubble
                                        text={msg.text}
                                        sender={msg.sender}
                                        timestamp={msg.timestamp}
                                        isUser={msg.sender === "user"}
                                        showAvatar={showAvatar}
                                        isLastBotMessage={isLastBotMessage && !adaptiveCard && (!msg.suggestedActions || msg.suggestedActions.length === 0)}
                                    >
                                        {!adaptiveCard && renderActions(msg)}
                                    </MessageBubble>
                                )}
                                {adaptiveCard && (
                                    <>
                                        {adaptiveCard.content.body.filter((el: any) => el.type === "TextBlock").map((block: any, bIdx: number) => (
                                            <MessageBubble key={`${msg.id}-b-${bIdx}`} text={block.text} sender="bot" timestamp={msg.timestamp} isUser={false} showAvatar={showAvatar && bIdx === 0 && !msg.text} isLastBotMessage={isLastBotMessage && bIdx === adaptiveCard.content.body.filter((el: any) => el.type === "TextBlock").length - 1 && !adaptiveCard.content.body.some((el: any) => el.type !== "TextBlock")} />
                                        ))}
                                        {adaptiveCard.content.body.some((el: any) => el.type !== "TextBlock") && (
                                            <MessageBubble
                                                text={null}
                                                sender="bot"
                                                timestamp={msg.timestamp}
                                                isUser={false}
                                                showAvatar={showAvatar && !msg.text && !adaptiveCard.content.body.some((el: any) => el.type === "TextBlock")}
                                                isLastBotMessage={isLastBotMessage && (!msg.suggestedActions || msg.suggestedActions.length === 0)}
                                            >
                                                <AdaptiveCardForm card={adaptiveCard.content} onSubmit={(val) => handleSend(val)} />
                                                {renderActions(msg)}
                                            </MessageBubble>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {loading && <div className="msg-row bot-row"><div className="msg-avatar-container"><div className="typing-indicator"><span>.</span><span>.</span><span>.</span></div></div></div>}
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        id="chatInput"
                        placeholder="Type your question here"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />

                    <button
                        className={`send-btn ${hasText ? "active" : ""}`}
                        disabled={!hasText}
                        onClick={() => handleSend()}
                        aria-label="Send"
                    >
                        <PaperPlaneTilt size={22}/>
                    </button>
                </div>
                <div className="chat-footer">
                    <span className="footer-caret">›</span> Privacy Statement
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;