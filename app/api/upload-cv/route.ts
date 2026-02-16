import { NextResponse } from 'next/server';
import { saveAnswers } from '@/lib/session';
import { getSupabaseAdmin } from '@/lib/supabase';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx']);
const BUCKET = 'cv_uploads';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = String(formData.get('sessionId') ?? '').trim();
    const file = formData.get('file');

    if (!sessionId || !(file instanceof File)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const path = `${sessionId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    });

    if (error) {
      console.error('upload-cv: supabase upload error', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    await saveAnswers(sessionId, { cv_file_path: path });

    return NextResponse.json({ path });
  } catch (error) {
    console.error('upload-cv failed', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
