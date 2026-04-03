import { supabase } from '@/lib/supabase';

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (updates) => {
  const { data, error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw error;
  return data.user;
};

export const setPremiumStatus = async (isPremium) => {
  return updateUserProfile({ is_premium: isPremium });
};


