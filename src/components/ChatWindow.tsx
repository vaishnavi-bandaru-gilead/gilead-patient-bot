import React, {useEffect, useRef, useState} from "react";
import "../styles/ChatWindow.css";
import gillianIntro from "../assets/gillian-intro.png";
import gileadLogo from "../assets/gilead-logo.png";
import MessageBubble from "../components/MessageBubble";
import AdaptiveCardForm from "../components/AdaptiveCardForm";

interface ChatWindowProps {
    onClose: () => void;
}

type Sender = "user" | "bot" | "system";

interface Message {
    id: string;
    text?: string | null;
    sender: Sender;
    timestamp: Date;
    attachments?: any[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({onClose}) => {
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const sessionStartedRef = useRef(false);

    const [conversationId, setConversationId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [baseUri, setBaseUri] = useState<string | null>(null);
    const [watermark, setWatermark] = useState<string | null>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome-msg',
            text:
                "Welcome. If you would like to report an adverse event at any time, you can visit Gilead's Adverse Event Reporting portal, or call 1-800-GILEAD-5 (press option #3).\n\n**Please type your question below and include a Gilead drug name.**",
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);

    // 1. Start Session
    const startSession = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/session/start", {method: "POST"});
            if (!res.ok) throw new Error(`Session start failed (${res.status})`);

            const data = await res.json();
            // Store all 3 pieces of session data
            setConversationId(data.conversationId);
            setToken(data.token);
            setBaseUri(data.baseUri);

            console.log("Session started on:", data.baseUri);
        } catch (err) {
            console.error("Session init error:", err);
            setMessages(prev => [...prev, {
                id: 'err-init',
                text: "❌ Error connecting to the agent. Please refresh.",
                sender: 'system',
                timestamp: new Date()
            }]);
        }
    };

    useEffect(() => {
        if (sessionStartedRef.current) return;
        sessionStartedRef.current = true;
        startSession();
    }, []);

    // 2. Send Message
    const handleSend = async () => {
        if (!inputValue.trim() || !conversationId || !token || !baseUri) return;

        const textToSend = inputValue;
        setInputValue("");

        // Add user message to UI immediately
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date()
        }]);

        try {
            const res = await fetch("http://localhost:8000/api/session/send", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    conversationId: conversationId,
                    token: token,
                    baseUri: baseUri,
                    text: textToSend,
                    watermark: watermark // Send the last known watermark
                }),
            });

            if (!res.ok) throw new Error(`Send failed (${res.status})`);

            const data = await res.json();

            // Update watermark for next request
            setWatermark(data.watermark);

            // Append bot responses
            if (data.messages && data.messages.length > 0) {
                const newBotMsgs = data.messages.map((msgText: string, index: number) => ({
                    id: `bot-${Date.now()}-${index}`,
                    text: msgText,
                    sender: "bot" as Sender,
                    timestamp: new Date(),
                }));
                setMessages(prev => [...prev, ...newBotMsgs]);
            }
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

    // Auto-scroll logic
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => onClose(), 300);
    };

    const hasText = inputValue.trim().length > 0;

    return (
        <div className={`chat-container`}>
            <div className={`chat-window-container ${closing ? "closing" : ""}`}>
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
                <div className="chat-body" ref={chatBodyRef}>
                    <div className="welcome-banner">
                        <img src={gillianIntro} className="banner-avatar" alt="avatar"/>
                    </div>
                    <hr className="divider"/>
                    {messages.map((msg, index) => {
                        const isBot = msg.sender === 'bot';

                        const showAvatar = isBot && (index === 0 || messages[index - 1].sender !== 'bot');
                        const isLastBotMessage = isBot && (index === messages.length - 1 || messages[index + 1].sender !== 'bot');

                        // Check for Adaptive Card
                        const adaptiveCard = msg.attachments?.find(
                            (att) => att.contentType === "application/vnd.microsoft.card.adaptive"
                        );

                        if (adaptiveCard && adaptiveCard.content && adaptiveCard.content.body) {
                            const bodyElements = adaptiveCard.content.body;
                            const textBlocks = bodyElements.filter((e: any) => e.type === "TextBlock");
                            const hasInputs = bodyElements.some((e: any) => e.type !== "TextBlock");
                            return (
                                <div key={msg.id}>
                                    {textBlocks.map((block: any, idx: number) => (
                                        <MessageBubble
                                            key={`${msg.id}-txt-${idx}`}
                                            text={block.text}
                                            sender="bot"
                                            timestamp={msg.timestamp}
                                            isUser={false}
                                            showAvatar={showAvatar && idx === 0}
                                            isLastBotMessage={isLastBotMessage && !hasInputs && idx === textBlocks.length - 1}
                                        />
                                    ))}

                                    {hasInputs && (
                                        <MessageBubble
                                            text={null}
                                            sender="bot"
                                            timestamp={msg.timestamp}
                                            isUser={false}
                                            showAvatar={showAvatar && textBlocks.length === 0}
                                            isLastBotMessage={isLastBotMessage}
                                        >
                                            <AdaptiveCardForm
                                                card={adaptiveCard.content}
                                                onSubmit={(values) => {
                                                    console.log("Adaptive card submit:", values);
                                                    fetch("/api/session/send", {
                                                        method: "POST",
                                                        headers: {"Content-Type": "application/json"},
                                                        body: JSON.stringify({
                                                            conversationId,
                                                            text: "",
                                                            value: values
                                                        })
                                                    });
                                                }}
                                            />
                                        </MessageBubble>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id}>
                                {msg.text && (
                                    <MessageBubble
                                        text={msg.text}
                                        sender={msg.sender}
                                        timestamp={msg.timestamp}
                                        isUser={msg.sender === "user"}
                                        showAvatar={showAvatar}
                                        isLastBotMessage={isLastBotMessage}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
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
                <div className="chat-footer">
                    <span className="footer-caret">›</span>
                    Privacy Statement
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
