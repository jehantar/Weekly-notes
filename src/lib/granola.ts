const BASE_URL = "https://public-api.granola.ai";

// --- Types ---

export type GranolaNoteListItem = {
  id: string;
  title: string;
  created_at: string;
};

export type GranolaNoteDetail = {
  id: string;
  title: string;
  summary_text: string | null;
  created_at: string;
  calendar_event: {
    title: string;
    start_time: string;
    end_time: string;
  } | null;
};

type NotesListResponse = {
  notes: GranolaNoteListItem[];
  next_page_token?: string;
};

// --- API calls ---

export async function fetchNotesForRange(
  apiKey: string,
  afterDate: string,
  beforeDate: string
): Promise<GranolaNoteListItem[]> {
  const allNotes: GranolaNoteListItem[] = [];
  let url = `${BASE_URL}/v1/notes?created_after=${afterDate}&created_before=${beforeDate}&page_size=30`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Granola API error: ${res.status} ${res.statusText}`);
    }
    const data: NotesListResponse = await res.json();
    allNotes.push(...data.notes);

    if (data.next_page_token) {
      url = `${BASE_URL}/v1/notes?created_after=${afterDate}&created_before=${beforeDate}&page_size=30&page_token=${data.next_page_token}`;
    } else {
      url = "";
    }
  }

  return allNotes;
}

export async function fetchNoteDetail(
  apiKey: string,
  noteId: string
): Promise<GranolaNoteDetail> {
  const res = await fetch(`${BASE_URL}/v1/notes/${noteId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Granola API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Matching ---

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}
