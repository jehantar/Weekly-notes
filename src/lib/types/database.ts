export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      weeks: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          week_id: string;
          day_of_week: number;
          title: string;
          sort_order: number;
          granola_note_id: string | null;
          granola_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          day_of_week: number;
          title: string;
          sort_order?: number;
          granola_note_id?: string | null;
          granola_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_id?: string;
          day_of_week?: number;
          title?: string;
          sort_order?: number;
          granola_note_id?: string | null;
          granola_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          week_id: string;
          day_of_week: number;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          day_of_week: number;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_id?: string;
          day_of_week?: number;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          status: TaskStatus;
          priority: number;
          sort_order: number;
          description: string | null;
          meeting_id: string | null;
          meeting_title: string | null;
          meeting_week_start: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          status?: TaskStatus;
          priority?: number;
          sort_order?: number;
          description?: string | null;
          meeting_id?: string | null;
          meeting_title?: string | null;
          meeting_week_start?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          status?: TaskStatus;
          priority?: number;
          sort_order?: number;
          description?: string | null;
          meeting_id?: string | null;
          meeting_title?: string | null;
          meeting_week_start?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      granola_tokens: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string | null;
          token_type: string;
          expires_at: string | null;
          scope: string | null;
          client_id: string | null;
          client_secret: string | null;
          code_verifier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token?: string | null;
          token_type?: string;
          expires_at?: string | null;
          scope?: string | null;
          client_id?: string | null;
          client_secret?: string | null;
          code_verifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_type?: string;
          expires_at?: string | null;
          scope?: string | null;
          client_id?: string | null;
          client_secret?: string | null;
          code_verifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_all: {
        Args: {
          search_query: string;
          user_id_param: string;
        };
        Returns: {
          item_type: string;
          item_id: string;
          week_id: string | null;
          week_start: string | null;
          day_of_week: number | null;
          content: string;
          rank: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Week = Database["public"]["Tables"]["weeks"]["Row"];
export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type GranolaToken = Database["public"]["Tables"]["granola_tokens"]["Row"];
