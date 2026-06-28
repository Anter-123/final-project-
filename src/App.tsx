import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AppRoutes } from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <Toaster 
                position="top-right"
                toastOptions={{
                  className: "glass-panel dark:bg-slate-900 border text-foreground text-xs font-semibold",
                  duration: 4000,
                  style: {
                    borderRadius: "12px",
                  }
                }} 
              />
              <AppRoutes />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
