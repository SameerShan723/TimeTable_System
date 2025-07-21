import { redirect } from "next/navigation";
import SuperadminDetails from "./SuperadminDetails";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SuperadminDetailsPage() {
  const supabase = await createSupabaseServerClient();

  // Check user authentication and superadmin status
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const isAuthenticated = !authError && !!user;
  let isSuperadmin = false;
  let id: string | null = null;
  let email: string | null = null;
  let role: string | null = null;
  let profile_picture: string | null = null;
  let username: string | null = null;
  let error: string | null = null;

  if (isAuthenticated) {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user!.id)
      .eq("role", "superadmin")
      .maybeSingle();

    isSuperadmin = !roleError && !!roleData;
    if (isSuperadmin) {
      id = user!.id;
      email = user!.email || null;
      role = roleData?.role || null;
      profile_picture = user!.user_metadata?.profile_picture || null;
      // Fetch username from user_metadata, format as "Sameer Shah"
      if (user!.user_metadata?.given_name && user!.user_metadata?.family_name) {
        username = `${user!.user_metadata.given_name} ${
          user!.user_metadata.family_name
        }`;
      } else if (user!.user_metadata?.full_name) {
        username = user!.user_metadata.full_name;
      } else if (email) {
        // Format email prefix: e.g., sameershah → Sameer Shah
        const emailPrefix = email.split("@")[0].replace(/\d+$/, "");
        username = emailPrefix
          .split(/[\._]/)
          .map(
            (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join(" ");
      } else {
        username = null;
      }
    } else {
      error = "User is not a superadmin";
    }
  } else {
    error = "User not authenticated";
  }

  if (!isAuthenticated || !isSuperadmin) {
    redirect("/");
  }

  return (
    <SuperadminDetails
      initialUserDetails={{
        id: id || "",
        email: email || "",
        role: role || "",
        profile_picture: profile_picture || "",
        username: username || "",
      }}
      initialError={error}
    />
  );
}
