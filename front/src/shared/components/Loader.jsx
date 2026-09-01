import { CircularProgress, Box } from "@mui/material";

export const Loader = ({ height = "60vh" }) => (
  <Box
    sx={{
      height,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <CircularProgress size={50} />
  </Box>
);
