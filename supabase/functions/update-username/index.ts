import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can change usernames" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, new_username } = await req.json();

    if (!user_id || !new_username) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or new_username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate username
    const trimmedUsername = new_username.trim();
    if (trimmedUsername.length < 1 || trimmedUsername.length > 50) {
      return new Response(
        JSON.stringify({ error: "Username must be between 1 and 50 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if username is already taken by another user
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", trimmedUsername)
      .neq("user_id", user_id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "اسم المستخدم مستخدم بالفعل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Updating username for user:", user_id, "to:", trimmedUsername);

    // Generate new email from username
    const newEmail = `${trimmedUsername.toLowerCase()}@restaurant.local`;

    // Check if email is already taken
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailTaken = existingUsers?.users?.some(
      u => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user_id
    );

    if (emailTaken) {
      return new Response(
        JSON.stringify({ error: "اسم المستخدم مستخدم بالفعل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email in auth.users
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: newEmail }
    );

    if (updateAuthError) {
      console.error("Auth email update error:", updateAuthError);
      return new Response(
        JSON.stringify({ error: updateAuthError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update username in profiles table
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ username: trimmedUsername })
      .eq("user_id", user_id);

    if (updateProfileError) {
      console.error("Profile update error:", updateProfileError);
      // Try to rollback auth email change
      return new Response(
        JSON.stringify({ error: updateProfileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Username updated successfully for user:", user_id);

    return new Response(
      JSON.stringify({ success: true, new_email: newEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
