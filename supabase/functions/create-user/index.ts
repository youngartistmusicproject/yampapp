import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  role: 'super-admin' | 'admin' | 'staff' | 'faculty';
  organization_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to verify permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, first_name, last_name, role, organization_id }: CreateUserRequest = await req.json();

    if (!email || !password || !first_name || !role || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, first_name, role, organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if calling user is super-admin (platform level) or org admin
    const { data: callerRoles, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    if (roleError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = callerRoles?.some((r) => r.role === 'super-admin');

    // If not a super-admin, check if they're an org admin for the target organization
    if (!isSuperAdmin) {
      const { data: orgMembership, error: orgError } = await userClient
        .from('organization_members')
        .select('role')
        .eq('user_id', callingUser.id)
        .eq('organization_id', organization_id)
        .single();

      if (orgError || !orgMembership) {
        return new Response(
          JSON.stringify({ error: 'You are not a member of this organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isOrgAdmin = orgMembership.role === 'super-admin' || orgMembership.role === 'admin';
      if (!isOrgAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only organization admins can create users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Org admins cannot create super-admins
      if (role === 'super-admin') {
        return new Response(
          JSON.stringify({ error: 'Only platform super-admins can create super-admin users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create admin client with service role to create user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create the user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: { first_name, last_name },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign the global role (for backward compatibility)
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    if (roleInsertError) {
      console.error('Failed to assign global role:', roleInsertError);
    }

    // Add user to organization with role
    const { error: orgMemberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id,
        user_id: newUser.user.id,
        role,
      });

    if (orgMemberError) {
      console.error('Failed to add user to organization:', orgMemberError);
    }

    // Set primary organization on profile
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ primary_organization_id: organization_id })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Failed to set primary organization:', profileUpdateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          first_name,
          last_name,
          role,
          organization_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
