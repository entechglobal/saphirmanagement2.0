"use client";

import { Box, Button, Typography, Stack, Divider } from "@mui/material";
import { useNavigate, useRouteError } from "react-router-dom";
import Lottie from "lottie-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import cat404Animation from "@/assets/cat-404.json";

export const ErrorPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation("errorPage");
  const error = useRouteError();
  const is404 = error?.status === 404;
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  const handleRetry = () => {
    window.location.reload();
  };

  if (error?.status === 401 || error?.status === 403) {
    logout();
    navigate("/login");
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 500,
          p: 4,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 12px 40px rgba(0,0,0,0.6)"
              : "0 12px 32px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {true && (
          <Lottie
            animationData={cat404Animation}
            loop
            style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}
          />
        )}

        <Typography
          variant="overline"
          color="text.secondary"
          letterSpacing={1.2}
        >
          {is404 ? t("error404Label") : t("appErrorLabel")}
        </Typography>

        <Typography variant="h5" fontWeight={700} mt={1} mb={1}>
          {is404 ? t("notFoundTitle") : t("genericTitle")}
        </Typography>

        <Typography color="text.secondary" mb={3}>
          {is404 ? t("notFoundMessage") : t("genericMessage")}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button variant="contained" fullWidth onClick={() => navigate("/")}>
            {t("goToDashboard")}
          </Button>

          <Button variant="outlined" fullWidth onClick={handleRetry}>
            {t("retry")}
          </Button>

          <Button variant="outlined" fullWidth onClick={() => navigate(-1)}>
            {t("goBack")}
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={3}
          sx={{ wordBreak: "break-word" }}
        >
          {`${t("time")}: ${timestamp}`}
        </Typography>
      </Box>
    </Box>
  );
};
