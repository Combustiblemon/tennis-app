import { Outlet } from "react-router";

const AppLayout = () => {
  return (
    <div /* your crazy layout styling */>
      <h1>This is the APPP Layout </h1>

      <Outlet />
    </div>
  );
};

export default AppLayout;
