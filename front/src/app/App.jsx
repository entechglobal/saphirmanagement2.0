import { RouterProvider } from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { MuiProvider } from "./providers/MuiProvider";
import { router } from "./router";
import { AuthInitializer } from "../features/auth/components/AuthInitializer";
import { AppToaster } from "../shared/components/AppToaster";
import { PdfPreviewHost } from "../shared/components/PdfPreviewHost";

function App() {
  return (
    <ThemeProvider>
      <MuiProvider>
        <QueryProvider>
          <AuthInitializer>
            <RouterProvider router={router} />
          </AuthInitializer>
          <AppToaster />
          <PdfPreviewHost />
        </QueryProvider>
      </MuiProvider>
    </ThemeProvider>
  );
}

export default App;
