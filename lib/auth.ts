import { createClientComponentClient } from './supabase'
import { User } from '@supabase/supabase-js'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function signUp(email: string, password: string, username: string) {
  const supabase = createClientComponentClient()
  
  // First, check if username is already taken
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single()
    
  if (existingProfile) {
    throw new Error('Username bereits vergeben')
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      }
    }
  })
  
  if (error) throw error
  
  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        username,
        role: 'user'
      })
      
    if (profileError) throw profileError
  }
  
  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClientComponentClient()
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
