import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyCard from "../PrivacyCard";
import { hyperLinks } from "../../constants";

const PRIVACY_TEXT =
  "By using this feature, you consent to your communications being monitored and/or recorded by our third-party chatbot provider. For more information on how we use the information collected and our privacy practices and commitment to protecting your data, please review Gilead's";

describe("PrivacyCard", () => {
  const mockOnAccept = jest.fn();
  const mockSetIsPrivacyBannerOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Rendering", () => {
    it("should render the Privacy Statement header", () => {
      render(
        <PrivacyCard
          isOpen={false}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      expect(screen.getByText("Privacy Statement")).toBeInTheDocument();
    });

    it("should render with closed state by default", () => {
      const { container } = render(
        <PrivacyCard
          isOpen={false}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const privacyContent = container.querySelector(
        '[bgcolor="white"][padding="25px"]'
      );
      expect(privacyContent).not.toBeInTheDocument();
    });

    it("should render privacy content when isOpen is true", async () => {
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      expect(screen.getByText(new RegExp(PRIVACY_TEXT))).toBeInTheDocument();
    });

    it("should render the regulatory text", () => {
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      expect(screen.getByText("MED-NON-NA-US-00191 12/23")).toBeInTheDocument();
    });
  });

  describe("Expand/Collapse functionality", () => {
    it("should toggle expansion state when icon button is clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PrivacyCard
          isOpen={false}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const iconButton = container.querySelector("button");
      await user.click(iconButton!);

      expect(mockSetIsPrivacyBannerOpen).toHaveBeenCalledWith(true);
    });

    it("should display right arrow icon when closed", () => {
      const { container } = render(
        <PrivacyCard
          isOpen={false}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const rightArrowIcon = container.querySelector(
        "[data-testid='KeyboardArrowRightIcon']"
      );
      expect(rightArrowIcon).toBeInTheDocument();
    });

    it("should display down arrow icon when open", () => {
      const { container } = render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const downArrowIcon = container.querySelector(
        "[data-testid='KeyboardArrowDownIcon']"
      );
      expect(downArrowIcon).toBeInTheDocument();
    });
  });

  describe("Privacy Statement Link", () => {
    it("should render the Privacy Statement link", () => {
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const link = screen.getByRole("link", { name: /Privacy Statement/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", hyperLinks.PRIVACY_LINK);
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("Banner Actions (showBanner=true)", () => {
    it("should render Continue and Exit buttons when showBanner is true and isOpen is true", () => {
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: /Continue/ })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Exit/ })).toBeInTheDocument();
    });

    it("should not render action buttons when showBanner is false", () => {
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={false}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      expect(
        screen.queryByRole("button", { name: /Continue/ })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Exit/ })
      ).not.toBeInTheDocument();
    });

    it("should handle Continue button click", async () => {
      const user = userEvent.setup();
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const continueButton = screen.getByRole("button", { name: /Continue/ });
      await user.click(continueButton);

      expect(mockSetIsPrivacyBannerOpen).toHaveBeenCalledWith(false);
      expect(mockOnAccept).toHaveBeenCalled();
    });

    it("should set localStorage when Continue button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const continueButton = screen.getByRole("button", { name: /Continue/ });
      await user.click(continueButton);

      expect(localStorage.getItem("privacyPopUp")).toBe("accepted");
    });

    it("should handle Exit button click", async () => {
      const user = userEvent.setup();
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const exitButton = screen.getByRole("button", { name: /Exit/ });
      await user.click(exitButton);

      expect(mockSetIsPrivacyBannerOpen).toHaveBeenCalledWith(false);
      expect(mockOnAccept).not.toHaveBeenCalled();
    });

    it("should not set localStorage when Exit button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      const exitButton = screen.getByRole("button", { name: /Exit/ });
      await user.click(exitButton);

      expect(localStorage.getItem("privacyPopUp")).toBeNull();
    });
  });

  describe("Integration tests", () => {
    it("should handle complete user flow: open, accept, and close", async () => {
      const user = userEvent.setup();
      const { container, rerender } = render(
        <PrivacyCard
          isOpen={false}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      // Verify initial closed state
      expect(
        screen.queryByText(/By using this feature/)
      ).not.toBeInTheDocument();

      // Click to expand
      const iconButton = container.querySelector("button");
      await user.click(iconButton!);

      expect(mockSetIsPrivacyBannerOpen).toHaveBeenCalledWith(true);

      // Re-render as open
      rerender(
        <PrivacyCard
          isOpen={true}
          onAccept={mockOnAccept}
          showBanner={true}
          setIsPrivacyBannerOpen={mockSetIsPrivacyBannerOpen}
          onReject={jest.fn()}
        />
      );

      // Verify privacy content is visible
      expect(screen.getByText(/By using this feature/)).toBeInTheDocument();

      // Click Continue
      const continueButton = screen.getByRole("button", { name: /Continue/ });
      await user.click(continueButton);

      expect(mockSetIsPrivacyBannerOpen).toHaveBeenCalledWith(false);
      expect(mockOnAccept).toHaveBeenCalled();
      expect(localStorage.getItem("privacyPopUp")).toBe("accepted");
    });
  });
});
