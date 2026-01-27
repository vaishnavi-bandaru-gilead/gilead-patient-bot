import { render, screen } from "@testing-library/react";
import SessionTimeOutModal from "../sessionTimeOutModal";
import { textConstants } from "../../constants";

describe("Timeout modal", () => {
  it("should render modal with the remaining time", async () => {
    render(
      <SessionTimeOutModal onContinue={jest.fn()} remainingSeconds={"30:00"} />
    );
    expect(
      screen.getByText(textConstants.TIMEOUT_TEXT.replace("--:--", "30:00"))
    ).toBeInTheDocument();
  });
});
