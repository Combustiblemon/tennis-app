import { Outlet } from "react-router";

const AppLayout = () => {
  return (
    <div
      style={{
        backgroundColor: "darkblue",
        height: "100%",
      }}
    >
      <Outlet />
    </div>
  );
};

export default AppLayout;
