import Head from "next/head";
import { Geist } from "next/font/google";
import { BrowserRouter, Route, Routes } from "react-router";
import { useRouter } from "next/router";
import AuthLayout from "@/features/Auth/AuthLayout/AuthLayout";
import Login from "@/features/Auth/Login/Login";
import Welcome from "@/features/Auth/Welcome/Welcome";
import Register from "@/features/Auth/Register/Register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();
  // const navigate = useNavigate();
  console.log("router", router.asPath);

  return (
    <>
      <Head>
        <title>Tennis App</title>
        <meta name="description" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={`${geistSans.variable}`}>
        <BrowserRouter>
          <Routes>
            {/* This route is responsive for the public Auth pages Welcome - Login - Register */}

            <Route path="/" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />

              <Route path="register" element={<Register />} />

              <Route
                index // <-- "/"
                element={<Welcome />}
              />
            </Route>

            {/* The Route below is responsible for The Rest of the App it self */}

            {/* <Route path="/" element={<AppLayout />}>
              <Route path="dashboard" element={<HomeScreen />} />

              <Route path="register" element={<Register />} />

              <Route
                index // <-- "/"
                element={<Welcome />}
              />
            </Route> */}
          </Routes>
        </BrowserRouter>
      </main>
    </>
  );
}
