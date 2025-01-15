import { Outlet } from "react-router";

const AuthLayout = () => {
  return (
    <div /* your crazy layout styling */>
      <h1>This is the Guest Layout Page</h1>

      <Outlet />
    </div>
  );
};

export default AuthLayout;
