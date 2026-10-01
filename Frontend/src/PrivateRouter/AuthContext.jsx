/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const defaultAuthValue = {
  user: null,
  userProfile: null,
  setUser: () => {},
  login: () => {},
  logout: () => {},
  loading: false,
  loginOpen: false,
  setLoginOpen: () => {},
  profileName: "Admin",
  role: "admin",
  email: "",
  phone: "",
};

export const AuthContext = createContext(defaultAuthValue);

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthValue;
};

const normalizeRoleValue = (roleValue) => roleValue?.toString().trim();

const normalizeUserProfile = (userData) => {
  if (!userData) return null;

  const userId = userData.user_id || userData.id || userData.uuid || userData.employee_id || userData.employeeId || null;
  const employeeId = userData.employee_id || userData.employeeId || userData.user_id || userData.id || userData.uuid || userId || null;

  return {
    ...userData,
    role: normalizeRoleValue(userData.role),
    user_id: userId,
    id: userData.id || userId,
    employee_id: employeeId,
    employeeId,
    uuid: userData.uuid || userId,
    name: userData.name || userData.full_name || userData.displayName || userData.username || "",
    displayName: userData.displayName || userData.name || userData.full_name || userData.username || "",
    username: userData.username || userData.email || userData.displayName || "",
    email: userData.email || userData.official_email || userData.personal_email || "",
    phone: userData.phone || userData.mobile || userData.mobile_number || "",
  };
};

const clearStoredAuth = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
};

const loadStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!storedUser) return null;
    const parsedUser = JSON.parse(storedUser);
    if (!parsedUser) return null;
    return normalizeUserProfile(parsedUser);
  } catch (error) {
    console.error("Failed to parse stored user", error);
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadStoredUser);
  const [loading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const login = (userData, token, rememberMe = true) => {
    const normalizedUser = normalizeUserProfile(userData);
    setUser(normalizedUser);
    clearStoredAuth();
    const storage = rememberMe ? localStorage : sessionStorage;
    if (normalizedUser) {
      storage.setItem("user", JSON.stringify(normalizedUser));
    }
    if (token) {
      storage.setItem("token", token);
    }
  };

  const logout = () => {
    setUser(null);
    setLoginOpen(false);
    clearStoredAuth();
  };

  // Map user data for Header/Sidebar compatibility
  const userProfile = user;
  const profileName = user?.displayName || user?.name || user?.username || "Admin";
  const role = user?.role || "admin";
  const email = user?.email || "";
  const phone = user?.phone || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        setUser,
        login,
        logout,
        loading,
        loginOpen,
        setLoginOpen,
        profileName,
        role,
        email,
        phone
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};