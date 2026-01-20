import React, {useEffect, useState} from "react";
import ChatIcon from "./components/ChatIcon.tsx";
import ChatWindow from "./components/ChatWindow.tsx";
import WelcomeBubble from "./components/WelcomeBubble.tsx";

import "./App.css";

const App: React.FC = () => {
    const [open, setOpen] = useState<boolean>(false);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [showBubble, setShowBubble] = useState<boolean>(false);

    const openChat = () => {
        if (isMinimized) {
            setIsMinimized(false);
        } else {
            setOpen(true);
        }
        setShowBubble(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!open) setShowBubble(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, [open]);

    return (
        <>
            {(!open || isMinimized) && (
                <>
                    <WelcomeBubble visible={showBubble} onClose={() => setShowBubble(false)} />
                    <ChatIcon onClick={openChat} />
                </>
            )}

            {open && (
                <ChatWindow
                    isMinimized={isMinimized}
                    onClose={() => {
                        setOpen(false);
                        setIsMinimized(false);
                    }}
                    onMinimize={() => setIsMinimized(true)}
                />
            )}
        </>
    );
};

export default App;