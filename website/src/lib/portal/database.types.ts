export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          profile_id: string | null
          service_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          profile_id?: string | null
          service_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          profile_id?: string | null
          service_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_changes: {
        Row: {
          added: Json
          authorized_via: string | null
          change_reason: string | null
          changed_by: string
          changed_by_email: string | null
          changed_via: string
          client_notified_at: string | null
          created_at: string
          id: string
          profile_id: string
          removed: Json
        }
        Insert: {
          added?: Json
          authorized_via?: string | null
          change_reason?: string | null
          changed_by: string
          changed_by_email?: string | null
          changed_via: string
          client_notified_at?: string | null
          created_at?: string
          id?: string
          profile_id: string
          removed?: Json
        }
        Update: {
          added?: Json
          authorized_via?: string | null
          change_reason?: string | null
          changed_by?: string
          changed_by_email?: string | null
          changed_via?: string
          client_notified_at?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          removed?: Json
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_changes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_contacts: {
        Row: {
          created_at: string
          id: string
          label: string
          passcode: string | null
          phone: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          passcode?: string | null
          phone: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          passcode?: string | null
          phone?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_backup_interest: {
        Row: {
          consent_version: string
          consented_at: string
          email: string
          profile_id: string
        }
        Insert: {
          consent_version?: string
          consented_at?: string
          email: string
          profile_id: string
        }
        Update: {
          consent_version?: string
          consented_at?: string
          email?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_backup_interest_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          category: string
          created_at: string
          expiry_alerted_at: string | null
          id: string
          installed_on: string
          label: string
          lifetime_years: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry_alerted_at?: string | null
          id?: string
          installed_on: string
          label: string
          lifetime_years: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_alerted_at?: string | null
          id?: string
          installed_on?: string
          label?: string
          lifetime_years?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          profile_id: string
          target_email: string | null
          token_hash: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          profile_id: string
          target_email?: string | null
          token_hash: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          profile_id?: string
          target_email?: string | null
          token_hash?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          profile_id: string
          recorded_by: string | null
          recorded_by_email: string | null
          service_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          profile_id: string
          recorded_by?: string | null
          recorded_by_email?: string | null
          service_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          profile_id?: string
          recorded_by?: string | null
          recorded_by_email?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          password_set_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["profile_status"]
          stripe_customer_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          password_set_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          password_set_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portal_alerts: {
        Row: {
          context: Json
          created_at: string
          id: string
          kind: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          kind: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          kind?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      rentals: {
        Row: {
          amount_received: number | null
          comments: string | null
          created_at: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          daily_rate: number | null
          deposit_amount: number | null
          deposit_received: boolean
          deposit_received_at: string | null
          deposit_returned: boolean
          deposit_returned_amount: number | null
          deposit_returned_at: string | null
          id: string
          pickup_date: string
          pickup_time: string | null
          quoted_price: number | null
          return_date: string
          source: string
          status: string
          unit_id: string | null
          updated_at: string
          usage_location: string | null
        }
        Insert: {
          amount_received?: number | null
          comments?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          daily_rate?: number | null
          deposit_amount?: number | null
          deposit_received?: boolean
          deposit_received_at?: string | null
          deposit_returned?: boolean
          deposit_returned_amount?: number | null
          deposit_returned_at?: string | null
          id?: string
          pickup_date: string
          pickup_time?: string | null
          quoted_price?: number | null
          return_date: string
          source?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          usage_location?: string | null
        }
        Update: {
          amount_received?: number | null
          comments?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          daily_rate?: number | null
          deposit_amount?: number | null
          deposit_received?: boolean
          deposit_received_at?: string | null
          deposit_returned?: boolean
          deposit_returned_amount?: number | null
          deposit_returned_at?: string | null
          id?: string
          pickup_date?: string
          pickup_time?: string | null
          quoted_price?: number | null
          return_date?: string
          source?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          usage_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rentals_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          billing_method: Database["public"]["Enums"]["billing_method"]
          created_at: string
          due_alerted_at: string | null
          id: string
          line_count: number
          monthly_amount_cents: number | null
          next_due_on: string | null
          profile_id: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["service_status"]
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          billing_method?: Database["public"]["Enums"]["billing_method"]
          created_at?: string
          due_alerted_at?: string | null
          id?: string
          line_count?: number
          monthly_amount_cents?: number | null
          next_due_on?: string | null
          profile_id: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          billing_method?: Database["public"]["Enums"]["billing_method"]
          created_at?: string
          due_alerted_at?: string | null
          id?: string
          line_count?: number
          monthly_amount_cents?: number | null
          next_due_on?: string | null
          profile_id?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["service_status"]
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_client: {
        Args: {
          p_address: string
          p_cloud_tier: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_monitoring_tier: string
          p_target_email: string
          p_token_hash: string
          p_voip_lines?: number
          p_voip_tier?: string
        }
        Returns: string
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consume_rate_limit: {
        Args: {
          p_key: string
          p_max: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      save_caller_id_list: {
        Args: {
          p_authorized_via?: string
          p_change_reason?: string
          p_changed_by_email: string
          p_changed_via: string
          p_contacts: Json
          p_profile_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      billing_interval: "monthly" | "annual"
      billing_method: "stripe" | "manual"
      cloud_tier: "7day" | "30day" | "90day"
      footage_status: "pending" | "processing" | "ready" | "failed" | "expired"
      monitoring_tier: "landline" | "cellular" | "cellular_tc" | "cellular_tc_home"
      payment_method: "etransfer" | "cheque" | "cash" | "other"
      profile_status: "pending" | "active" | "disabled"
      service_status: "active" | "paused" | "cancelled" | "unpaid"
      service_type: "monitoring" | "cloud_backup" | "voip"
      user_role: "client" | "admin" | "technician"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_interval: ["monthly", "annual"],
      billing_method: ["stripe", "manual"],
      cloud_tier: ["7day", "30day", "90day"],
      footage_status: ["pending", "processing", "ready", "failed", "expired"],
      monitoring_tier: ["landline", "cellular", "cellular_tc", "cellular_tc_home"],
      payment_method: ["etransfer", "cheque", "cash", "other"],
      profile_status: ["pending", "active", "disabled"],
      service_status: ["active", "paused", "cancelled", "unpaid"],
      service_type: ["monitoring", "cloud_backup", "voip"],
      user_role: ["client", "admin", "technician"],
    },
  },
} as const
