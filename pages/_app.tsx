import "../styles/globals.css";
import { AppProps } from "next/app";
import { useEffect, useState } from "react";
// import { BrowserRouter, Routes, Route } from "react-router";

const App = ({ Component, pageProps }: AppProps) => {
  const [render, setRender] = useState(false);

  // const ReactAppComponent = (
  //   <BrowserRouter>
  //     <Routes>
  //       <Route
  //         path="/"
  //         element={
  //           <div
  //             style={{
  //               width: "500px",
  //               height: "500px",
  //               backgroundColor: "red",
  //             }}
  //           >
  //             This is the Home component
  //           </div>
  //         }
  //       />
  //       <Route
  //         path="/about"
  //         element={
  //           <div
  //             style={{
  //               width: "500px",
  //               height: "500px",
  //               backgroundColor: "green",
  //             }}
  //           >
  //             This is the About component
  //           </div>
  //         }
  //       />
  //     </Routes>

  //     <Component {...pageProps} />
  //   </BrowserRouter>
  // );

  useEffect(() => setRender(true), []);
  return render ? <Component {...pageProps} /> : null;
};
export default App;
