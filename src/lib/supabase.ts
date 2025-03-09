
import { createClient } from '@supabase/supabase-js';

// These environment variables are automatically injected by the Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';

// Create a mock client for development if variables are missing
const createMockClient = () => {
  console.warn('Using mock Supabase client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for a real connection.');
  
  // Return a mock client with the same interface but no real operations
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: ({ email, password }) => Promise.resolve({ 
        data: { user: { id: 'mock-user-id', email } }, 
        error: null 
      }),
      signInWithPassword: () => Promise.resolve({ 
        data: { user: { id: 'mock-user-id', email: 'mock@example.com' } }, 
        error: null 
      }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback) => {
        // Call callback once with a fake signed-in session
        callback('SIGNED_IN', { user: { id: 'mock-user-id', email: 'mock@example.com' } });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: (table) => {
      // Create a chainable API for mock data operations
      const chainObj = {
        select: () => {
          return {
            eq: () => ({
              single: () => Promise.resolve({ 
                data: { role: 'user', username: 'mock-user' }, 
                error: null 
              })
            }),
            order: () => chainObj,
            data: [],
            error: null
          }
        },
        insert: (data) => {
          // Add chainable select method to insert
          const insertObj = {
            select: () => insertObj,
            single: () => Promise.resolve({ 
              data: { 
                id: 'mock-id-' + Math.random().toString(36).substring(2, 10),
                ...data,
                created_at: new Date().toISOString()
              }, 
              error: null 
            }),
            data: null,
            error: null
          };
          return insertObj;
        },
        update: (data) => {
          return {
            eq: () => Promise.resolve({ 
              data: { id: 'mock-id', ...data }, 
              error: null 
            }),
            data: null,
            error: null
          }
        },
        delete: () => {
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
            data: null,
            error: null
          }
        },
        eq: () => Promise.resolve({ data: [], error: null }),
      };
      
      return chainObj;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  };
};

// Initialize the Supabase client
export const supabase = (!supabaseUrl || !supabaseAnonKey) && isDevelopment
  ? createMockClient() as any
  : createClient(supabaseUrl || '', supabaseAnonKey || '');

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: Error | null) => {
  if (error) {
    console.error('Supabase error:', error);
    return error.message;
  }
  return null;
};

// Define types for our database tables
export type DbTransporter = {
  id: string;
  name: string;
  gstn: string;
  contact_person: string;
  contact_number: string;
  address: string;
  created_at: string;
};

export type DbVehicle = {
  id: string;
  transporter_id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  status: string;
  last_maintenance: string;
  created_at: string;
};

export type DbRoute = {
  id: string;
  source: string;
  destination: string;
  distance_km: number;
  billing_rate_per_ton: number;
  vendor_rate_per_ton: number;
  estimated_time: number;
  created_at: string;
};

export type DbShipment = {
  id: string;
  transporter_id: string;
  vehicle_id: string;
  source: string;
  destination: string;
  quantity_tons: number;
  status: string;
  departure_time: string;
  arrival_time: string | null;
  remarks?: string; // Added this field
  created_at: string;
};
