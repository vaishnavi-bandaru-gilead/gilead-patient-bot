import React, { useEffect, useRef, useState } from "react";
import "../styles/ChatWindow.css";
import gillianIntro from "../assets/gillian-intro.png";
import gileadLogo from "../assets/gilead-logo.png";
import MessageBubble from "../components/MessageBubble";

interface ChatWindowProps {
    onClose: () => void;
}

type Sender = "user" | "bot" | "system";

interface Message {
    id: string;
    text: string;
    sender: Sender;
    timestamp: Date;
}

type BackendMessage =
    | string
    | {
    id?: string;
    text?: string;
    timestamp?: string | number;
};

const toMessageObjects = (items: unknown, sender: Sender): Message[] => {
    if (!Array.isArray(items)) return [];

    return (items as BackendMessage[])
        .map((m) => {
            if (typeof m === "string") {
                return {
                    id: crypto.randomUUID(),
                    text: m,
                    sender,
                    timestamp: new Date(),
                } satisfies Message;
            }

            const text = m?.text ?? "";
            if (!text) return null;

            const ts = m.timestamp ?? Date.now();
            return {
                id: m.id ?? crypto.randomUUID(),
                text,
                sender,
                timestamp: new Date(ts),
            } satisfies Message;
        })
        .filter(Boolean) as Message[];
};


const sessionStartedRef = useRef(false);

useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    startSession();
}, []);

const startSession = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/session/start", {
            method: "POST",
        });

        if (!res.ok) {
            throw new Error(`Session start failed (${res.status})`);
        }

        const data = await res.json();

        setConversationId(data.conversationId);

        setMessages(prev => [
            ...prev,
            ...data.messages.map((m: any) => ({
                id: m.id ?? crypto.randomUUID(),
                text: m.text,
                sender: "bot",
                timestamp: new Date(m.timestamp ?? Date.now())
            }))
        ]);
    } catch (err) {
        console.error("Session init error:", err);
    }
};


const ChatWindow: React.FC<ChatWindowProps> = ({ onClose }) => {
    const [closing, setClosing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);

    // ✅ Keep your original initial welcome message so UI never appears empty
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome-msg",
            text:
                "Welcome. If you would like to report an adverse event at any time, you can visit Gilead's Adverse Event Reporting portal, or call 1-800-GILEAD-5 (press option #3).\n\n**Please type your question below and include a Gilead drug name.**",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);

    const chatBodyRef = useRef<HTMLDivElement>(null);

    /* ---------------------------
       START SESSION (ON MOUNT)
       Uses relative URL to avoid CORS + support Vite proxy
    ---------------------------- */
    useEffect(() => {
        let cancelled = false;

        const startSession = async () => {
            try {
                const res = await fetch("/api/session/start", { method: "POST" });
                if (!res.ok) throw new Error(`Session start failed (${res.status})`);

                const data: any = await res.json();
                if (cancelled) return;

                if (!data?.conversationId) {
                    throw new Error("Missing conversationId in /api/session/start response");
                }
                setConversationId(data.conversationId);

                const initialBotMessages = toMessageObjects(data.messages, "bot");

                // ✅ Append (do not replace) so welcome message stays
                if (initialBotMessages.length > 0) {
                    setMessages((prev) => [...prev, ...initialBotMessages]);
                }
            } catch (error) {
                console.error("Session init error:", error);
                if (cancelled) return;

                setMessages((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        text: "⚠️ Unable to connect right now. Please try again in a moment.",
                        sender: "system",
                        timestamp: new Date(),
                    },
                ]);
            }
        };

        startSession();

        return () => {
            cancelled = true;
        };
    }, []);

    /* ---------------------------
       AUTO SCROLL
    ---------------------------- */
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        fetch("http://localhost:3000/api/health")
            .then(res => res.json())
            .then(data => console.log("Backend health:", data))
            .catch(err => console.error("Backend error:", err));
    }, []);


    /* ---------------------------
       SEND MESSAGE
       Uses /api/session/send and appends bot replies
    ---------------------------- */
    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            text: trimmed,
            sender: "user",
            timestamp: new Date(),
        };

        // ✅ Render user message immediately (same behavior as before)
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");

        if (!conversationId) {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    text: "⚠️ Still connecting… please try again in a moment.",
                    sender: "system",
                    timestamp: new Date(),
                },
            ]);
            return;
        }

        try {
            const res = await fetch("/api/session/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, text: trimmed }),
            });

            if (!res.ok) throw new Error(`Send failed (${res.status})`);

            const data: any = await res.json();
            const botMsgs = toMessageObjects(data.messages, "bot");

            if (botMsgs.length > 0) {
                setMessages((prev) => [...prev, ...botMsgs]);
            }
        } catch (error) {
            console.error("Send error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    text: "❌ Failed to send message.",
                    sender: "system",
                    timestamp: new Date(),
                },
            ]);
        }
    };

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 300);
    };

    const hasText = inputValue.trim().length > 0;

    return (
        <div className="chat-container">
            <div className={`chat-window-container ${closing ? "closing" : ""}`}>
                {/* HEADER */}
                <div className="chat-header">
                    <button className="header-icon-btn" onClick={handleClose}>
                        —
                    </button>
                    <img src={gileadLogo} alt="Gilead logo" className="gilead-logo" />
                    <span className="header-icon menu">⋮</span>
                </div>

                {/* BODY */}
                <div className="chat-body" ref={chatBodyRef}>
                    <div className="welcome-banner">
                        <img src={gillianIntro} className="banner-avatar" alt="assistant" />
                    </div>

                    <hr className="divider" />

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

                {/* INPUT */}
                <div className="chat-input">
                    <input
                        type="text"
                        placeholder="Type your question here"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button
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
