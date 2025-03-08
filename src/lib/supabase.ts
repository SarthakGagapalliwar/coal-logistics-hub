
import { createClient } from '@supabase/supabase-js';

// These environment variables are automatically injected by the Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
