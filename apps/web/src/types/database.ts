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
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          key: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          key: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          api_key_id: string
          content: string
          created_at: string
          id: string
          meta: Json | null
          role: string
        }
        Insert: {
          api_key_id: string
          content: string
          created_at?: string
          id?: string
          meta?: Json | null
          role: string
        }
        Update: {
          api_key_id?: string
          content?: string
          created_at?: string
          id?: string
          meta?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      message_stats: {
        Row: {
          hour: string | null
          message_count: number | null
          unique_agents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_api_key: {
        Args: Record<string, never>;
        Returns: string;
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
