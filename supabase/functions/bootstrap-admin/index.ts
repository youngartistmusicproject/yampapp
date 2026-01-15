import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BootstrapRequest {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
}

// Simple in-memory rate limiting (resets on function restart)
// For production, consider using a database or external cache
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIP(req: Request): string {
  // Try various headers for client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  // Fallback to a generic identifier
  return 'unknown-client';
}

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  // Clean up expired records
  if (record && now > record.resetTime) {
    rateLimitMap.delete(clientIP);
  }
  
  const currentRecord = rateLimitMap.get(clientIP);
  
  if (!currentRecord) {
    // First attempt
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (currentRecord.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((currentRecord.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  
  // Increment count
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

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if any super-admin exists
    const { data: existingAdmins, error: checkError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('role', 'super-admin')
      .limit(1);

    if (checkError) {
      // Return generic error to avoid information disclosure
      return new Response(
        JSON.stringify({ error: 'Setup is not available at this time' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      // Return generic error - don't reveal that admin exists
      return new Response(
        JSON.stringify({ error: 'Setup is not available. Please contact your administrator.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, first_name, last_name }: BootstrapRequest = await req.json();

    if (!email || !password || !first_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, first_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the first super-admin user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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

    // Assign super-admin role
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'super-admin' });

    if (roleInsertError) {
      console.error('Failed to assign role:', roleInsertError);
      return new Response(
        JSON.stringify({ error: 'User created but failed to assign super-admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Super-admin account created successfully! You can now log in.',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          first_name,
          last_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in bootstrap-admin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
