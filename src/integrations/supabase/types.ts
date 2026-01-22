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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_areas: {
        Row: {
          created_at: string
          delivery_fee: number
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          order_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          order_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          order_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      issue_reasons: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category: string
          created_at: string
          display_order: number | null
          id: string
          image: string | null
          is_available: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          menu_item_name: string
          menu_item_price: number
          notes: string | null
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          menu_item_name: string
          menu_item_price: number
          notes?: string | null
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          menu_item_name?: string
          menu_item_price?: number
          notes?: string | null
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cashier_id: string | null
          cashier_name: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_area_id: string | null
          delivery_fee: number
          delivery_person_id: string | null
          delivery_person_name: string | null
          edited_at: string | null
          has_issue: boolean | null
          id: string
          is_archived: boolean
          is_edited: boolean | null
          issue_reason: string | null
          issue_reported_at: string | null
          issue_reported_by: string | null
          notes: string | null
          order_number: number
          pending_delivery_acceptance: boolean | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cashier_id?: string | null
          cashier_name?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_area_id?: string | null
          delivery_fee?: number
          delivery_person_id?: string | null
          delivery_person_name?: string | null
          edited_at?: string | null
          has_issue?: boolean | null
          id?: string
          is_archived?: boolean
          is_edited?: boolean | null
          issue_reason?: string | null
          issue_reported_at?: string | null
          issue_reported_by?: string | null
          notes?: string | null
          order_number?: number
          pending_delivery_acceptance?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cashier_id?: string | null
          cashier_name?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_area_id?: string | null
          delivery_fee?: number
          delivery_person_id?: string | null
          delivery_person_name?: string | null
          edited_at?: string | null
          has_issue?: boolean | null
          id?: string
          is_archived?: boolean
          is_edited?: boolean | null
          issue_reason?: string | null
          issue_reported_at?: string | null
          issue_reported_by?: string | null
          notes?: string | null
          order_number?: number
          pending_delivery_acceptance?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_area_id_fkey"
            columns: ["delivery_area_id"]
            isOneToOne: false
            referencedRelation: "delivery_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_order_sequence: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "cashier"
        | "field"
        | "delivery"
        | "takeaway"
        | "kitchen"
        | "admin"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivering"
        | "delivered"
        | "cancelled"
      order_type: "delivery" | "takeaway"
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
      app_role: [
        "cashier",
        "field",
        "delivery",
        "takeaway",
        "kitchen",
        "admin",
      ],
      order_status: [
        "pending",
        "preparing",
        "ready",
        "delivering",
        "delivered",
        "cancelled",
      ],
      order_type: ["delivery", "takeaway"],
    },
  },
} as const
