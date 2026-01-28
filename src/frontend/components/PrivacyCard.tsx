import { hyperLinks, textConstants } from "../constants";
import Box from "@mui/material/Box";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import "../theme.css";

const PrivacyCard = ({
  isOpen = false,
  showBanner,
  onAccept,
  setIsPrivacyBannerOpen,
  onReject
}: {
  isOpen: boolean;
  onAccept: any;
  showBanner: boolean;
  setIsPrivacyBannerOpen: any;
  onReject?: any;
}) => {
  const Icon = isOpen ? KeyboardArrowDownIcon : KeyboardArrowRightIcon;

  const handleAcceptPrivacy = () => {
    setIsPrivacyBannerOpen(false);
    localStorage.setItem("privacyPopUp", "accepted");
    onAccept();
  };

  const renderWithLink = (text: string, linkText: string) => {
    return text.split(linkText).map((part, index, arr) => (
      <span key={`${linkText}-${index}`}>
        {part}
        {index < arr.length - 1 && (
          <Link href={hyperLinks.PRIVACY_LINK} target="_blank">
            {linkText}
          </Link>
        )}
      </span>
    ));
  };

  return (
    <>
      <Box flexDirection="column" bgcolor={"white"}>
        <Box
          display="flex"
          alignItems="center"
          sx={{
            background: "#C5203F",
            fontSize: 17,
            fontFamily: "Open Sans, sans-serif",
          }}
        >
          <IconButton
            onClick={() => setIsPrivacyBannerOpen(!isOpen)}
            sx={{
              color: "white",
              "&.Mui-focusVisible": {
                outline: "none",
                backgroundColor: "transparent",
              },
              "&:focus": {
                outline: "none",
              },
            }}
          >
            <Icon fontSize="medium" />
          </IconButton>
          Privacy Statement
        </Box>
        {isOpen && (
          <Box
            padding={"25px"}
            color={"#181818"}
            bgcolor={"white"}
            textAlign={"justify"}
          >
            <Typography
              sx={{ fontSize: 17, fontFamily: "Open Sans, sans-serif" }}
            >
              {renderWithLink(textConstants.PRIVACY_TEXT, "Privacy Statement")}
            </Typography>
            <Typography
              variant="caption"
              textAlign="right"
              display="block"
              paddingTop="20px"
              paddingBottom="20px"
            >
              {textConstants.PRIVACY_FOOTER}
            </Typography>
            {showBanner && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={2}
                paddingTop={"10px"}
              >
                <Button
                  variant="contained"
                  sx={{ borderRadius: 4, bgcolor: "var(--gilead-primary)" }}
                  onClick={handleAcceptPrivacy}
                >
                  Continue
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderRadius: 4,
                    color: "black",
                    borderColor: "black",
                    "&:hover": {
                      borderColor: "black",
                    },
                    "&:focus": {
                      outline: "none",
                    },
                  }}
                  onClick={() => {setIsPrivacyBannerOpen(false); onReject()}}
                >
                  Exit
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  );
};
export default PrivacyCard;
