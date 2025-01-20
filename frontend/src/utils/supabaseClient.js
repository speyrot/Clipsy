// frontend/src/utils/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Debug: Check if environment variables are loaded correctly
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseAnonKey,
        url: supabaseUrl
    });
    throw new Error('Missing Supabase configuration');
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the configuration
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Supabase auth event:', event);
});