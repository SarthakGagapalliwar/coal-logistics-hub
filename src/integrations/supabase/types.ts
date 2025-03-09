export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          billing_rate_per_ton: number
          created_at: string
          destination: string
          distance_km: number
          estimated_time: number
          id: string
          source: string
          updated_at: string
          vendor_rate_per_ton: number
        }
        Insert: {
          billing_rate_per_ton: number
          created_at?: string
          destination: string
          distance_km: number
          estimated_time?: number
          id?: string
          source: string
          updated_at?: string
          vendor_rate_per_ton: number
        }
        Update: {
          billing_rate_per_ton?: number
          created_at?: string
          destination?: string
          distance_km?: number
          estimated_time?: number
          id?: string
          source?: string
          updated_at?: string
          vendor_rate_per_ton?: number
        }
        Relationships: []
      }
      shipments: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string
          destination: string
          id: string
          quantity_tons: number
          remarks: string | null
          route_id: string | null
          source: string
          status: string
          transporter_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time: string
          destination: string
          id?: string
          quantity_tons: number
          remarks?: string | null
          route_id?: string | null
          source: string
          status?: string
          transporter_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string
          destination?: string
          id?: string
          quantity_tons?: number
          remarks?: string | null
          route_id?: string | null
          source?: string
          status?: string
          transporter_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          address: string
          contact_number: string
          contact_person: string
          created_at: string
          gstn: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_number: string
          contact_person: string
          created_at?: string
          gstn: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          gstn?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          shipment_updates: boolean
          sms_notifications: boolean
          system_announcements: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          shipment_updates?: boolean
          sms_notifications?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          shipment_updates?: boolean
          sms_notifications?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number
          created_at: string
          id: string
          last_maintenance: string | null
          status: string
          transporter_id: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          status?: string
          transporter_id: string
          updated_at?: string
          vehicle_number: string
          vehicle_type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          status?: string
          transporter_id?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
