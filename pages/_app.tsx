import { AppProps } from "next/app";
import { useEffect, useState } from "react";

const App = ({ Component, pageProps }: AppProps) => {
  const [render, setRender] = useState(false);

  useEffect(() => setRender(true), []);
  return render ? <Component {...pageProps} /> : null;
};
export default App;
