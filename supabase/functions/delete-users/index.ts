import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUsersRequest {
  userIds: string[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the caller is a super-admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is super-admin
    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'super-admin')
      .single()

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: 'Only super-admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userIds } = await req.json() as DeleteUsersRequest

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent deleting yourself
    if (userIds.includes(caller.id)) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Deleting ${userIds.length} users:`, userIds)

    const deletedUsers: string[] = []
    const errors: { userId: string; error: string }[] = []

    for (const userId of userIds) {
      try {
        // Delete from user_roles first
        await adminClient.from('user_roles').delete().eq('user_id', userId)
        console.log(`Deleted user_roles for ${userId}`)

        // Delete from organization_members
        await adminClient.from('organization_members').delete().eq('user_id', userId)
        console.log(`Deleted organization_members for ${userId}`)

        // Delete from profiles (will be cascaded but explicit for safety)
        await adminClient.from('profiles').delete().eq('id', userId)
        console.log(`Deleted profile for ${userId}`)

        // Delete from auth.users using admin API
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
        
        if (deleteError) {
          console.error(`Error deleting auth user ${userId}:`, deleteError)
          errors.push({ userId, error: deleteError.message })
        } else {
          console.log(`Successfully deleted auth user ${userId}`)
          deletedUsers.push(userId)
        }
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err)
        errors.push({ userId, error: String(err) })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedUsers, 
        errors,
        message: `Deleted ${deletedUsers.length} users${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-users function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
