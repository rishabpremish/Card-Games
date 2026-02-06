import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface User {
  userId: Id<"users">;
  username: string;
  wallet: number;
  settings: any;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateSettings: (
    settings: any,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const registerMutation = useMutation(api.auth.register);
  const loginMutation = useMutation(api.auth.login);
  const getCurrentUserQuery = useQuery(
    api.auth.getCurrentUser,
    user ? { userId: user.userId } : "skip",
  );
  const updateSettingsMutation = useMutation(api.auth.updateSettings);

  const applyTheme = (themeName: string | undefined) => {
    const classes = document.body.className
      .split(" ")
      .filter((c) => !c.startsWith("theme-"));
    document.body.className = classes.join(" ");

    if (themeName && themeName !== "default") {
      document.body.classList.add(`theme-${themeName}`);
    }
  };

  const toggleBodyClass = (
    className: string,
    shouldAdd: boolean | undefined,
  ) => {
    if (shouldAdd) document.body.classList.add(className);
    else document.body.classList.remove(className);
  };

  // Track whether we need to validate a restored session against Convex
  const [pendingValidation, setPendingValidation] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("convex_user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setPendingValidation(true); // need Convex to confirm user still exists
      } catch (e) {
        localStorage.removeItem("convex_user");
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("convex_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("convex_user");
    }
  }, [user]);

  // Sync with Convex query — if the user was deleted from the DB,
  // getCurrentUserQuery will return null and we must log out.
  useEffect(() => {
    if (getCurrentUserQuery === undefined) {
      // Query still loading, do nothing
      return;
    }
    if (getCurrentUserQuery === null) {
      // User no longer exists in DB — force logout
      setUser(null);
      localStorage.removeItem("convex_user");
    } else {
      setUser(getCurrentUserQuery as User);
    }
    setPendingValidation(false);
  }, [getCurrentUserQuery]);

  // Apply theme and visual toggles whenever user settings change
  useEffect(() => {
    if (user?.settings) {
      applyTheme(user.settings.theme);
      toggleBodyClass("no-scanlines", user.settings.scanlines === false);
      toggleBodyClass("no-vignette", user.settings.vignette === false);
      toggleBodyClass("no-bg-animation", user.settings.bgAnimation === false);
      toggleBodyClass("high-contrast", user.settings.highContrast === true);
      toggleBodyClass("reduce-motion", user.settings.reduceMotion === true);
    }
  }, [user?.settings]);

  const register = async (username: string, password: string) => {
    try {
      const result = await registerMutation({ username, password });
      const fullUser = {
        ...result,
        settings: {},
        isAdmin: false,
      };
      setUser(fullUser as User);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const result = await loginMutation({ username, password });
      setUser(result as User);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("convex_user");
  };

  const updateSettings = async (settings: any) => {
    if (!user) return { success: false, error: "Not logged in" };

    try {
      await updateSettingsMutation({
        userId: user.userId,
        settings,
      });
      setUser({
        ...user,
        settings: { ...user.settings, ...settings },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !pendingValidation,
        isLoading: isLoading || pendingValidation,
        register,
        login,
        logout,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
