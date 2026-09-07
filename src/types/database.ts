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
      assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_at: string
          assigned_by: string
          id: string
          issue_id: string
          organization_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by: string
          id?: string
          issue_id: string
          organization_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by?: string
          id?: string
          issue_id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          id: string
          issue_id: string | null
          mime_type: string
          report_id: string | null
          resolution_attempt_id: string | null
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id?: string | null
          mime_type: string
          report_id?: string | null
          resolution_attempt_id?: string | null
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string | null
          mime_type?: string
          report_id?: string | null
          resolution_attempt_id?: string | null
          size_bytes?: number
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_resolution_attempt_id_fkey"
            columns: ["resolution_attempt_id"]
            isOneToOne: false
            referencedRelation: "resolution_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_reports: {
        Row: {
          created_at: string
          created_by: string
          generation_status: string
          id: string
          issue_id: string
          model: string | null
          source_issue_ids: string[]
          summary: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          generation_status?: string
          id?: string
          issue_id: string
          model?: string | null
          source_issue_ids?: string[]
          summary?: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          generation_status?: string
          id?: string
          issue_id?: string
          model?: string | null
          source_issue_ids?: string[]
          summary?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "historical_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_reports_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          issue_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          issue_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_events_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          category: string
          classification: string
          created_at: string
          created_by: string
          demo_source: string
          department_id: string | null
          embedding: string | null
          embedding_model: string | null
          failed_attempts: number
          id: string
          latitude: number
          location_label: string
          longitude: number
          predecessor_issue_id: string | null
          prior_verified_occurrences: number
          priority: number
          recurrence_family_id: string | null
          severity: string
          status: string
          title: string
          unique_reporters: number
          verified_at: string | null
          verifier_id: string | null
        }
        Insert: {
          category: string
          classification?: string
          created_at?: string
          created_by: string
          demo_source?: string
          department_id?: string | null
          embedding?: string | null
          embedding_model?: string | null
          failed_attempts?: number
          id?: string
          latitude: number
          location_label: string
          longitude: number
          predecessor_issue_id?: string | null
          prior_verified_occurrences?: number
          priority?: number
          recurrence_family_id?: string | null
          severity?: string
          status?: string
          title: string
          unique_reporters?: number
          verified_at?: string | null
          verifier_id?: string | null
        }
        Update: {
          category?: string
          classification?: string
          created_at?: string
          created_by?: string
          demo_source?: string
          department_id?: string | null
          embedding?: string | null
          embedding_model?: string | null
          failed_attempts?: number
          id?: string
          latitude?: number
          location_label?: string
          longitude?: number
          predecessor_issue_id?: string | null
          prior_verified_occurrences?: number
          priority?: number
          recurrence_family_id?: string | null
          severity?: string
          status?: string
          title?: string
          unique_reporters?: number
          verified_at?: string | null
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_predecessor_issue_id_fkey"
            columns: ["predecessor_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organization_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          demo_source: string
          description: string
          duration_text: string | null
          embedding: string | null
          embedding_model: string | null
          extraction: Json
          id: string
          idempotency_key: string
          issue_id: string | null
          latitude: number
          location_label: string
          longitude: number
          match_outcome: string | null
          occurrence_at: string
          processing_error: string | null
          processing_status: string
          provider_or_asset: string | null
          reporter_id: string
          selected_category: string | null
        }
        Insert: {
          created_at?: string
          demo_source?: string
          description: string
          duration_text?: string | null
          embedding?: string | null
          embedding_model?: string | null
          extraction?: Json
          id?: string
          idempotency_key: string
          issue_id?: string | null
          latitude: number
          location_label: string
          longitude: number
          match_outcome?: string | null
          occurrence_at?: string
          processing_error?: string | null
          processing_status?: string
          provider_or_asset?: string | null
          reporter_id: string
          selected_category?: string | null
        }
        Update: {
          created_at?: string
          demo_source?: string
          description?: string
          duration_text?: string | null
          embedding?: string | null
          embedding_model?: string | null
          extraction?: Json
          id?: string
          idempotency_key?: string
          issue_id?: string | null
          latitude?: number
          location_label?: string
          longitude?: number
          match_outcome?: string | null
          occurrence_at?: string
          processing_error?: string | null
          processing_status?: string
          provider_or_asset?: string | null
          reporter_id?: string
          selected_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resolution_attempts: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          issue_id: string
          note: string
          outcome: string
          rejection_reason: string | null
          submitted_by: string
          verifier_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          issue_id: string
          note: string
          outcome?: string
          rejection_reason?: string | null
          submitted_by: string
          verifier_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          issue_id?: string
          note?: string
          outcome?: string
          rejection_reason?: string | null
          submitted_by?: string
          verifier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resolution_attempts_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_attempts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolution_attempts_verifier_id_fkey"
            columns: ["verifier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      workflow_action: { Args: { p_issue_id: string; p_action: string; p_payload: Json }; Returns: Json }
      admin_action: { Args: { p_action: string; p_payload: Json }; Returns: Json }
      import_dataset: { Args: { p_dataset: string; p_source_url: string; p_provenance: string; p_rows: Json }; Returns: Json }
      route_issue: {
        Args: { p_issue_id: string; p_organization_id: string }
        Returns: string
      }
      submit_resolution: {
        Args: {
          p_evidence_id: string
          p_issue_id: string
          p_mime_type: string
          p_note: string
          p_resolution_id: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      retrieve_issue_history: {
        Args: { p_issue_id: string }
        Returns: Json
      }
      submit_report: {
        Args: {
          p_category: string
          p_description: string
          p_duration_text: string
          p_embedding: string
          p_embedding_model: string
          p_extraction: Json
          p_idempotency_key: string
          p_latitude: number
          p_location_label: string
          p_longitude: number
          p_occurrence_at: string
          p_provider_or_asset: string
          p_severity: string
          p_title: string
        }
        Returns: {
          issue_id: string
          match_outcome: string
          priority: number
          report_id: string
          similarity: number
        }[]
      }
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
