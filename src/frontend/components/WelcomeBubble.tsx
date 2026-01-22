import "../styles/WelcomeBubble.css";

interface WelcomeBubbleProps {
    visible: boolean;
    onClose: () => void;
}

const WelcomeBubble: React.FC<WelcomeBubbleProps> = ({ visible, onClose }) => {
    return (
        <div className={`welcome-bubble ${visible ? "show" : ""}`}>
            <button className="welcome-close" onClick={onClose}></button>
            <p>I can answer your questions about Gilead medications.</p>
        </div>
    );
};

export default WelcomeBubble;
