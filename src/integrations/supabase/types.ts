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
      academic_alerts: {
        Row: {
          closed_at: string | null
          founder_id: string
          id: string
          kind: string
          opened_at: string
          reason: string | null
          status: string
        }
        Insert: {
          closed_at?: string | null
          founder_id: string
          id?: string
          kind: string
          opened_at?: string
          reason?: string | null
          status?: string
        }
        Update: {
          closed_at?: string | null
          founder_id?: string
          id?: string
          kind?: string
          opened_at?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_alerts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "academic_alerts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_credits: {
        Row: {
          board_status: string | null
          final_score: number | null
          founder_id: string
          id: string
          monthly_scores: Json | null
          passed: boolean | null
          semester: string | null
          semester_score: number | null
          subject: string
          updated_at: string
        }
        Insert: {
          board_status?: string | null
          final_score?: number | null
          founder_id: string
          id?: string
          monthly_scores?: Json | null
          passed?: boolean | null
          semester?: string | null
          semester_score?: number | null
          subject: string
          updated_at?: string
        }
        Update: {
          board_status?: string | null
          final_score?: number | null
          founder_id?: string
          id?: string
          monthly_scores?: Json | null
          passed?: boolean | null
          semester?: string | null
          semester_score?: number | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_credits_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "academic_credits_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configs: {
        Row: {
          cadence: string
          channels: string[]
          config: Json
          created_at: string
          description: string
          enabled: boolean
          id: string
          last_run_at: string | null
          last_status: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          channels?: string[]
          config?: Json
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_status?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          channels?: string[]
          config?: Json
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_slug: string
          details: Json
          error: string | null
          finished_at: string | null
          id: string
          items_processed: number
          started_at: string
          status: string
          summary: string | null
          triggered_by: string
        }
        Insert: {
          agent_slug: string
          details?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          items_processed?: number
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Update: {
          agent_slug?: string
          details?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          items_processed?: number
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      ai_evaluations: {
        Row: {
          faculty_summary: string | null
          generated_at: string
          id: string
          missing: string | null
          packet_id: string
          raw_json: Json | null
          risks: string | null
          strengths: string | null
          suggested_behavior: number | null
          suggested_business: number | null
          suggested_customer: number | null
          suggested_execution: number | null
          suggested_status: Database["public"]["Enums"]["review_status"] | null
          suggested_total: number | null
          weaknesses: string | null
        }
        Insert: {
          faculty_summary?: string | null
          generated_at?: string
          id?: string
          missing?: string | null
          packet_id: string
          raw_json?: Json | null
          risks?: string | null
          strengths?: string | null
          suggested_behavior?: number | null
          suggested_business?: number | null
          suggested_customer?: number | null
          suggested_execution?: number | null
          suggested_status?: Database["public"]["Enums"]["review_status"] | null
          suggested_total?: number | null
          weaknesses?: string | null
        }
        Update: {
          faculty_summary?: string | null
          generated_at?: string
          id?: string
          missing?: string | null
          packet_id?: string
          raw_json?: Json | null
          risks?: string | null
          strengths?: string | null
          suggested_behavior?: number | null
          suggested_business?: number | null
          suggested_customer?: number | null
          suggested_execution?: number | null
          suggested_status?: Database["public"]["Enums"]["review_status"] | null
          suggested_total?: number | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "submission_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      biweekly_meetings: {
        Row: {
          created_at: string
          cycle_number: number
          id: string
          meeting_date: string
          meeting_weekday: string
          notes: string | null
          period_end: string
          period_start: string
          submit_deadline: string
        }
        Insert: {
          created_at?: string
          cycle_number: number
          id?: string
          meeting_date: string
          meeting_weekday: string
          notes?: string | null
          period_end: string
          period_start: string
          submit_deadline: string
        }
        Update: {
          created_at?: string
          cycle_number?: number
          id?: string
          meeting_date?: string
          meeting_weekday?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          submit_deadline?: string
        }
        Relationships: []
      }
      biweekly_mentor_observations: {
        Row: {
          action_items: string | null
          author_id: string
          concerns: string | null
          created_at: string
          cycle_number: number
          evidence_reviewed: Json
          founder_id: string
          id: string
          observation: string
          strengths: string | null
          updated_at: string
        }
        Insert: {
          action_items?: string | null
          author_id: string
          concerns?: string | null
          created_at?: string
          cycle_number: number
          evidence_reviewed?: Json
          founder_id: string
          id?: string
          observation: string
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: string | null
          author_id?: string
          concerns?: string | null
          created_at?: string
          cycle_number?: number
          evidence_reviewed?: Json
          founder_id?: string
          id?: string
          observation?: string
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biweekly_mentor_observations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "biweekly_mentor_observations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      biweekly_submissions: {
        Row: {
          ask_for_help: string | null
          blockers: string | null
          created_at: string
          customer_interviews: number | null
          cycle_number: number
          evidence_links: Json
          experiments_run: number | null
          features_shipped: number | null
          founder_id: string
          goals_next_cycle: string | null
          hours_worked: number | null
          id: string
          mentor_meeting_date: string | null
          mentor_meeting_notes: string | null
          period_end: string
          period_start: string
          progress_summary: string | null
          revenue: number | null
          submitted_at: string | null
          updated_at: string
          users_acquired: number | null
          wins: string | null
        }
        Insert: {
          ask_for_help?: string | null
          blockers?: string | null
          created_at?: string
          customer_interviews?: number | null
          cycle_number: number
          evidence_links?: Json
          experiments_run?: number | null
          features_shipped?: number | null
          founder_id: string
          goals_next_cycle?: string | null
          hours_worked?: number | null
          id?: string
          mentor_meeting_date?: string | null
          mentor_meeting_notes?: string | null
          period_end: string
          period_start: string
          progress_summary?: string | null
          revenue?: number | null
          submitted_at?: string | null
          updated_at?: string
          users_acquired?: number | null
          wins?: string | null
        }
        Update: {
          ask_for_help?: string | null
          blockers?: string | null
          created_at?: string
          customer_interviews?: number | null
          cycle_number?: number
          evidence_links?: Json
          experiments_run?: number | null
          features_shipped?: number | null
          founder_id?: string
          goals_next_cycle?: string | null
          hours_worked?: number | null
          id?: string
          mentor_meeting_date?: string | null
          mentor_meeting_notes?: string | null
          period_end?: string
          period_start?: string
          progress_summary?: string | null
          revenue?: number | null
          submitted_at?: string | null
          updated_at?: string
          users_acquired?: number | null
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biweekly_submissions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "biweekly_submissions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      career_recommendations: {
        Row: {
          alt_paths: Json | null
          founder_id: string
          generated_at: string
          id: string
          primary_path: string | null
          rationale: string | null
        }
        Insert: {
          alt_paths?: Json | null
          founder_id: string
          generated_at?: string
          id?: string
          primary_path?: string | null
          rationale?: string | null
        }
        Update: {
          alt_paths?: Json | null
          founder_id?: string
          generated_at?: string
          id?: string
          primary_path?: string | null
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_recommendations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "career_recommendations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_scores: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          level: Database["public"]["Enums"]["committee_level"]
          month: number | null
          notes: string | null
          organisation: string | null
          reviewer_name: string | null
          score: number | null
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          level: Database["public"]["Enums"]["committee_level"]
          month?: number | null
          notes?: string | null
          organisation?: string | null
          reviewer_name?: string | null
          score?: number | null
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          level?: Database["public"]["Enums"]["committee_level"]
          month?: number | null
          notes?: string | null
          organisation?: string | null
          reviewer_name?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_scores_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "committee_scores_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          behavior_comment: string | null
          behavior_score: number
          business_comment: string | null
          business_score: number
          created_at: string
          customer_comment: string | null
          customer_score: number
          evaluator_id: string | null
          execution_comment: string | null
          execution_score: number
          founder_id: string
          id: string
          manual_override: boolean
          month_number: number
          overall_comment: string | null
          recommendation: Database["public"]["Enums"]["recommendation"] | null
          status: Database["public"]["Enums"]["review_status"] | null
          submission_id: string | null
          total_score: number | null
          year: number
        }
        Insert: {
          behavior_comment?: string | null
          behavior_score?: number
          business_comment?: string | null
          business_score?: number
          created_at?: string
          customer_comment?: string | null
          customer_score?: number
          evaluator_id?: string | null
          execution_comment?: string | null
          execution_score?: number
          founder_id: string
          id?: string
          manual_override?: boolean
          month_number: number
          overall_comment?: string | null
          recommendation?: Database["public"]["Enums"]["recommendation"] | null
          status?: Database["public"]["Enums"]["review_status"] | null
          submission_id?: string | null
          total_score?: number | null
          year: number
        }
        Update: {
          behavior_comment?: string | null
          behavior_score?: number
          business_comment?: string | null
          business_score?: number
          created_at?: string
          customer_comment?: string | null
          customer_score?: number
          evaluator_id?: string | null
          execution_comment?: string | null
          execution_score?: number
          founder_id?: string
          id?: string
          manual_override?: boolean
          month_number?: number
          overall_comment?: string | null
          recommendation?: Database["public"]["Enums"]["recommendation"] | null
          status?: Database["public"]["Enums"]["review_status"] | null
          submission_id?: string | null
          total_score?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "evaluations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "monthly_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participations: {
        Row: {
          created_at: string
          event_id: string
          evidence_url: string | null
          faculty_approved: boolean
          founder_id: string
          id: string
          role: Database["public"]["Enums"]["event_role"]
        }
        Insert: {
          created_at?: string
          event_id: string
          evidence_url?: string | null
          faculty_approved?: boolean
          founder_id: string
          id?: string
          role?: Database["public"]["Enums"]["event_role"]
        }
        Update: {
          created_at?: string
          event_id?: string
          evidence_url?: string | null
          faculty_approved?: boolean
          founder_id?: string
          id?: string
          role?: Database["public"]["Enums"]["event_role"]
        }
        Relationships: [
          {
            foreignKeyName: "event_participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "event_participations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      evidence_items: {
        Row: {
          category: Database["public"]["Enums"]["evidence_category"]
          created_at: string
          file_path: string | null
          founder_id: string
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime: string | null
          month: number | null
          notes: string | null
          size: number | null
          title: string
          url: string | null
          week_start: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["evidence_category"]
          created_at?: string
          file_path?: string | null
          founder_id: string
          id?: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime?: string | null
          month?: number | null
          notes?: string | null
          size?: number | null
          title: string
          url?: string | null
          week_start?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["evidence_category"]
          created_at?: string
          file_path?: string | null
          founder_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["evidence_kind"]
          mime?: string | null
          month?: number | null
          notes?: string | null
          size?: number | null
          title?: string
          url?: string | null
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "evidence_items_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_reviews: {
        Row: {
          behavior_score: number | null
          business_score: number | null
          comments: string | null
          created_at: string
          customer_score: number | null
          cycle_number: number | null
          decided_at: string | null
          decision: Database["public"]["Enums"]["review_decision"]
          evidence_refs: Json
          execution_score: number | null
          founder_id: string
          id: string
          packet_id: string
          recommendations: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["review_status"] | null
          total_score: number | null
        }
        Insert: {
          behavior_score?: number | null
          business_score?: number | null
          comments?: string | null
          created_at?: string
          customer_score?: number | null
          cycle_number?: number | null
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["review_decision"]
          evidence_refs?: Json
          execution_score?: number | null
          founder_id: string
          id?: string
          packet_id: string
          recommendations?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          total_score?: number | null
        }
        Update: {
          behavior_score?: number | null
          business_score?: number | null
          comments?: string | null
          created_at?: string
          customer_score?: number | null
          cycle_number?: number | null
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["review_decision"]
          evidence_refs?: Json
          execution_score?: number | null
          founder_id?: string
          id?: string
          packet_id?: string
          recommendations?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"] | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_reviews_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "faculty_reviews_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_reviews_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "submission_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_signup_requests: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string | null
          id: string
          notes: string | null
          requested_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      founder_intakes: {
        Row: {
          business_model: string | null
          capital_status: string | null
          cofounders: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["lifecycle_stage"] | null
          deck_url: string | null
          demo_url: string | null
          founder_id: string
          id: string
          key_assumptions: string | null
          one_liner: string | null
          problem_statement: string | null
          six_month_goals: string | null
          submitted_at: string | null
          target_customer: string | null
          tech_stack: string | null
          top_risks: string | null
          traction_summary: string | null
          updated_at: string
          website_url: string | null
          weekly_hours_committed: number | null
        }
        Insert: {
          business_model?: string | null
          capital_status?: string | null
          cofounders?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["lifecycle_stage"] | null
          deck_url?: string | null
          demo_url?: string | null
          founder_id: string
          id?: string
          key_assumptions?: string | null
          one_liner?: string | null
          problem_statement?: string | null
          six_month_goals?: string | null
          submitted_at?: string | null
          target_customer?: string | null
          tech_stack?: string | null
          top_risks?: string | null
          traction_summary?: string | null
          updated_at?: string
          website_url?: string | null
          weekly_hours_committed?: number | null
        }
        Update: {
          business_model?: string | null
          capital_status?: string | null
          cofounders?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["lifecycle_stage"] | null
          deck_url?: string | null
          demo_url?: string | null
          founder_id?: string
          id?: string
          key_assumptions?: string | null
          one_liner?: string | null
          problem_statement?: string | null
          six_month_goals?: string | null
          submitted_at?: string | null
          target_customer?: string | null
          tech_stack?: string | null
          top_risks?: string | null
          traction_summary?: string | null
          updated_at?: string
          website_url?: string | null
          weekly_hours_committed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_intakes_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "founder_intakes_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          batch: string | null
          campus: string | null
          created_at: string
          description: string | null
          founder_name: string
          id: string
          industry: string | null
          intake_completed_at: string | null
          lifecycle_stage: Database["public"]["Enums"]["lifecycle_stage"]
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          mentor_id: string | null
          next_review_date: string | null
          semester: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          startup_name: string
          team_size: number | null
          updated_at: string
          user_id: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          batch?: string | null
          campus?: string | null
          created_at?: string
          description?: string | null
          founder_name: string
          id?: string
          industry?: string | null
          intake_completed_at?: string | null
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"]
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          mentor_id?: string | null
          next_review_date?: string | null
          semester?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          startup_name: string
          team_size?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          batch?: string | null
          campus?: string | null
          created_at?: string
          description?: string | null
          founder_name?: string
          id?: string
          industry?: string | null
          intake_completed_at?: string | null
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"]
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          mentor_id?: string | null
          next_review_date?: string | null
          semester?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          startup_name?: string
          team_size?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      import_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          performed_by: string | null
          performed_by_email: string | null
          record_count: number
          record_ids: string[]
          record_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          record_count?: number
          record_ids?: string[]
          record_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          record_count?: number
          record_ids?: string[]
          record_type?: string
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          computed_at: string
          consistency_score: number | null
          evidence_completeness: number | null
          experiments: number | null
          features_shipped: number | null
          founder_id: string
          id: string
          interviews: number | null
          mentor_engagement: number | null
          month: number
          mvp_velocity: number | null
          partnerships: number | null
          revenue: number | null
          timeliness: number | null
        }
        Insert: {
          computed_at?: string
          consistency_score?: number | null
          evidence_completeness?: number | null
          experiments?: number | null
          features_shipped?: number | null
          founder_id: string
          id?: string
          interviews?: number | null
          mentor_engagement?: number | null
          month: number
          mvp_velocity?: number | null
          partnerships?: number | null
          revenue?: number | null
          timeliness?: number | null
        }
        Update: {
          computed_at?: string
          consistency_score?: number | null
          evidence_completeness?: number | null
          experiments?: number | null
          features_shipped?: number | null
          founder_id?: string
          id?: string
          interviews?: number | null
          mentor_engagement?: number | null
          month?: number
          mvp_velocity?: number | null
          partnerships?: number | null
          revenue?: number | null
          timeliness?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "kpi_snapshots_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          duration_minutes: number | null
          fireflies_transcript_id: string | null
          founder_id: string
          id: string
          ingested_at: string
          ingested_by: string | null
          meeting_id: string
          meeting_started_at: string | null
          mentor_id: string | null
          source: string
          transcript: string
        }
        Insert: {
          duration_minutes?: number | null
          fireflies_transcript_id?: string | null
          founder_id: string
          id?: string
          ingested_at?: string
          ingested_by?: string | null
          meeting_id: string
          meeting_started_at?: string | null
          mentor_id?: string | null
          source: string
          transcript: string
        }
        Update: {
          duration_minutes?: number | null
          fireflies_transcript_id?: string | null
          founder_id?: string
          id?: string
          ingested_at?: string
          ingested_by?: string | null
          meeting_id?: string
          meeting_started_at?: string | null
          mentor_id?: string | null
          source?: string
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "meeting_transcripts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "biweekly_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_transcripts_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["mentor_id"]
          },
          {
            foreignKeyName: "meeting_transcripts_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "program_mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          mentor_id: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          mentor_id: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assignments_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "mentor_assignments_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_kpi_edit_audit: {
        Row: {
          after_value: Json | null
          before_value: Json | null
          created_at: string
          edited_by: string | null
          field: string
          founder_id: string
          id: string
          kpi_goal_id: string
          note: string | null
          transcript_id: string | null
        }
        Insert: {
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          edited_by?: string | null
          field: string
          founder_id: string
          id?: string
          kpi_goal_id: string
          note?: string | null
          transcript_id?: string | null
        }
        Update: {
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          edited_by?: string | null
          field?: string
          founder_id?: string
          id?: string
          kpi_goal_id?: string
          note?: string | null
          transcript_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_kpi_edit_audit_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "mentor_kpi_edit_audit_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_kpi_edit_audit_kpi_goal_id_fkey"
            columns: ["kpi_goal_id"]
            isOneToOne: false
            referencedRelation: "mentor_kpi_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_kpi_edit_audit_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_kpi_goals: {
        Row: {
          action_items: Json
          created_at: string
          founder_id: string
          goals: Json
          id: string
          kpis: Json
          meeting_id: string
          mentor_sentiment: string | null
          next_review_focus: string | null
          raw_json: Json | null
          risks: Json
          transcript_id: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          created_at?: string
          founder_id: string
          goals?: Json
          id?: string
          kpis?: Json
          meeting_id: string
          mentor_sentiment?: string | null
          next_review_focus?: string | null
          raw_json?: Json | null
          risks?: Json
          transcript_id: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          created_at?: string
          founder_id?: string
          goals?: Json
          id?: string
          kpis?: Json
          meeting_id?: string
          mentor_sentiment?: string | null
          next_review_focus?: string | null
          raw_json?: Json | null
          risks?: Json
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_kpi_goals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "mentor_kpi_goals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_kpi_goals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "biweekly_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_kpi_goals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "mentor_kpi_goals_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "meeting_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_observations: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          mentor_id: string
          notes: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          mentor_id: string
          notes: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          mentor_id?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_observations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "mentor_observations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          availability: string | null
          created_at: string
          domain: string | null
          email: string | null
          id: string
          meetings_count: number | null
          name: string
          notes: string | null
          organisation: string | null
          rating: number | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          meetings_count?: number | null
          name: string
          notes?: string | null
          organisation?: string | null
          rating?: number | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          domain?: string | null
          email?: string | null
          id?: string
          meetings_count?: number | null
          name?: string
          notes?: string | null
          organisation?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      monthly_submissions: {
        Row: {
          active_users: number | null
          assumptions_invalidated: string | null
          biggest_failure: string | null
          biggest_learning: string | null
          demo_link: string | null
          features_built: string | null
          founder_id: string
          id: string
          interviews_conducted: number | null
          iterations_completed: number | null
          key_learnings: string | null
          month_number: number
          partnerships: number | null
          pilots: number | null
          revenue: number | null
          submitted_at: string
          total_users: number | null
          what_changed: string | null
          year: number
        }
        Insert: {
          active_users?: number | null
          assumptions_invalidated?: string | null
          biggest_failure?: string | null
          biggest_learning?: string | null
          demo_link?: string | null
          features_built?: string | null
          founder_id: string
          id?: string
          interviews_conducted?: number | null
          iterations_completed?: number | null
          key_learnings?: string | null
          month_number: number
          partnerships?: number | null
          pilots?: number | null
          revenue?: number | null
          submitted_at?: string
          total_users?: number | null
          what_changed?: string | null
          year: number
        }
        Update: {
          active_users?: number | null
          assumptions_invalidated?: string | null
          biggest_failure?: string | null
          biggest_learning?: string | null
          demo_link?: string | null
          features_built?: string | null
          founder_id?: string
          id?: string
          interviews_conducted?: number | null
          iterations_completed?: number | null
          key_learnings?: string | null
          month_number?: number
          partnerships?: number | null
          pilots?: number | null
          revenue?: number | null
          submitted_at?: string
          total_users?: number | null
          what_changed?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_submissions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "monthly_submissions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_documents: {
        Row: {
          created_at: string
          file_path: string | null
          founder_id: string
          id: string
          kind: string
          mime: string | null
          notes: string | null
          questionnaire_id: string
          section: string
          size_bytes: number | null
          title: string
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          founder_id: string
          id?: string
          kind: string
          mime?: string | null
          notes?: string | null
          questionnaire_id: string
          section: string
          size_bytes?: number | null
          title: string
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string | null
          founder_id?: string
          id?: string
          kind?: string
          mime?: string | null
          notes?: string | null
          questionnaire_id?: string
          section?: string
          size_bytes?: number | null
          title?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_documents_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "onboarding_documents_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_documents_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "onboarding_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_questionnaires: {
        Row: {
          created_at: string
          current_stage: string | null
          customers: Json
          financials: Json
          founder_id: string
          id: string
          market: Json
          moat: Json
          next_90_days: Json
          process: Json
          product: Json
          revenue: Json
          risks: Json
          submitted_at: string | null
          submitted_by: string | null
          team: Json
          traction: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: string | null
          customers?: Json
          financials?: Json
          founder_id: string
          id?: string
          market?: Json
          moat?: Json
          next_90_days?: Json
          process?: Json
          product?: Json
          revenue?: Json
          risks?: Json
          submitted_at?: string | null
          submitted_by?: string | null
          team?: Json
          traction?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: string | null
          customers?: Json
          financials?: Json
          founder_id?: string
          id?: string
          market?: Json
          moat?: Json
          next_90_days?: Json
          process?: Json
          product?: Json
          revenue?: Json
          risks?: Json
          submitted_at?: string | null
          submitted_by?: string | null
          team?: Json
          traction?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_questionnaires_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "onboarding_questionnaires_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch: string | null
          campus: string | null
          created_at: string
          email: string | null
          founder_id: string | null
          full_name: string
          id: string
          semester: string | null
        }
        Insert: {
          batch?: string | null
          campus?: string | null
          created_at?: string
          email?: string | null
          founder_id?: string | null
          full_name?: string
          id: string
          semester?: string | null
        }
        Update: {
          batch?: string | null
          campus?: string | null
          created_at?: string
          email?: string | null
          founder_id?: string | null
          full_name?: string
          id?: string
          semester?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "profiles_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      program_calendar_days: {
        Row: {
          day: string
          holiday_name: string | null
          is_holiday: boolean
          is_weekend: boolean
        }
        Insert: {
          day: string
          holiday_name?: string | null
          is_holiday?: boolean
          is_weekend: boolean
        }
        Update: {
          day?: string
          holiday_name?: string | null
          is_holiday?: boolean
          is_weekend?: boolean
        }
        Relationships: []
      }
      program_holidays: {
        Row: {
          holiday_date: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          holiday_date: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          holiday_date?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      program_mentors: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          rotation_order: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          rotation_order: number
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          rotation_order?: number
        }
        Relationships: []
      }
      simulations: {
        Row: {
          created_at: string
          evidence_url: string | null
          faculty_comments: string | null
          founder_id: string
          id: string
          name: string
          rank: number | null
          score: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          faculty_comments?: string | null
          founder_id: string
          id?: string
          name: string
          rank?: number | null
          score?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          faculty_comments?: string | null
          founder_id?: string
          id?: string
          name?: string
          rank?: number | null
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "simulations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_dossier_versions: {
        Row: {
          created_at: string
          founder_id: string
          generated_at: string
          generated_by: string | null
          id: string
          markdown: string | null
          markdown_storage_path: string | null
          model: string | null
          sections: Json
          source_summary: Json | null
          version: number
        }
        Insert: {
          created_at?: string
          founder_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          markdown?: string | null
          markdown_storage_path?: string | null
          model?: string | null
          sections?: Json
          source_summary?: Json | null
          version: number
        }
        Update: {
          created_at?: string
          founder_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          markdown?: string | null
          markdown_storage_path?: string | null
          model?: string | null
          sections?: Json
          source_summary?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "startup_dossier_versions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "startup_dossier_versions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_dossiers: {
        Row: {
          created_at: string
          founder_id: string
          generated_at: string
          generated_by: string | null
          id: string
          markdown: string | null
          markdown_storage_path: string | null
          model: string | null
          sections: Json
          source_summary: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          founder_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          markdown?: string | null
          markdown_storage_path?: string | null
          model?: string | null
          sections?: Json
          source_summary?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          founder_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          markdown?: string | null
          markdown_storage_path?: string | null
          model?: string | null
          sections?: Json
          source_summary?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "startup_dossiers_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "startup_dossiers_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      student_allowlist: {
        Row: {
          created_at: string
          email: string
          founder_id: string | null
          student_name: string
        }
        Insert: {
          created_at?: string
          email: string
          founder_id?: string | null
          student_name: string
        }
        Update: {
          created_at?: string
          email?: string
          founder_id?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_allowlist_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "student_allowlist_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_packets: {
        Row: {
          assumptions_invalidated: string | null
          created_at: string
          founder_id: string
          id: string
          locked: boolean
          month: number
          next_steps: string | null
          submitted_at: string | null
          summary: string | null
          updated_at: string
          what_changed: string | null
          what_failed: string | null
          what_worked: string | null
        }
        Insert: {
          assumptions_invalidated?: string | null
          created_at?: string
          founder_id: string
          id?: string
          locked?: boolean
          month: number
          next_steps?: string | null
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          what_changed?: string | null
          what_failed?: string | null
          what_worked?: string | null
        }
        Update: {
          assumptions_invalidated?: string | null
          created_at?: string
          founder_id?: string
          id?: string
          locked?: boolean
          month?: number
          next_steps?: string | null
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          what_changed?: string | null
          what_failed?: string | null
          what_worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_packets_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "submission_packets_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_trackers: {
        Row: {
          created_at: string
          customers_spoken: number | null
          experiments: number | null
          failures: string | null
          features_shipped: number | null
          founder_id: string
          hours_worked: number | null
          id: string
          learning: string | null
          meetings: number | null
          revenue: number | null
          roadblocks: string | null
          support_needed: string | null
          users_acquired: number | null
          week_start: string
        }
        Insert: {
          created_at?: string
          customers_spoken?: number | null
          experiments?: number | null
          failures?: string | null
          features_shipped?: number | null
          founder_id: string
          hours_worked?: number | null
          id?: string
          learning?: string | null
          meetings?: number | null
          revenue?: number | null
          roadblocks?: string | null
          support_needed?: string | null
          users_acquired?: number | null
          week_start: string
        }
        Update: {
          created_at?: string
          customers_spoken?: number | null
          experiments?: number | null
          failures?: string | null
          features_shipped?: number | null
          founder_id?: string
          hours_worked?: number | null
          id?: string
          learning?: string | null
          meetings?: number | null
          revenue?: number | null
          roadblocks?: string | null
          support_needed?: string | null
          users_acquired?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_trackers_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founder_meeting_assignments"
            referencedColumns: ["founder_id"]
          },
          {
            foreignKeyName: "weekly_trackers_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      founder_meeting_assignments: {
        Row: {
          cycle_number: number | null
          founder_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          mentor_id: string | null
          mentor_name: string | null
          startup_name: string | null
          submit_deadline: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_founder: {
        Args: { _founder_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "faculty" | "mentor" | "student" | "leadership"
      committee_level: "founder_self" | "ai" | "faculty" | "mentor" | "board"
      event_role: "attendee" | "presenter" | "winner" | "volunteer"
      evidence_category: "customer" | "product" | "business" | "behavior"
      evidence_kind: "file" | "link"
      lifecycle_stage:
        | "idea"
        | "discovery"
        | "validation"
        | "mvp"
        | "pilot"
        | "revenue"
        | "growth"
        | "fundraising"
      lifecycle_status:
        | "active"
        | "paused"
        | "pivoted"
        | "merged"
        | "acquired"
        | "closed"
      recommendation:
        | "continue"
        | "continue_monitoring"
        | "probation"
        | "return_to_academic"
      review_decision: "approve" | "reject" | "edit" | "resubmit" | "pending"
      review_status: "green" | "yellow" | "red"
      startup_stage:
        | "idea"
        | "validation"
        | "mvp"
        | "pilot"
        | "revenue"
        | "scale"
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
      app_role: ["super_admin", "faculty", "mentor", "student", "leadership"],
      committee_level: ["founder_self", "ai", "faculty", "mentor", "board"],
      event_role: ["attendee", "presenter", "winner", "volunteer"],
      evidence_category: ["customer", "product", "business", "behavior"],
      evidence_kind: ["file", "link"],
      lifecycle_stage: [
        "idea",
        "discovery",
        "validation",
        "mvp",
        "pilot",
        "revenue",
        "growth",
        "fundraising",
      ],
      lifecycle_status: [
        "active",
        "paused",
        "pivoted",
        "merged",
        "acquired",
        "closed",
      ],
      recommendation: [
        "continue",
        "continue_monitoring",
        "probation",
        "return_to_academic",
      ],
      review_decision: ["approve", "reject", "edit", "resubmit", "pending"],
      review_status: ["green", "yellow", "red"],
      startup_stage: ["idea", "validation", "mvp", "pilot", "revenue", "scale"],
    },
  },
} as const
