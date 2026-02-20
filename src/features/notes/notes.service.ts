/**
 * Notes Service
 * Encapsulates all Supabase logic for notes feature
 */

import { getSupabaseClient, RealtimeChannel } from "../../lib/supabase";
import type { CreateNoteInput, Note } from "./notes.types";

let channel: RealtimeChannel | null = null;

/**
 * Create a new note
 * Inserts note into Supabase and broadcasts to realtime channel
 */
export async function createNote(
  content: string,
  userId: string
): Promise<Note> {
  const supabase = getSupabaseClient();

  const newNote: CreateNoteInput = {
    content,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("notes")
    .insert(newNote)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create note: ${error.message}`);
  }

  // Broadcast to realtime channel
  const realtimeChannel = supabase.channel("notes");
  await realtimeChannel.send({
    type: "broadcast",
    event: "note_inserted",
    payload: data,
  });

  return data as Note;
}

/**
 * Subscribe to realtime notes updates
 * Listens for new notes via broadcast events
 */
export function subscribeToNotes(onInsert: (note: Note) => void): void {
  const supabase = getSupabaseClient();

  channel = supabase.channel("notes");

  channel
    .on("broadcast", { event: "note_inserted" }, ({ payload }) => {
      onInsert(payload as Note);
    })
    .subscribe();
}

/**
 * Unsubscribe from realtime notes
 * Cleanup function for component unmount
 */
export async function unsubscribeFromNotes(): Promise<void> {
  if (channel) {
    await channel.unsubscribe();
    channel = null;
  }
}

/**
 * Fetch all notes for current user
 */
export async function fetchNotes(userId: string): Promise<Note[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  return (data as Note[]) || [];
}
