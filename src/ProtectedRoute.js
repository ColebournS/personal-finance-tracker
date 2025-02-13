import { useAuth } from "./AuthContext";
import Auth from "./Auth";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Auth />;
  }

  return children;
};

export default ProtectedRoute;
