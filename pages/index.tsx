import Head from "next/head";
import { Geist } from "next/font/google";
import MainApp from "@/features/MainApp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <>
      <Head>
        <title>Tennis App</title>
        <meta name="description" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={`${geistSans.variable}`}>
        <MainApp />
      </div>
    </>
  );
}
