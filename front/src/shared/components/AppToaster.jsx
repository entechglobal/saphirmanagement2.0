import { Toaster } from "sonner";
import { useTheme } from "@/app/providers/ThemeProvider";

export const AppToaster = () => {
  const { isDark } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      theme={isDark ? "dark" : "light"}
      richColors
      closeButton
      duration={3500}
      visibleToasts={4}
      expand={false}
      gap={10}
      offset={{ bottom: "1.25rem", right: "1.25rem" }}
      mobileOffset={{ bottom: "5rem", right: "0.75rem", left: "0.75rem" }}
      toastOptions={{
        classNames: {
          toast: "saphir-toast",
          title: "saphir-toast-title",
          description: "saphir-toast-description",
          closeButton: "saphir-toast-close",
        },
      }}
    />
  );
};
