import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./store.ts";
import { createBrowserRouter, redirect, RouterProvider } from "react-router";
import Editor from "./features/editor/Editor.tsx";
import ApiAuth from "./features/api-auth/ApiAuth.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { ThemeProvider } from "./context/index.ts";
import { Toaster } from "./components/ui/toast.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: Editor },
      { path: "new", Component: Editor },
      { path: "edit/:id", Component: Editor },
    ],
    loader: () => {
      const apiKey = localStorage.getItem(
        import.meta.env.VITE_API_STORAGE_KEY ?? "blog-studio-apikey",
      );

      if (!apiKey) throw redirect("/authorize");
    },
  },
  { path: "authorize", Component: ApiAuth },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
