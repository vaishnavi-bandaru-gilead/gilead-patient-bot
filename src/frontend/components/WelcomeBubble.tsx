import "../styles/WelcomeBubble.css";
import { textConstants } from "../constants";

interface WelcomeBubbleProps {
    visible: boolean;
    onClose: () => void;
}

const WelcomeBubble: React.FC<WelcomeBubbleProps> = ({ visible, onClose }) => {
    return (
        <div className={`welcome-bubble ${visible ? "show" : ""}`}>
            <button className="welcome-close" onClick={onClose}></button>
            <p>{textConstants.WELCOME_TEXT}</p>
        </div>
    );
};

export default WelcomeBubble;
