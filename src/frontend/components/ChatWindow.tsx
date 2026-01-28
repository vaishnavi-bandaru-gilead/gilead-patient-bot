import React, {useCallback,useEffect, useRef, useState} from "react";
import "../styles/ChatWindow.css";
import gillianIntro from "../assets/patient-bot-intro.png";
import {v4 as uuidv4} from 'uuid';
import MessageBubble from "./MessageBubble.tsx";
import AdaptiveCardForm from "./AdaptiveCardForm.tsx";
import ChatHeader from "./ChatHeader.tsx";
import {PaperPlaneTilt} from 'phosphor-react';
import PrivacyCard from "./PrivacyCard.tsx";
import { useSessionCountdown } from "../hooks/sessionTimeout.tsx";
import SessionTimeOutModal from "./sessionTimeOutModal.tsx";

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

const ChatWindow: React.FC<ChatWindowProps> = ({onClose, onMinimize, isMinimized}) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([{
        id: 'welcome-msg',
        text: "Welcome. If you would like to report an adverse event at any time, you can visit Gilead's Adverse Event Reporting portal, or call 1-800-GILEAD-5 (press option #3).\n\n**Please type your question below and include a Gilead drug name.**",
        sender: 'bot',
        timestamp: new Date(),
    }]);
    const [showBanner, setShowBanner] = useState(() => {
        return localStorage.getItem("privacyPopUp") !== "accepted";
    });
    const [isPrivacyBannerOpen, setIsPrivacyBannerOpen] = useState( showBanner && true);
    const [showSessionPopUp, setShowSessionPopUp] = useState<boolean>(false);

    const chatBodyRef = useRef<HTMLDivElement>(null);
    const [telemetry, setTelemetry] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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


    const connectWebSocket = () => {
        const socket = new WebSocket("ws://localhost:8000/api/session/chat");
        socketRef.current = socket;

        socket.onopen = () => {
            setIsConnected(true);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received Bot message:", data);
            if (data.type === "session_started") {
                setConversationId(data.conversationId);
                setToken(data.token);
                localStorage.setItem('conversation_id', data.conversationId);
            }

            if (data.type === "bot_response") {
                const hasContent = data.text || (data.attachments && data.attachments.length > 0);
                if (hasContent) {
                    setLoading(false);
                    setMessages(prev => [...prev, {
                        id: data.id || `bot-${Date.now()}`,
                        text: data.text,
                        sender: "bot",
                        timestamp: new Date(),
                        attachments: data.attachments || [],
                        suggestedActions: data.suggestedActions || []
                    }]);
                }
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            console.warn("❌ Connection lost. Retrying in 3s...");
            if (!closing) reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            socketRef.current?.close();
        };
    }, []);

    const getUserId = () => {
        let id = localStorage.getItem('bot_user_id');
        if (!id) {
            id = `dl_${uuidv4()}`;
            localStorage.setItem('bot_user_id', id);
        }
        return id;
    };

    const handleSend = async (customValue?: any) => {
        if (!customValue && !inputValue.trim()) return;
        if (!isConnected || !token) return;

        const isComplex = typeof customValue === 'object' && customValue !== null && 'data' in customValue;
        const textToShow = isComplex ? customValue?.title : (typeof customValue === 'string' ? customValue : inputValue);
        const dataToBackend = isComplex ? customValue?.data : (typeof customValue === 'object' ? customValue : null);

        if (!customValue) setInputValue("");
        setLoading(true);

        if (textToShow) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(), text: textToShow, sender: 'user', timestamp: new Date()
            }]);
        }

        const payload = {
            conversationId: conversationId,
            token: token,
            userId: getUserId(),
            message: textToShow,
            value: dataToBackend,
            context: telemetry
        };

        console.log("user payload:", payload)

        try {
            await fetch("http://localhost:8000/api/session/send", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.error("Send failed", err);
            setLoading(false);
        }
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

    const handleTimeout = useCallback(() => {
      setClosing(true);
      onMinimize();
      localStorage.clear();
    }, [onMinimize]);

    const handlePopup = useCallback(() => {
      setShowSessionPopUp(true);
    }, []);

    const { remainingSeconds, reset } = useSessionCountdown({
      onTimeout: handleTimeout,
      onPopup: handlePopup,
      enabled: !isMinimized
    });

    return (
        <div
            className={`chat-container ${isMaximized ? "is-maximized" : "is-minimized"} ${isMinimized ? "is-hidden" : "is-visible"}`}>
            <div className={`chat-window-container ${closing ? "closing" : ""}`}>
                <ChatHeader
                    isMaximized={isMaximized}
                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                    onMinimize={onMinimize}
                    onClose={handleClose}
                />
                {isPrivacyBannerOpen && <div style={{background: "rgba(38, 51, 63, 0.6)", height:"100%", width: "100%", position: "absolute", zIndex: 10}}/>}
                {showSessionPopUp && <SessionTimeOutModal onContinue={() => { setShowSessionPopUp(false); reset(); }} remainingSeconds={remainingSeconds} />}

                <div className="chat-body" ref={chatBodyRef} >
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
                                    <MessageBubble text={msg.text} sender={msg.sender} timestamp={msg.timestamp}
                                                   isUser={msg.sender === "user"} showAvatar={showAvatar}
                                                   isLastBotMessage={isLastBotMessage && !adaptiveCard && (!msg.suggestedActions || msg.suggestedActions.length === 0)}>
                                        {!adaptiveCard && renderActions(msg)}
                                    </MessageBubble>
                                )}
                                {adaptiveCard && (
                                    <>
                                        {adaptiveCard.content.body.filter((el: any) => el.type === "TextBlock").map((block: any, bIdx: number) => (
                                            <MessageBubble key={`${msg.id}-b-${bIdx}`} text={block.text} sender="bot"
                                                           timestamp={msg.timestamp} isUser={false}
                                                           showAvatar={showAvatar && bIdx === 0 && !msg.text}
                                                           isLastBotMessage={isLastBotMessage && bIdx === adaptiveCard.content.body.filter((el: any) => el.type === "TextBlock").length - 1 && !adaptiveCard.content.body.some((el: any) => el.type !== "TextBlock")}/>
                                        ))}
                                        {adaptiveCard.content.body.some((el: any) => el.type !== "TextBlock") && (
                                            <MessageBubble text={null} sender="bot" timestamp={msg.timestamp}
                                                           isUser={false}
                                                           showAvatar={showAvatar && !msg.text && !adaptiveCard.content.body.some((el: any) => el.type === "TextBlock")}
                                                           isLastBotMessage={isLastBotMessage && (!msg.suggestedActions || msg.suggestedActions.length === 0)}>
                                                <AdaptiveCardForm card={adaptiveCard.content}
                                                                  onSubmit={(formValues) => handleSend(formValues)}/>
                                                {renderActions(msg)}
                                            </MessageBubble>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {loading && (
                        <MessageBubble
                            sender="bot"
                            timestamp={new Date()}
                            isUser={false}
                            showAvatar={true}
                            isLastBotMessage={true}
                        >
                            <div className="typing-indicator">
                                <span>     </span>
                                <span>     </span>
                                <span>     </span>
                            </div>
                        </MessageBubble>
                    )}
                </div>

                <div className="chat-input">
                    <input type="text" id="chatInput"
                           placeholder={isConnected ? "Type your question here" : "Reconnecting..."}
                           value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                           disabled = {!isConnected || isPrivacyBannerOpen || showSessionPopUp}
                    />
                    <button
                        className={`send-btn ${hasText && isConnected ? "active" : ""}`}
                        disabled={!hasText || isPrivacyBannerOpen || showSessionPopUp || !isConnected || loading}
                        onClick={() => {
                            console.log("Send clicked. Socket state:", socketRef.current?.readyState);
                            handleSend().then(r => console.log("Message sent:", r))
                        }
                        }
                        aria-label="Send"
                    >
                        <PaperPlaneTilt size={22}/>
                    </button>
                </div>

                <div style={isPrivacyBannerOpen ? {marginTop: "-30%", zIndex: 11} : {zIndex: 11}}>
                    <PrivacyCard isOpen={isPrivacyBannerOpen} onAccept={() => {setShowBanner(false); setIsPrivacyBannerOpen(false)}} showBanner={showBanner} setIsPrivacyBannerOpen={setIsPrivacyBannerOpen} onReject={onMinimize}/>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;