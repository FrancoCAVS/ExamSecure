import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// CORRECCIÓN 1: La función ahora es 'async' para poder usar 'await' adentro.
export async function createSupabaseServerClient() {
  // CORRECCIÓN 2: Se añade 'await' para esperar la promesa de las cookies.
  // Esta es la causa principal de los errores que has estado viendo.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getUser() {
  // CORRECCIÓN 3: Se añade 'await' aquí porque createSupabaseServerClient ahora es asíncrona.
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user from Supabase (server):", error.message);
    return null;
  }
  return user;
}

export async function getUserProfile(userId: string) {
  // CORRECCIÓN 3: Se añade 'await' también aquí.
  const supabase = await createSupabaseServerClient();
  // Fetch all columns to be resilient to schema changes
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*') // Changed from specific columns to '*'
    .eq('id', userId)
    .single();

  if (error) {
    // Log the specific error if the query fails
    console.error(`Error fetching profile for user ${userId}:`, error.message);
    return null;
  }
  // profile might be null if no row matches userId, which is a valid case.
  return profile;
}