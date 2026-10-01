import { configureStore } from "@reduxjs/toolkit";
import { articlesApi } from "./api/articlesApi";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
  reducer: {
    [articlesApi.reducerPath]: articlesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(articlesApi.middleware),
});

setupListeners(store.dispatch);
