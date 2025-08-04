"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabaseClient } from "@/lib/supabase/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  // Add other user fields as needed
}

interface AuthContextType {
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  canEdit: boolean;
  user: User | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialAuth: {
    isAuthenticated: boolean;
    isSuperadmin: boolean;
    user?: User | null;
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialAuth,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated);
  const [isSuperadmin, setIsSuperadmin] = useState(initialAuth.isSuperadmin);
  const [canEdit, setCanEdit] = useState(initialAuth.isSuperadmin);
  const [user, setUser] = useState<User | null>(initialAuth.user || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Background sync to verify client-side auth state
    const syncAuthState = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabaseClient.auth.getUser();
        if (!isMounted.current) return;

        if (authUser) {
          // Set user data directly from auth response
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
            avatar_url:
              authUser.user_metadata?.avatar_url ||
              authUser.user_metadata?.profile_picture ||
              authUser.user_metadata?.picture ||
              "",
          });

          // Check role from user_roles
          const { data: roleData, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("id", authUser.id)
            .eq("role", "superadmin")
            .maybeSingle();
          if (!isMounted.current) return;

          if (roleError) {
            console.error("Error fetching user role:", roleError.message);
            setIsSuperadmin(false);
            setCanEdit(false);
          } else {
            setIsSuperadmin(!!roleData);
            setCanEdit(!!roleData);
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
          setIsSuperadmin(false);
          setCanEdit(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Error syncing auth state:", error);
        if (!isMounted.current) return;
        setIsAuthenticated(false);
        setIsSuperadmin(false);
        setCanEdit(false);
        setUser(null);
      }
    };

    syncAuthState();

    // Subscribe to auth state changes for real-time updates
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          setIsAuthenticated(true);

          // Set user data directly from session
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            avatar_url:
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.profile_picture ||
              session.user.user_metadata?.picture ||
              "",
          });

          // Check role from user_roles
          const { data: roleData, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("id", session.user.id)
            .eq("role", "superadmin")
            .maybeSingle();
          if (!isMounted.current) return;

          if (!roleError && roleData) {
            setIsSuperadmin(true);
            setCanEdit(true);
          } else {
            setIsSuperadmin(false);
            setCanEdit(false);
          }
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setIsSuperadmin(false);
          setCanEdit(false);
          setUser(null);
        }
      }
    );

    return () => {
      isMounted.current = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const logout = async () => {
    try {
      await supabaseClient.auth.signOut();
      // State will be updated by the auth state change listener
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isSuperadmin,
    canEdit,
    user,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};