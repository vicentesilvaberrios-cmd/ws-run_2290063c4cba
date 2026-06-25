'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server Action: Register a new business owner.
 * Creates the auth user with business_name in metadata; the DB trigger
 * handle_new_user creates the organization + admin membership.
 */
export async function register(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const businessName = String(formData.get('business_name') || '').trim();

  if (!email || !password || !businessName) {
    return { error: 'Todos los campos son obligatorios' };
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, the trigger has already fired.
  // If enabled, the user needs to confirm first.
  redirect('/login');
}

/**
 * Server Action: Login with email + password.
 */
export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

/**
 * Server Action: Logout the current user.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
