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
      ad_spend_rates: {
        Row: {
          created_at: string
          daily_cost: number
          effective_from: string
          id: string
        }
        Insert: {
          created_at?: string
          daily_cost: number
          effective_from: string
          id?: string
        }
        Update: {
          created_at?: string
          daily_cost?: number
          effective_from?: string
          id?: string
        }
        Relationships: []
      }
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
          reordered: Json
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
          reordered?: Json
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
          reordered?: Json
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
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          passcode?: string | null
          phone: string
          profile_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          passcode?: string | null
          phone?: string
          profile_id?: string
          sort_order?: number
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
      lanvac_account_state: {
        Row: {
          is_disabled: boolean
          last_error: string | null
          last_signal_at: string | null
          last_signal_class: string | null
          last_signal_description: string | null
          last_synced_at: string | null
          on_test_until: string | null
          panel_type: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          is_disabled?: boolean
          last_error?: string | null
          last_signal_at?: string | null
          last_signal_class?: string | null
          last_signal_description?: string | null
          last_synced_at?: string | null
          on_test_until?: string | null
          panel_type?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          is_disabled?: boolean
          last_error?: string | null
          last_signal_at?: string | null
          last_signal_class?: string | null
          last_signal_description?: string | null
          last_synced_at?: string | null
          on_test_until?: string | null
          panel_type?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanvac_account_state_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lanvac_signals: {
        Row: {
          description: string
          id: string
          last_synced_at: string
          occurred_at: string
          occurred_at_text: string
          profile_id: string
          signal: string
          signal_class: string
          sort_index: number
        }
        Insert: {
          description?: string
          id?: string
          last_synced_at?: string
          occurred_at: string
          occurred_at_text?: string
          profile_id: string
          signal?: string
          signal_class?: string
          sort_index?: number
        }
        Update: {
          description?: string
          id?: string
          last_synced_at?: string
          occurred_at?: string
          occurred_at_text?: string
          profile_id?: string
          signal?: string
          signal_class?: string
          sort_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lanvac_signals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lanvac_station_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          lanvac_account_code: string | null
          profile_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          lanvac_account_code?: string | null
          profile_id: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          lanvac_account_code?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanvac_station_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lanvac_zones: {
        Row: {
          description: string
          id: string
          last_synced_at: string
          on_test: boolean
          profile_id: string
          use_call_list: boolean | null
          zone_number: number
          zone_type: string
        }
        Insert: {
          description?: string
          id?: string
          last_synced_at?: string
          on_test?: boolean
          profile_id: string
          use_call_list?: boolean | null
          zone_number: number
          zone_type?: string
        }
        Update: {
          description?: string
          id?: string
          last_synced_at?: string
          on_test?: boolean
          profile_id?: string
          use_call_list?: boolean | null
          zone_number?: number
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanvac_zones_profile_id_fkey"
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
      portal_settings: {
        Row: {
          client_mail_enabled: boolean
          client_mail_enabled_at: string | null
          client_mail_enabled_by: string | null
          id: number
          updated_at: string
        }
        Insert: {
          client_mail_enabled?: boolean
          client_mail_enabled_at?: string | null
          client_mail_enabled_by?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          client_mail_enabled?: boolean
          client_mail_enabled_at?: string | null
          client_mail_enabled_by?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          lanvac_account_code: string | null
          lanvac_city: string | null
          last_name: string
          password_set_at: string | null
          phone: string | null
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
          lanvac_account_code?: string | null
          lanvac_city?: string | null
          last_name: string
          password_set_at?: string | null
          phone?: string | null
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
          lanvac_account_code?: string | null
          lanvac_city?: string | null
          last_name?: string
          password_set_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      qb_bridges: {
        Row: {
          created_at: string
          expected_company_file: string
          id: string
          label: string
          last_error: string | null
          last_mirror_at: string | null
          last_seen_at: string | null
          mode: string
          qb_company_file: string | null
          qb_company_name: string | null
          qb_version: string | null
          secret_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_company_file: string
          id?: string
          label: string
          last_error?: string | null
          last_mirror_at?: string | null
          last_seen_at?: string | null
          mode?: string
          qb_company_file?: string | null
          qb_company_name?: string | null
          qb_version?: string | null
          secret_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_company_file?: string
          id?: string
          label?: string
          last_error?: string | null
          last_mirror_at?: string | null
          last_seen_at?: string | null
          mode?: string
          qb_company_file?: string | null
          qb_company_name?: string | null
          qb_version?: string | null
          secret_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      qb_customers: {
        Row: {
          balance_cents: number
          company_name: string | null
          edit_sequence: string
          email: string | null
          is_active: boolean
          list_id: string
          name: string
          parent_list_id: string | null
          phone: string | null
          profile_id: string | null
          synced_at: string
        }
        Insert: {
          balance_cents?: number
          company_name?: string | null
          edit_sequence: string
          email?: string | null
          is_active?: boolean
          list_id: string
          name: string
          parent_list_id?: string | null
          phone?: string | null
          profile_id?: string | null
          synced_at?: string
        }
        Update: {
          balance_cents?: number
          company_name?: string | null
          edit_sequence?: string
          email?: string | null
          is_active?: boolean
          list_id?: string
          name?: string
          parent_list_id?: string | null
          phone?: string | null
          profile_id?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qb_customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_invoices: {
        Row: {
          amount_cents: number
          balance_cents: number
          customer_list_id: string
          due_on: string | null
          edit_sequence: string
          is_memorized: boolean
          is_paid: boolean
          line_items: Json
          ref_number: string | null
          subtotal_cents: number | null
          synced_at: string
          tax_cents: number | null
          txn_date: string
          txn_id: string
        }
        Insert: {
          amount_cents: number
          balance_cents?: number
          customer_list_id: string
          due_on?: string | null
          edit_sequence: string
          is_memorized?: boolean
          is_paid?: boolean
          line_items?: Json
          ref_number?: string | null
          subtotal_cents?: number | null
          synced_at?: string
          tax_cents?: number | null
          txn_date: string
          txn_id: string
        }
        Update: {
          amount_cents?: number
          balance_cents?: number
          customer_list_id?: string
          due_on?: string | null
          edit_sequence?: string
          is_memorized?: boolean
          is_paid?: boolean
          line_items?: Json
          ref_number?: string | null
          subtotal_cents?: number | null
          synced_at?: string
          tax_cents?: number | null
          txn_date?: string
          txn_id?: string
        }
        Relationships: []
      }
      qb_payments: {
        Row: {
          amount_cents: number
          customer_list_id: string
          deposit_account: string | null
          edit_sequence: string
          payment_method: string | null
          ref_number: string | null
          synced_at: string
          txn_date: string
          txn_id: string
        }
        Insert: {
          amount_cents: number
          customer_list_id: string
          deposit_account?: string | null
          edit_sequence: string
          payment_method?: string | null
          ref_number?: string | null
          synced_at?: string
          txn_date: string
          txn_id: string
        }
        Update: {
          amount_cents?: number
          customer_list_id?: string
          deposit_account?: string | null
          edit_sequence?: string
          payment_method?: string | null
          ref_number?: string | null
          synced_at?: string
          txn_date?: string
          txn_id?: string
        }
        Relationships: []
      }
      qb_todos: {
        Row: {
          is_done: boolean
          notes: string
          reminder_date: string | null
          synced_at: string
          todo_id: string
        }
        Insert: {
          is_done?: boolean
          notes: string
          reminder_date?: string | null
          synced_at?: string
          todo_id: string
        }
        Update: {
          is_done?: boolean
          notes?: string
          reminder_date?: string | null
          synced_at?: string
          todo_id?: string
        }
        Relationships: []
      }
      rental_rate_tiers: {
        Row: {
          amount: number
          created_at: string
          id: string
          max_days: number
          min_days: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          max_days: number
          min_days: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          max_days?: number
          min_days?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rental_reminders: {
        Row: {
          id: string
          kind: string
          rental_id: string
          sent_at: string
          sent_for: string
        }
        Insert: {
          id?: string
          kind: string
          rental_id: string
          sent_at?: string
          sent_for: string
        }
        Update: {
          id?: string
          kind?: string
          rental_id?: string
          sent_at?: string
          sent_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_reminders_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "rentals"
            referencedColumns: ["id"]
          },
        ]
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
          monthly_amount_cents: number | null
          next_due_on: string | null
          number_count: number
          port_count: number
          port_fee_charged_count: number
          profile_id: string
          seat_count: number
          service_type: Database["public"]["Enums"]["service_type"]
          started_on: string | null
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
          monthly_amount_cents?: number | null
          next_due_on?: string | null
          number_count?: number
          port_count?: number
          port_fee_charged_count?: number
          profile_id: string
          seat_count?: number
          service_type: Database["public"]["Enums"]["service_type"]
          started_on?: string | null
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
          monthly_amount_cents?: number | null
          next_due_on?: string | null
          number_count?: number
          port_count?: number
          port_fee_charged_count?: number
          profile_id?: string
          seat_count?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          started_on?: string | null
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
      unit_costs: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          monthly_cost: number
          plan_name: string | null
          unit_id: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          id?: string
          monthly_cost: number
          plan_name?: string | null
          unit_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          monthly_cost?: number
          plan_name?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_costs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          p_voip_numbers?: number
          p_voip_ports?: number
          p_voip_seats?: number
          p_voip_tier?: string
        }
        Returns: string
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      consume_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
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
      monitoring_tier:
        | "landline"
        | "cellular"
        | "cellular_tc"
        | "cellular_tc_home"
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
      monitoring_tier: [
        "landline",
        "cellular",
        "cellular_tc",
        "cellular_tc_home",
      ],
      payment_method: ["etransfer", "cheque", "cash", "other"],
      profile_status: ["pending", "active", "disabled"],
      service_status: ["active", "paused", "cancelled", "unpaid"],
      service_type: ["monitoring", "cloud_backup", "voip"],
      user_role: ["client", "admin", "technician"],
    },
  },
} as const
