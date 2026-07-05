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
      calendar_event_exclusions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          event_id: string
          id: string
          occurs_on: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          event_id: string
          id?: string
          occurs_on: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          event_id?: string
          id?: string
          occurs_on?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_exclusions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          end_time: string | null
          id: string
          location: string | null
          note: string | null
          recur_interval: number | null
          recur_month_day: number | null
          recur_semantics: string | null
          recur_unit: string | null
          recur_until: string | null
          recur_weekdays: number[] | null
          start_time: string | null
          starts_on: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          note?: string | null
          recur_interval?: number | null
          recur_month_day?: number | null
          recur_semantics?: string | null
          recur_unit?: string | null
          recur_until?: string | null
          recur_weekdays?: number[] | null
          start_time?: string | null
          starts_on: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          note?: string | null
          recur_interval?: number | null
          recur_month_day?: number | null
          recur_semantics?: string | null
          recur_unit?: string | null
          recur_until?: string | null
          recur_weekdays?: number[] | null
          start_time?: string | null
          starts_on?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      capture_jobs: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          error: string | null
          id: string
          kind: string
          raw_text: string | null
          result: Json | null
          reviewed_into: Json | null
          status: string
          storage_path: string | null
          store_id: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          error?: string | null
          id?: string
          kind: string
          raw_text?: string | null
          result?: Json | null
          reviewed_into?: Json | null
          status?: string
          storage_path?: string | null
          store_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          error?: string | null
          id?: string
          kind?: string
          raw_text?: string | null
          result?: Json | null
          reviewed_into?: Json | null
          status?: string
          storage_path?: string | null
          store_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capture_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      grocery_item_placements: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          grocery_item_id: string
          id: string
          section_id: string
          store_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          grocery_item_id: string
          id?: string
          section_id: string
          store_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          grocery_item_id?: string
          id?: string
          section_id?: string
          store_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_item_placements_grocery_item_id_fkey"
            columns: ["grocery_item_id"]
            isOneToOne: false
            referencedRelation: "grocery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_placements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "store_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_placements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_item_prices: {
        Row: {
          capture_job_id: string | null
          created_at: string
          created_by_user_id: string | null
          grocery_item_id: string
          id: string
          list_entry_id: string | null
          observed_on: string
          price: number
          source: string
          store_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          capture_job_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          grocery_item_id: string
          id?: string
          list_entry_id?: string | null
          observed_on?: string
          price: number
          source: string
          store_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          capture_job_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          grocery_item_id?: string
          id?: string
          list_entry_id?: string | null
          observed_on?: string
          price?: number
          source?: string
          store_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_item_prices_capture_job_fkey"
            columns: ["capture_job_id"]
            isOneToOne: false
            referencedRelation: "capture_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_prices_grocery_item_id_fkey"
            columns: ["grocery_item_id"]
            isOneToOne: false
            referencedRelation: "grocery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_prices_list_entry_id_fkey"
            columns: ["list_entry_id"]
            isOneToOne: false
            referencedRelation: "grocery_list_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_item_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_items: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          default_qty: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          emoji: string
          id: string
          name: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          default_qty?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          default_qty?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      grocery_list_entries: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          grocery_item_id: string
          id: string
          note: string | null
          purchased_at: string | null
          purchased_by_user_id: string | null
          purchased_price: number | null
          purchased_store_id: string | null
          qty: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          grocery_item_id: string
          id?: string
          note?: string | null
          purchased_at?: string | null
          purchased_by_user_id?: string | null
          purchased_price?: number | null
          purchased_store_id?: string | null
          qty?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          grocery_item_id?: string
          id?: string
          note?: string | null
          purchased_at?: string | null
          purchased_by_user_id?: string | null
          purchased_price?: number | null
          purchased_store_id?: string | null
          qty?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_entries_grocery_item_id_fkey"
            columns: ["grocery_item_id"]
            isOneToOne: false
            referencedRelation: "grocery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_entries_purchased_by_user_id_fkey"
            columns: ["purchased_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_entries_purchased_store_id_fkey"
            columns: ["purchased_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_event_attributes: {
        Row: {
          config: Json
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          event_type_id: string
          id: string
          label: string
          required: boolean
          sort_order: number
          system_key: string | null
          unit: string | null
          updated_at: string
          updated_by_user_id: string | null
          value_kind: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          event_type_id: string
          id?: string
          label: string
          required?: boolean
          sort_order?: number
          system_key?: string | null
          unit?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          value_kind: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          event_type_id?: string
          id?: string
          label?: string
          required?: boolean
          sort_order?: number
          system_key?: string | null
          unit?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          value_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_event_attributes_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "pet_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_event_types: {
        Row: {
          config: Json
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          emoji: string
          id: string
          name: string
          sort_order: number
          system_key: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name: string
          sort_order?: number
          system_key?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
          system_key?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      pet_event_values: {
        Row: {
          attribute_id: string
          choice_ids: Json | null
          created_at: string
          created_by_user_id: string | null
          event_id: string
          file_path: string | null
          id: string
          updated_at: string
          updated_by_user_id: string | null
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          attribute_id: string
          choice_ids?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          event_id: string
          file_path?: string | null
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          attribute_id?: string
          choice_ids?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          event_id?: string
          file_path?: string | null
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_event_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "pet_event_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_event_values_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "pet_events"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_events: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          done_by_user_id: string
          event_type_id: string
          id: string
          note: string | null
          occurred_at: string
          pet_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          done_by_user_id: string
          event_type_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          pet_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          done_by_user_id?: string
          event_type_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          pet_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_events_done_by_user_id_fkey"
            columns: ["done_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "pet_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birthday: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          id: string
          name: string
          photo_path: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          name: string
          photo_path?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          birthday?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          name?: string
          photo_path?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          created_by_user_id: string | null
          display_name: string
          id: string
          signature_color: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          created_by_user_id?: string | null
          display_name: string
          id: string
          signature_color?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          created_by_user_id?: string | null
          display_name?: string
          id?: string
          signature_color?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          created_by_user_id: string
          emoji: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          emoji: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          emoji?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      spend_categories: {
        Row: {
          color: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          emoji: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      spends: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          id: string
          note: string | null
          photo_path: string | null
          spent_by_user_id: string
          spent_on: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          note?: string | null
          photo_path?: string | null
          spent_by_user_id: string
          spent_on?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          note?: string | null
          photo_path?: string | null
          spent_by_user_id?: string
          spent_on?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spends_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "spend_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spends_spent_by_user_id_fkey"
            columns: ["spent_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sections: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          id: string
          name: string
          sort_order: number
          store_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          name: string
          sort_order?: number
          store_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          name?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_sections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          currency: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          emoji: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by_user_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          id: string
          logged_pet_event_id: string | null
          note: string | null
          task_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          completed_at?: string
          completed_by_user_id: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          logged_pet_event_id?: string | null
          note?: string | null
          task_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          completed_at?: string
          completed_by_user_id?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          id?: string
          logged_pet_event_id?: string | null
          note?: string | null
          task_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_logged_pet_event_id_fkey"
            columns: ["logged_pet_event_id"]
            isOneToOne: false
            referencedRelation: "pet_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          anchor_on: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          deleted_by_user_id: string | null
          emoji: string
          id: string
          log_pet_event_type_id: string | null
          note: string | null
          pet_id: string | null
          recur_interval: number | null
          recur_month_day: number | null
          recur_semantics: string | null
          recur_unit: string | null
          recur_until: string | null
          recur_weekdays: number[] | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          anchor_on: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          log_pet_event_type_id?: string | null
          note?: string | null
          pet_id?: string | null
          recur_interval?: number | null
          recur_month_day?: number | null
          recur_semantics?: string | null
          recur_unit?: string | null
          recur_until?: string | null
          recur_weekdays?: number[] | null
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          anchor_on?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          emoji?: string
          id?: string
          log_pet_event_type_id?: string | null
          note?: string | null
          pet_id?: string | null
          recur_interval?: number | null
          recur_month_day?: number | null
          recur_semantics?: string | null
          recur_unit?: string | null
          recur_until?: string | null
          recur_weekdays?: number[] | null
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_log_pet_event_type_id_fkey"
            columns: ["log_pet_event_type_id"]
            isOneToOne: false
            referencedRelation: "pet_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_check_off_grocery_entry: {
        Args: {
          p_entry_id: string
          p_price: number
          p_store_id: string
          p_user_id: string
        }
        Returns: string
      }
      fn_complete_task: {
        Args: {
          p_completed_at: string
          p_completed_by_user_id: string
          p_note: string
          p_task_id: string
          p_user_id: string
        }
        Returns: string
      }
      fn_latest_pet_events_per_type: {
        Args: { p_pet_id: string }
        Returns: {
          event_type_id: string
          occurred_at: string
        }[]
      }
      fn_log_pet_event: {
        Args: {
          p_done_by_user_id: string
          p_event_type_id: string
          p_note: string
          p_occurred_at: string
          p_pet_id: string
          p_user_id: string
          p_values: Json
        }
        Returns: string
      }
      fn_uncheck_grocery_entry: {
        Args: { p_entry_id: string; p_user_id: string }
        Returns: string
      }
      fn_undo_task_completion: {
        Args: { p_completion_id: string; p_user_id: string }
        Returns: string
      }
      fn_update_pet_event: {
        Args: {
          p_attribute_ids: string[]
          p_done_by_user_id: string
          p_event_id: string
          p_note: string
          p_occurred_at: string
          p_user_id: string
          p_values: Json
        }
        Returns: string
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
    Enums: {},
  },
} as const

