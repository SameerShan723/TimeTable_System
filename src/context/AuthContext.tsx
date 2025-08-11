"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabaseClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";

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
  refreshUserData: () => Promise<void>;
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
  const router = useRouter();
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
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (!isMounted.current) return;

        // If there's no session, this is a normal unauthenticated state.
        // Avoid noisy "Auth session missing!" logs.
        if (!session) {
          setIsAuthenticated(false);
          setIsSuperadmin(false);
          setCanEdit(false);
          setUser(null);
          // Ensure server components revalidate auth-dependent content
          router.refresh();
          return;
        }

        const authUser = session.user;
        if (authUser) {
          // Get user data directly from user_roles table
          const { data: userRoleData, error: userRoleError } = await supabaseClient
            .from("user_roles")
            .select("id, email, role")
            .eq("id", authUser.id)
            .eq("role", "superadmin")
            .maybeSingle();
          
          if (!isMounted.current) return;

          if (userRoleError) {
            setIsAuthenticated(false);
            setIsSuperadmin(false);
            setCanEdit(false);
            setUser(null);
          } else if (userRoleData) {
            // Set user data from user_roles table
            const userData = {
              id: userRoleData.id,
              email: userRoleData.email || authUser.email || '',
              name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
              avatar_url:
                authUser.user_metadata?.avatar_url ||
                authUser.user_metadata?.profile_picture ||
                authUser.user_metadata?.picture ||
                "",
            };
            setUser(userData);
            setIsAuthenticated(true);
            setIsSuperadmin(true);
            setCanEdit(true);
          } else {
            setIsAuthenticated(false);
            setIsSuperadmin(false);
            setCanEdit(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setIsSuperadmin(false);
          setCanEdit(false);
          setUser(null);
          router.refresh();
        }
      } catch (error) {
        // Ignore expected missing-session errors; log others
        if (
          !(error instanceof Error &&
            (error.name === 'AuthSessionMissingError' ||
              /Auth session missing/i.test(error.message)))
        ) {
        }
        if (!isMounted.current) return;
        setIsAuthenticated(false);
        setIsSuperadmin(false);
        setCanEdit(false);
        setUser(null);
        router.refresh();
      }
    };

    // Initial sync
    syncAuthState();

    // Subscribe to auth state changes for real-time updates
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        
        if (!isMounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          // Get user data directly from user_roles table
          try {
            const { data: userRoleData, error: userRoleError } = await supabaseClient
              .from("user_roles")
              .select("id, email, role")
              .eq("id", session.user.id)
              .eq("role", "superadmin")
              .maybeSingle();
            
            if (!isMounted.current) return;

            if (userRoleError) {
              console.error("Error checking role on auth change:", userRoleError);
              setIsAuthenticated(false);
              setIsSuperadmin(false);
              setCanEdit(false);
              setUser(null);
            } else if (userRoleData) {
              // Set user data from user_roles table
              const userData = {
                id: userRoleData.id,
                email: userRoleData.email || session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url:
                  session.user.user_metadata?.avatar_url ||
                  session.user.user_metadata?.profile_picture ||
                  session.user.user_metadata?.picture ||
                  "",
              };
              setUser(userData);
              setIsAuthenticated(true);
              setIsSuperadmin(true);
              setCanEdit(true);
            } else {
              setIsAuthenticated(false);
              setIsSuperadmin(false);
              setCanEdit(false);
              setUser(null);
            }
          } catch (error) {
            console.error("Error checking role:", error);
            setIsAuthenticated(false);
            setIsSuperadmin(false);
            setCanEdit(false);
            setUser(null);
          }
          // Refresh to ensure server components/middleware see updated cookies
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setIsSuperadmin(false);
          setCanEdit(false);
          setUser(null);
          router.refresh();
        } else if (event === "TOKEN_REFRESHED") {
          // Re-sync on token refresh regardless; session may have changed
          syncAuthState();
          router.refresh();
        }
      }
    );

    // Subscribe to real-time changes in user_roles table
    let profileSubscription: any = null;
    if (user?.id) {
      profileSubscription = supabaseClient
        .channel(`user_roles_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_roles',
            filter: `id=eq.${user.id}`,
          },
          async (payload) => {
            if (!isMounted.current) return;
            
            try {
              // Get updated data directly from user_roles table
              const { data: updatedUserRole, error } = await supabaseClient
                .from("user_roles")
                .select("id, email, role")
                .eq("id", user.id)
                .maybeSingle();
              
              if (error || !updatedUserRole) return;
              
              // Update user data with latest from user_roles
              setUser(prevUser => prevUser ? {
                ...prevUser,
                email: updatedUserRole.email || prevUser.email,
              } : null);
              
            } catch (error) {
              console.error('Error updating user data from user_roles:', error);
            }
          }
        )
      
    }

    return () => {
      isMounted.current = false;
      authListener.subscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, [user?.id]); // Add user.id as dependency to re-subscribe when user changes

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const logout = async () => {
    try {
      // Clear client session first
      await supabaseClient.auth.signOut();
      // Clear server cookies/session
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      // Local state will also be updated by the auth state change listener
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    try {
      if (!user?.id) return;
      
      // Get updated data directly from user_roles table
      const { data: updatedUserRole, error } = await supabaseClient
        .from("user_roles")
        .select("id, email, role")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error || !updatedUserRole) {
        console.error("Error refreshing user data:", error);
        return;
      }
      
      // Update user data with latest from user_roles
      setUser(prevUser => prevUser ? {
        ...prevUser,
        email: updatedUserRole.email || prevUser.email,
      } : null);
      
    } catch (error) {
      console.error('Error refreshing user data:', error);
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
    refreshUserData,
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