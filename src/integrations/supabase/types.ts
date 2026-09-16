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
      decks: {
        Row: {
          color: string
          created_at_ms: number
          description: string | null
          favorite: boolean
          id: string
          last_studied_at_ms: number | null
          position: number
          subject: string
          tags: string[]
          title: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at_ms: number
          description?: string | null
          favorite?: boolean
          id: string
          last_studied_at_ms?: number | null
          position?: number
          subject?: string
          tags?: string[]
          title: string
          user_id: string
        }
        Update: {
          color?: string
          created_at_ms?: number
          description?: string | null
          favorite?: boolean
          id?: string
          last_studied_at_ms?: number | null
          position?: number
          subject?: string
          tags?: string[]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string
          created_at: string
          daily_goal: number
          display_name: string
          focus_subjects: string[]
          grade_level: string
          id: string
          onboarding_complete: boolean
          school: string
          study_reason: string
          updated_at: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          daily_goal?: number
          display_name?: string
          focus_subjects?: string[]
          grade_level?: string
          id: string
          onboarding_complete?: boolean
          school?: string
          study_reason?: string
          updated_at?: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          daily_goal?: number
          display_name?: string
          focus_subjects?: string[]
          grade_level?: string
          id?: string
          onboarding_complete?: boolean
          school?: string
          study_reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_state: {
        Row: {
          bookmarked: boolean
          mastered: boolean
          note: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          mastered?: boolean
          note?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          mastered?: boolean
          note?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_state_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string
          concept: string | null
          deck_id: string
          difficulty: string
          explanation: string | null
          hint: string | null
          id: string
          options: Json | null
          position: number
          question: string
          tags: string[]
          type: string
          user_id: string
        }
        Insert: {
          answer: string
          concept?: string | null
          deck_id: string
          difficulty?: string
          explanation?: string | null
          hint?: string | null
          id: string
          options?: Json | null
          position?: number
          question: string
          tags?: string[]
          type: string
          user_id: string
        }
        Update: {
          answer?: string
          concept?: string | null
          deck_id?: string
          difficulty?: string
          explanation?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          position?: number
          question?: string
          tags?: string[]
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          created_at_ms: number
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at_ms: number
          id: string
          payload: Json
          user_id: string
        }
        Update: {
          created_at_ms?: number
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          answered: number
          correct: number
          date_ms: number
          deck_titles: string[]
          duration_ms: number
          id: string
          mode: string
          percentage: number
          skipped: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          answered?: number
          correct?: number
          date_ms: number
          deck_titles?: string[]
          duration_ms?: number
          id: string
          mode: string
          percentage?: number
          skipped?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          answered?: number
          correct?: number
          date_ms?: number
          deck_titles?: string[]
          duration_ms?: number
          id?: string
          mode?: string
          percentage?: number
          skipped?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          payload: Json
          user_id: string
        }
        Insert: {
          payload?: Json
          user_id: string
        }
        Update: {
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          payload: Json
          templates: Json
          user_id: string
        }
        Insert: {
          payload?: Json
          templates?: Json
          user_id: string
        }
        Update: {
          payload?: Json
          templates?: Json
          user_id?: string
        }
        Relationships: []
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
