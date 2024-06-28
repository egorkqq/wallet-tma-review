import { configureStore } from "@reduxjs/toolkit";
import pageReducer from "../features/page/pageSlice";
import tonReducer from "../features/ton/tonSlice";
import mainButtonReducer from "../features/tma/mainButtonSlice";
import backButtonReducer from "../features/tma/backButtonSlice";
import tmaReducer from "../features/tma/tmaSlice";
import gamingSlice from "../features/gaming/gamingSlice";
import { gamingApi } from "../features/gaming/gamingApi";
import authSlice from "../features/auth/authSlice";
import { authApi } from "../features/auth/authApi";

export const store = configureStore({
  reducer: {
    page: pageReducer,
    btn: mainButtonReducer,
    backBtn: backButtonReducer,
    tma: tmaReducer,
    ton: tonReducer,
    gaming: gamingSlice,
    auth: authSlice,
    [gamingApi.reducerPath]: gamingApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, gamingApi.middleware),
});

export const storeDispatch = store.dispatch;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
