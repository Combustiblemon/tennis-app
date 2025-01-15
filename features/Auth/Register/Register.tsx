import { useNavigate } from "react-router";

const Register = () => {
  const navigate = useNavigate();

  return (
    <div>
      <ol>
        <li onClick={() => navigate("/")}>Back to home - Welcome</li>

        <li onClick={() => navigate("/login")}>
          already have an account LOGIN !!
        </li>
      </ol>
    </div>
  );
};

export default Register;
