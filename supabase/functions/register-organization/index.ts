import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  org_name: string;
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown-client';
}

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (record && now > record.resetTime) {
    rateLimitMap.delete(clientIP);
  }
  
  const currentRecord = rateLimitMap.get(clientIP);
  
  if (!currentRecord) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (currentRecord.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((currentRecord.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  
  currentRecord.count++;
  return { allowed: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds || 3600)
          } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    const { org_name, email, password, first_name, last_name }: RegisterRequest = await req.json();

    // Validation
    if (!org_name || !email || !password || !first_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: org_name, email, password, first_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug and check uniqueness
    let slug = generateSlug(org_name);
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingOrg) {
      // Add random suffix if slug exists
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // 1. Create the user
    const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (createUserError) {
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create the organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: org_name,
        slug,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Failed to create organization:', orgError);
      // Cleanup: delete the user we just created
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create organization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Assign admin role globally
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' });

    if (roleError) {
      console.error('Failed to assign role:', roleError);
    }

    // 4. Add user as organization admin
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: newUser.user.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Failed to add org member:', memberError);
    }

    // 5. Set primary organization on profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ primary_organization_id: org.id })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Organization and admin account created successfully! You can now log in.',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          first_name,
          last_name,
        },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in register-organization function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
