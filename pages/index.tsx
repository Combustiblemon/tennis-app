import Head from "next/head";
import { Geist } from "next/font/google";
import { BrowserRouter, Route, Routes } from "react-router";
import { useRouter } from "next/router";
import AuthLayout from "@/features/Auth/AuthLayout/AuthLayout";
import Login from "@/features/Auth/Login/Login";
import Welcome from "@/features/Auth/Welcome/Welcome";
import Register from "@/features/Auth/Register/Register";
import AppLayout from "@/features/Application/AppLayout/AppLayout";
import HomeScreen from "@/features/Application/MainMenu/HomeScreen/HomeScreen";
import MyBookings from "@/features/Application/MainMenu/MyBookings/MyBookings";
import MakeABooking from "@/features/Application/MainMenu/MakeABooking/MakeABooking";
import Notifications from "@/features/Application/Notifications/Notifications";
import FindAnOpponent from "@/features/Application/MainMenu/FindAnOpponent/FindAnOpponent";
import MyAccount from "@/features/Application/MainMenu/MyAccount/MyAccount";

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

      <main
        className={`${geistSans.variable}`}
        style={{
          maxWidth: "600px",
          width: "100%",
          height: "100dvh",
          border: "1px solid red",
        }}
      >
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
            <Route path="/dashboard" element={<AppLayout />}>
              <Route
                path="/dashboard/notifications"
                element={<Notifications />}
              />

              <Route path="/dashboard/my-bookings" element={<MyBookings />} />

              <Route
                path="/dashboard/make-booking"
                element={<MakeABooking />}
              />

              <Route
                path="/dashboard/find-opponent"
                element={<FindAnOpponent />}
              />

              <Route path="/dashboard/account" element={<MyAccount />} />

              <Route
                index // <-- "/dashboard"
                element={<HomeScreen />}
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </main>
    </>
  );
}
