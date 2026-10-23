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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_access_state: {
        Row: {
          id: string
          message: string
          status: number
          updated_at: string
        }
        Insert: {
          id: string
          message: string
          status: number
          updated_at?: string
        }
        Update: {
          id?: string
          message?: string
          status?: number
          updated_at?: string
        }
        Relationships: []
      }
      alexa_oauth_requests: {
        Row: {
          client_id: string
          code_expires_at: string | null
          code_hash: string | null
          completed_at: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          scope: string
          state: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          code_expires_at?: string | null
          code_hash?: string | null
          completed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id: string
          redirect_uri: string
          scope: string
          state: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          code_expires_at?: string | null
          code_hash?: string | null
          completed_at?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          scope?: string
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alexa_tokens: {
        Row: {
          access_token_hash: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          scopes: Json
          user_id: string
        }
        Insert: {
          access_token_hash: string
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          scopes?: Json
          user_id: string
        }
        Update: {
          access_token_hash?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          scopes?: Json
          user_id?: string
        }
        Relationships: []
      }
      conversation_imports: {
        Row: {
          conversation: string
          created_at: string
          extraction: Json
          id: string
          title: string
          user_id: string
        }
        Insert: {
          conversation: string
          created_at?: string
          extraction: Json
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          conversation?: string
          created_at?: string
          extraction?: Json
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      device_setups: {
        Row: {
          completed_at: string | null
          selected_device_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          selected_device_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          selected_device_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_setups_selected_device_id_fkey"
            columns: ["selected_device_id"]
            isOneToOne: false
            referencedRelation: "smart_home_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_operations: {
        Row: {
          created_at: string
          id: string
          operation: string
          payload: Json
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operation: string
          payload: Json
          request_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          operation?: string
          payload?: Json
          request_id?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_connection_secrets: {
        Row: {
          access_token: string
          connection_id: string
          key_version: number
          refresh_token: string
          scopes: Json
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          connection_id: string
          key_version?: number
          refresh_token: string
          scopes?: Json
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          connection_id?: string
          key_version?: number
          refresh_token?: string
          scopes?: Json
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_connection_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_connections: {
        Row: {
          created_at: string
          display_name: string
          external_account_id: string
          hardware_id: string
          id: string
          metadata: Json
          provider: string
          revoked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          external_account_id: string
          hardware_id?: string
          id?: string
          metadata?: Json
          provider: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          external_account_id?: string
          hardware_id?: string
          id?: string
          metadata?: Json
          provider?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_link_claims: {
        Row: {
          access_token: string
          claimed_at: string | null
          created_at: string
          expires_at: string
          external_account_id: string
          hardware_id: string
          id: string
          metadata: Json
          provider: string
          refresh_token: string
          scopes: Json
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          external_account_id: string
          hardware_id: string
          id?: string
          metadata?: Json
          provider: string
          refresh_token: string
          scopes?: Json
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          external_account_id?: string
          hardware_id?: string
          id?: string
          metadata?: Json
          provider?: string
          refresh_token?: string
          scopes?: Json
          token_expires_at?: string | null
        }
        Relationships: []
      }
      provider_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          payload: Json
          provider: string
          published_at: string | null
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          payload: Json
          provider: string
          published_at?: string | null
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          payload?: Json
          provider?: string
          published_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      smart_home_devices: {
        Row: {
          capabilities: Json
          connection_id: string
          created_at: string
          external_device_id: string
          id: string
          kind: string
          last_seen_at: string | null
          location: string
          metadata: Json
          model: string
          name: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capabilities?: Json
          connection_id: string
          created_at?: string
          external_device_id: string
          id?: string
          kind: string
          last_seen_at?: string | null
          location?: string
          metadata?: Json
          model?: string
          name: string
          provider: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          capabilities?: Json
          connection_id?: string
          created_at?: string
          external_device_id?: string
          id?: string
          kind?: string
          last_seen_at?: string | null
          location?: string
          metadata?: Json
          model?: string
          name?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_home_devices_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "provider_connections"
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
