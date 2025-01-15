import { useNavigate } from "react-router";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div>
      <ol>
        <li onClick={() => navigate("/")}>Back to home - Welcome</li>

        <li onClick={() => navigate("/register")}>
          Do not have an account Register !!
        </li>

        <li onClick={() => navigate("/dashboard")}>LOGIN!!!!!!</li>
      </ol>
    </div>
  );
};

export default Login;
