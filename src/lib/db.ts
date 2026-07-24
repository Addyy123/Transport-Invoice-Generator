import { supabase } from './supabase';

async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
}

const createSupabaseStore = (tableName: string) => {
  return {
    async getItem<T>(key: string): Promise<T | null> {
      const uid = await getCurrentUserId();
      if (!uid) return null;
      
      const { data, error } = await supabase
        .from(tableName)
        .select('data')
        .eq('id', key)
        .eq('user_id', uid)
        .maybeSingle();
        
      if (error) {
        console.error(`Error fetching ${tableName}[${key}]:`, error);
        return null;
      }
      
      if (!data) return null;
      return data.data as T;
    },
    
    async setItem<T>(key: string, value: T): Promise<T> {
      const uid = await getCurrentUserId();
      if (!uid) throw new Error('You must be logged in to save data.');
      
      const { error } = await supabase
        .from(tableName)
        .upsert({ id: key, user_id: uid, data: value });
        
      if (error) {
        console.error(`Error saving ${tableName}[${key}]:`, error);
        throw error;
      }
      return value;
    },
    
    async removeItem(key: string): Promise<void> {
      const uid = await getCurrentUserId();
      if (!uid) return;
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', key)
        .eq('user_id', uid);
        
      if (error) {
        console.error(`Error deleting ${tableName}[${key}]:`, error);
      }
    },
    
    async keys(): Promise<string[]> {
      const uid = await getCurrentUserId();
      if (!uid) return [];
      
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', uid);
        
      if (error) {
        console.error(`Error fetching keys for ${tableName}:`, error);
        return [];
      }
      
      return data.map((row) => row.id);
    },
    
    async clear(): Promise<void> {
      const uid = await getCurrentUserId();
      if (!uid) return;
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('user_id', uid);
        
      if (error) {
        console.error(`Error clearing ${tableName}:`, error);
      }
    }
  };
};

export const db = {
  company: createSupabaseStore('company'),
  customers: createSupabaseStore('customers'),
  invoices: createSupabaseStore('invoices'),
  settings: createSupabaseStore('settings'),
};
