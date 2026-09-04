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
      academy_enrollments: {
        Row: {
          business_id: string
          created_at: string
          dependent_id: string
          enrollment_date: string
          group_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          dependent_id: string
          enrollment_date?: string
          group_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          dependent_id?: string
          enrollment_date?: string
          group_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_dependent_id_fkey"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "academy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_group_schedules: {
        Row: {
          business_id: string
          day_of_week: number
          end_time: string
          group_id: string
          id: string
          start_time: string
        }
        Insert: {
          business_id: string
          day_of_week: number
          end_time: string
          group_id: string
          id?: string
          start_time: string
        }
        Update: {
          business_id?: string
          day_of_week?: number
          end_time?: string
          group_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_group_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_group_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "academy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_groups: {
        Row: {
          active: boolean
          age_max: number | null
          age_min: number | null
          business_id: string
          created_at: string
          id: string
          instructor_id: string | null
          max_capacity: number
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          age_max?: number | null
          age_min?: number | null
          business_id: string
          created_at?: string
          id?: string
          instructor_id?: string | null
          max_capacity?: number
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          age_max?: number | null
          age_min?: number | null
          business_id?: string
          created_at?: string
          id?: string
          instructor_id?: string | null
          max_capacity?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_groups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_groups_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_payments: {
        Row: {
          amount_cents: number
          business_id: string
          created_at: string
          discount_applied: number
          enrollment_id: string
          id: string
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          business_id: string
          created_at?: string
          discount_applied?: number
          enrollment_id: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          business_id?: string
          created_at?: string
          discount_applied?: number
          enrollment_id?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "academy_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_tuition_periods: {
        Row: {
          active: boolean
          amount_cents: number
          business_id: string
          created_at: string
          day_of_month: number | null
          group_id: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          business_id: string
          created_at?: string
          day_of_month?: number | null
          group_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          business_id?: string
          created_at?: string
          day_of_month?: number | null
          group_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_tuition_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_tuition_periods_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "academy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_allowed_emails: {
        Row: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      bookings: {
        Row: {
          business_id: string
          cancelled_at: string | null
          class_id: string
          created_at: string
          customer_id: string
          id: string
          refunded: boolean
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          class_id: string
          created_at?: string
          customer_id: string
          id?: string
          refunded?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          class_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          refunded?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "studio_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business: {
        Row: {
          accent_color: string
          address: string | null
          created_at: string
          description: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      customer_credits_ledger: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          delta: number
          granted_by: string | null
          id: string
          notes: string | null
          reason: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          delta: number
          granted_by?: string | null
          id?: string
          notes?: string | null
          reason: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          delta?: number
          granted_by?: string | null
          id?: string
          notes?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_ledger_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dependents: {
        Row: {
          active: boolean
          birth_date: string | null
          business_id: string
          created_at: string
          full_name: string
          guardian_id: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          business_id: string
          created_at?: string
          full_name: string
          guardian_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          business_id?: string
          created_at?: string
          full_name?: string
          guardian_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          active: boolean
          bio: string | null
          business_id: string
          created_at: string
          full_name: string
          id: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          business_id: string
          created_at?: string
          full_name: string
          id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          business_id?: string
          created_at?: string
          full_name?: string
          id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          credits: number
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number
          updated_at: string
          valid_days: number | null
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          credits: number
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents: number
          updated_at?: string
          valid_days?: number | null
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          credits?: number
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          updated_at?: string
          valid_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string
          created_at: string
          discount_percent: number
          full_name: string | null
          id: string
          instructor_id: string | null
          medical_conditions: string | null
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_percent?: number
          full_name?: string | null
          id: string
          instructor_id?: string | null
          medical_conditions?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_percent?: number
          full_name?: string | null
          id?: string
          instructor_id?: string | null
          medical_conditions?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_classes: {
        Row: {
          business_id: string
          created_at: string
          ends_at: string
          id: string
          instructor_id: string
          max_capacity: number
          starts_at: string
          status: Database["public"]["Enums"]["studio_class_status"]
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          ends_at: string
          id?: string
          instructor_id: string
          max_capacity: number
          starts_at: string
          status?: Database["public"]["Enums"]["studio_class_status"]
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          instructor_id?: string
          max_capacity?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["studio_class_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          business_id: string
          class_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          business_id: string
          class_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          business_id?: string
          class_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "studio_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_notifications: {
        Row: {
          business_id: string
          channel: string
          class_id: string
          customer_id: string
          error_message: string | null
          id: string
          sent_at: string
          sent_by: string | null
          status: string
          waitlist_id: string
        }
        Insert: {
          business_id: string
          channel: string
          class_id: string
          customer_id: string
          error_message?: string | null
          id?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          waitlist_id: string
        }
        Update: {
          business_id?: string
          channel?: string
          class_id?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "studio_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_class: {
        Args: { p_class_id: string; p_customer_id: string }
        Returns: {
          business_id: string
          cancelled_at: string | null
          class_id: string
          created_at: string
          customer_id: string
          id: string
          refunded: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined }
      current_user_business_id: { Args: never; Returns: string }
      list_business_profiles: {
        Args: never
        Returns: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          instructor_id: string | null
          discount_percent: number
          created_at: string
        }[]
      }
      list_admin_invites: {
        Args: never
        Returns: {
          email: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          registered: boolean
        }[]
      }
      add_admin_invite: {
        Args: { p_email: string; p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      remove_admin_invite: {
        Args: { p_email: string }
        Returns: undefined
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      grant_credits: {
        Args: { p_amount: number; p_customer_id: string; p_notes?: string }
        Returns: undefined
      }
      promote_from_waitlist: {
        Args: { p_waitlist_id: string }
        Returns: {
          business_id: string
          cancelled_at: string | null
          class_id: string
          created_at: string
          customer_id: string
          id: string
          refunded: boolean
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reset_monthly_credits: { Args: never; Returns: undefined }
    }
    Enums: {
      studio_class_status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
      user_role:
        | "CUSTOMER"
        | "STAFF"
        | "BUSINESS_ADMIN"
        | "SUPER_ADMIN"
        | "INSTRUCTOR_ADMIN"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
