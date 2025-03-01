import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

// Export the useAuth hook separately to fix the fast refresh issue
export const useAuth = () => useContext(AuthContext); 