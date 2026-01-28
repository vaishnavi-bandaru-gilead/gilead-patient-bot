import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { textConstants } from "../constants";

const SessionTimeOutModal = ({
  onContinue,
  remainingSeconds,
}: {
  onContinue: () => void;
  remainingSeconds: any;
}) => {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="rgba(0,0,0,0.4)"
      zIndex={1300}
    >
      <Box
        bgcolor="white"
        p={3}
        borderRadius={2}
        minWidth={320}
        textAlign="center"
        boxShadow={6}
      >
        <Typography
          mb={2}
          fontSize={17}
          color="textPrimary"
          fontFamily="Open Sans, sans-serif"
        >
          {textConstants.TIMEOUT_TEXT.replace(
            "--:--",
            String(remainingSeconds)
          )}
        </Typography>
        <Button
          variant="outlined"
          sx={{
            borderRadius: 4,
            color: "black",
            "&:hover": {
              borderColor: "black",
            },
            "&:focus": {
              outline: "none",
            },
          }}
          onClick={onContinue}
        >
          Continue Session
        </Button>
      </Box>
    </Box>
  );
};

export default SessionTimeOutModal;
