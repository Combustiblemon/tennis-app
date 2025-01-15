import { Outlet } from "react-router";

const AuthLayout = () => {
  return (
    <div
      style={{
        backgroundColor: "darkGreen",
        height: "100%",
      }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
