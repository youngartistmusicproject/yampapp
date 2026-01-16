import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: string;
  organization_id: string;
  first_name?: string;
  last_name?: string;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is authenticated and authorized
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, role, organization_id, first_name, last_name }: InvitationRequest = await req.json();

    if (!email || !role || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, role, organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is org admin or super-admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: isSuperAdmin } = await adminClient.rpc('is_super_admin', { _user_id: user.id });
    const { data: isOrgAdmin } = await adminClient.rpc('is_org_admin', { 
      _user_id: user.id, 
      _org_id: organization_id 
    });

    if (!isSuperAdmin && !isOrgAdmin) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to send invitations for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent non-super-admins from creating super-admin invitations
    if (role === 'super-admin' && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super-admins can invite super-admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      // Check if already a member of this org
      const { data: existingMember } = await adminClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'User is already a member of this organization' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await adminClient
      .from('invitations')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An invitation has already been sent to this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invitation token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { data: invitation, error: inviteError } = await adminClient
      .from('invitations')
      .insert({
        organization_id,
        email,
        role,
        token,
        invited_by: user.id,
        first_name: first_name || null,
        last_name: last_name || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization name for the email
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    // Get inviter name
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile 
      ? `${inviterProfile.first_name}${inviterProfile.last_name ? ' ' + inviterProfile.last_name : ''}`
      : 'Someone';

    // For now, return the invitation link (email sending would require Resend API key)
    // The frontend will display this link to the admin
    const inviteLink = `${req.headers.get('origin') || supabaseUrl.replace('supabase.co', 'lovable.app')}/accept-invitation?token=${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email,
          role,
          expires_at: expiresAt.toISOString(),
          invite_link: inviteLink,
        },
        message: `Invitation created for ${email}. Share the invitation link with them.`,
        organization_name: org?.name,
        invited_by: inviterName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
