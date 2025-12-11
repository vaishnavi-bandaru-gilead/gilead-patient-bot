import React, {useEffect, useState} from "react";
import ChatIcon from "../src/components/ChatIcon";
import ChatWindow from "../src/components/ChatWindow";
import WelcomeBubble from "../src/components/WelcomeBubble";

import "./App.css";

const App: React.FC = () => {
    const [open, setOpen] = useState<boolean>(false);
    const [showBubble, setShowBubble] = useState<boolean>(false);

    const openChat = () => {
        setOpen(true);
        setShowBubble(false);
    };

    // Show welcome bubble 10 seconds after chat icon loads
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!open) setShowBubble(true);
        }, 7000); // 7 seconds

        return () => clearTimeout(timer);
    }, [open]);

    return (
        <>
            {!open && (
                <>
                    <WelcomeBubble visible={showBubble} onClose={() => setShowBubble(false)} />
                    <ChatIcon onClick={openChat} />
                </>
            )}

            {open && <ChatWindow onClose={() => setOpen(false)} />}
        </>
    );
};

export default App;