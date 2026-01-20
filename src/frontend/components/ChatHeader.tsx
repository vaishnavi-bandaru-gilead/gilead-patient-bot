import React from "react";
import gileadLogo from "../assets/gilead-logo.png";
import "../styles/ChatHeader.css";
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import RemoveIcon from '@mui/icons-material/Remove';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface ChatHeaderProps {
    isMaximized: boolean;
    onToggleMaximize: () => void;
    onMinimize: () => void;
    onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
                                                   isMaximized,
                                                   onToggleMaximize,
                                                   onMinimize,
                                                   onClose
                                               }) => {
    return (
        <div className="chat-header">
            <div className="chat-header-left">
                <span
                    className="header-action-icon"
                    onClick={onToggleMaximize}
                    title={isMaximized ? "Minimize" : "Maximize"}
                >
                    {isMaximized ? (
                        <CloseFullscreenIcon sx={{
                            fontSize: 20,
                            transform: 'rotate(90deg)',
                            transition: 'transform 0.3s ease'
                        }} />
                    ) : (
                        <OpenInFullIcon sx={{
                            fontSize: 20,
                            transform: 'rotate(90deg)',
                            transition: 'transform 0.3s ease'
                        }} />
                    )}
                </span>

                <span
                    className="header-action-icon"
                    onClick={onMinimize}
                    title="Collapse"
                >
                    <RemoveIcon sx={{ fontSize: 22 }} />
                </span>
            </div>

            <div className="chat-header-center">
                <img src={gileadLogo} alt="Gilead logo" className="gilead-logo" />
            </div>

            <div className="chat-header-right">
                <span
                    className="header-action-icon"
                    onClick={onClose}
                    title="Menu"
                >
                    <MoreVertIcon sx={{ fontSize: 22 }} />
                </span>
            </div>
        </div>
    );
};

export default ChatHeader;