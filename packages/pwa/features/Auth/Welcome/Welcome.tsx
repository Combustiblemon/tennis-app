import { useNavigate } from "react-router";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div>
      {" "}
      <ol>
        <li onClick={() => navigate("/login")}>Login</li>

        <li onClick={() => navigate("/register")}>Register</li>

        <li onClick={() => navigate("/Welcome")}>Welcome</li>
      </ol>
    </div>
  );
};

export default Welcome;
