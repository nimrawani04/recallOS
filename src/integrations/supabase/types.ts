export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ai_access_state: {
        Row: {
          id: string;
          message: string;
          status: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          message: string;
          status: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          message?: string;
          status?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_imports: {
        Row: {
          conversation: string;
          created_at: string;
          extraction: Json;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          conversation: string;
          created_at?: string;
          extraction: Json;
          id?: string;
          title: string;
          user_id?: string;
        };
        Update: {
          conversation?: string;
          created_at?: string;
          extraction?: Json;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      memory_operations: {
        Row: {
          id: string;
          user_id: string;
          request_id: string;
          operation: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          request_id: string;
          operation: string;
          payload: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          request_id?: string;
          operation?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      provider_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          external_account_id: string;
          display_name: string;
          hardware_id: string;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          provider: string;
          external_account_id: string;
          display_name: string;
          hardware_id?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          external_account_id?: string;
          display_name?: string;
          hardware_id?: string;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      provider_connection_secrets: {
        Row: {
          connection_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string | null;
          scopes: Json;
          key_version: number;
          updated_at: string;
        };
        Insert: {
          connection_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at?: string | null;
          scopes?: Json;
          key_version?: number;
          updated_at?: string;
        };
        Update: {
          connection_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string | null;
          scopes?: Json;
          key_version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_link_claims: {
        Row: {
          id: string;
          provider: string;
          external_account_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string | null;
          scopes: Json;
          hardware_id: string;
          metadata: Json;
          expires_at: string;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          external_account_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at?: string | null;
          scopes?: Json;
          hardware_id: string;
          metadata?: Json;
          expires_at?: string;
          claimed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          external_account_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string | null;
          scopes?: Json;
          hardware_id?: string;
          metadata?: Json;
          expires_at?: string;
          claimed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      smart_home_devices: {
        Row: {
          id: string;
          user_id: string;
          connection_id: string;
          provider: string;
          external_device_id: string;
          name: string;
          kind: string;
          model: string;
          location: string;
          status: string;
          capabilities: Json;
          metadata: Json;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          connection_id: string;
          provider: string;
          external_device_id: string;
          name: string;
          kind: string;
          model?: string;
          location?: string;
          status?: string;
          capabilities?: Json;
          metadata?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          connection_id?: string;
          provider?: string;
          external_device_id?: string;
          name?: string;
          kind?: string;
          model?: string;
          location?: string;
          status?: string;
          capabilities?: Json;
          metadata?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      device_setups: {
        Row: {
          user_id: string;
          selected_device_id: string | null;
          status: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          selected_device_id?: string | null;
          status?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          selected_device_id?: string | null;
          status?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_webhook_events: {
        Row: {
          provider: string;
          event_id: string;
          event_type: string;
          payload: Json;
          published_at: string | null;
          received_at: string;
        };
        Insert: {
          provider: string;
          event_id: string;
          event_type: string;
          payload: Json;
          published_at?: string | null;
          received_at?: string;
        };
        Update: {
          provider?: string;
          event_id?: string;
          event_type?: string;
          payload?: Json;
          published_at?: string | null;
          received_at?: string;
        };
        Relationships: [];
      };
      alexa_oauth_requests: {
        Row: {
          id: string;
          user_id: string | null;
          client_id: string;
          redirect_uri: string;
          state: string;
          scope: string;
          code_hash: string | null;
          expires_at: string;
          code_expires_at: string | null;
          completed_at: string | null;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          client_id: string;
          redirect_uri: string;
          state: string;
          scope: string;
          code_hash?: string | null;
          expires_at: string;
          code_expires_at?: string | null;
          completed_at?: string | null;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          client_id?: string;
          redirect_uri?: string;
          state?: string;
          scope?: string;
          code_hash?: string | null;
          expires_at?: string;
          code_expires_at?: string | null;
          completed_at?: string | null;
          consumed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      alexa_tokens: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          access_token_hash: string;
          scopes: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          client_id: string;
          access_token_hash: string;
          scopes?: Json;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          client_id?: string;
          access_token_hash?: string;
          scopes?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
