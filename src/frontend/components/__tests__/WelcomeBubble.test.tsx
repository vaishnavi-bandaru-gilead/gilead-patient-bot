import { render, screen } from "@testing-library/react";
import WelcomeBubble from "../WelcomeBubble";
import { textConstants } from "../../constants";

describe("Welcome Bubble", () => {
  it("should render without crashing", async () => {
    render(<WelcomeBubble visible={true} onClose={() => {}} />);
    expect(document.querySelector(".welcome-bubble")).toBeInTheDocument();
    expect(screen.getByText(textConstants.WELCOME_TEXT)).toBeInTheDocument();
  });
});
