"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabaseClient } from "@/lib/supabase/supabase";

interface AuthContextType {
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  canEdit: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialAuth: {
    isAuthenticated: boolean;
    isSuperadmin: boolean;
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  initialAuth,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    initialAuth.isAuthenticated
  );
  const [isSuperadmin, setIsSuperadmin] = useState(initialAuth.isSuperadmin);
  const [canEdit, setCanEdit] = useState(initialAuth.isSuperadmin);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Background sync to verify client-side auth state
    const syncAuthState = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (!isMounted.current) return;

        if (user) {
          const { data: roleData, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("id", user.id)
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
        }
      } catch (error) {
        console.error("Error syncing auth state:", error);
        if (!isMounted.current) return;
        setIsAuthenticated(false);
        setIsSuperadmin(false);
        setCanEdit(false);
      }
    };

    syncAuthState();

    // Subscribe to auth state changes for real-time updates
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          setIsAuthenticated(true);
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

  const value: AuthContextType = {
    isAuthenticated,
    isSuperadmin,
    canEdit,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
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
