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
      action_items: {
        Row: {
          id: string;
          week_id: string;
          day_of_week: number;
          content: string;
          is_done: boolean;
          priority: number;
          meeting_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          day_of_week: number;
          content: string;
          is_done?: boolean;
          priority?: number;
          meeting_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_id?: string;
          day_of_week?: number;
          content?: string;
          is_done?: boolean;
          priority?: number;
          meeting_id?: string | null;
          sort_order?: number;
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
          week_id: string;
          week_start: string;
          day_of_week: number;
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
export type ActionItem = Database["public"]["Tables"]["action_items"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
