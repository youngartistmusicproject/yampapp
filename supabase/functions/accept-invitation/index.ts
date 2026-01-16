import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptRequest {
  token: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { token, password, first_name, last_name }: AcceptRequest = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the invitation
    const { data: invitation, error: findError } = await adminClient
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .maybeSingle();

    if (findError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use name from invitation or request
    const finalFirstName = first_name || invitation.first_name || invitation.email.split('@')[0];
    const finalLastName = last_name || invitation.last_name || null;

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let userId: string;
    let isNewUser = false;
    
    const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);
    
    if (existingUser) {
      userId = existingUser.id;
      
      // Check if already in this organization
      const { data: existingMember } = await adminClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', invitation.organization_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingMember) {
        // Mark invitation as accepted
        await adminClient
          .from('invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        return new Response(
          JSON.stringify({ error: 'You are already a member of this organization' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { first_name: finalFirstName, last_name: finalLastName },
      });

      if (createError) {
        console.error('Failed to create user:', createError);
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

      userId = newUser.user.id;
      isNewUser = true;

      // Assign global role
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: userId, role: invitation.role });

      if (roleError) {
        console.error('Failed to assign role:', roleError);
      }
    }

    // Add to organization
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
      });

    if (memberError) {
      console.error('Failed to add org member:', memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to add you to the organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile primary_organization_id if not set or if new user
    if (isNewUser) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ primary_organization_id: invitation.organization_id })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }
    }

    // Mark invitation as accepted
    await adminClient
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Get organization name
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewUser 
          ? `Welcome! Your account has been created and you've been added to ${org?.name || 'the organization'}.`
          : `You've been added to ${org?.name || 'the organization'}.`,
        is_new_user: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in accept-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
