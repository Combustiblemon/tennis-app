/* eslint-disable @typescript-eslint/no-unused-vars */
import "../styles/globals.css";
import { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { resolver, theme } from "@/styles/theming";
import { Manrope } from "next/font/google";

const handleGlobalError = (errorMessage: string, queryKey: string = "") => {
  // switch (errorMessage) {
  //   case GLOBAL_ERRORS.UNAUTHORIZED:
  //     showToast(GLOBAL_ERRORS.UNAUTHORIZED, queryKey);
  //     router.push(PUBLIC_ROUTES.LOGIN);
  //     break;
  //   case GLOBAL_ERRORS.SERVER_ERROR:
  //     showToast(GLOBAL_ERRORS.SERVER_ERROR, queryKey);
  //     // router.push(PUBLIC_ROUTES.LOGIN);
  //     break;
  //   case GLOBAL_ERRORS.ZOD_ERROR:
  //     showToast(GLOBAL_ERRORS.ZOD_ERROR, queryKey);
  //     break;
  //   default:
  console.log("error");
  // redirect to an error page or something
  // router.push(PUBLIC_ROUTES.LOGIN);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.log("query cache error", error);

      if (error.message) {
        handleGlobalError(error.message, query.queryKey.toString());
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _, __, mutation) => {
      if (error.message) {
        handleGlobalError(error.message);
      }
    },
  }),
});

const manrope = Manrope({
  subsets: ["latin"],
  preload: true,
});

const App = ({ Component, pageProps }: AppProps) => {
  const [render, setRender] = useState(true);

  // it will be used to initialize the language
  useEffect(() => setRender(false), []);

  return (
    <MantineProvider
      theme={{
        ...theme,
        fontFamily: manrope.style.fontFamily,
      }}
      cssVariablesResolver={resolver}
    >
      {render ? null : (
        <main className={manrope.className}>
          <Notifications position="top-center" autoClose={10000} />

          <QueryClientProvider client={queryClient}>
            <ReactQueryDevtools initialIsOpen={false} />

            <Component {...pageProps} />
          </QueryClientProvider>
        </main>
      )}
    </MantineProvider>
  );
};
export default App;
