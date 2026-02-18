/**
 * Notes Feature Types
 */

export interface Note {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

export interface CreateNoteInput {
  content: string;
  user_id: string;
}
