import React, { useEffect, useState } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function MyStories() {
  const { user } = useAuth();
  const userEmail = user?.email || (typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '');
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('stories').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
      if (error) throw error;
      setStories(data || []);
    } catch (err) {
      console.warn('Failed to load stories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) fetchStories();
  }, [userEmail]);

  const handleEdit = async (s: any) => {
    const newTitle = window.prompt('Edit title', s.title || '');
    if (newTitle === null) return;
    const newDesc = window.prompt('Edit description', s.description || '');
    if (newDesc === null) return;
    try {
      const { error } = await supabase.from('stories').update({ title: newTitle, description: newDesc }).eq('id', s.id);
      if (error) throw error;
      await fetchStories();
      alert('Updated');
    } catch (err) {
      console.error(err);
      alert('Update failed');
    }
  };

  const handleDelete = async (s: any) => {
    if (!confirm('Delete this story?')) return;
    try {
      if (s.storage_path) {
        await supabase.storage.from('stories').remove([s.storage_path]);
      }
      const { error } = await supabase.from('stories').delete().eq('id', s.id);
      if (error) throw error;
      await fetchStories();
      alert('Deleted');
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ color: '#fff' }}>My Stories</h3>
      {loading && <div style={{ color: '#ccc' }}>Loading...</div>}
      {!loading && stories.length === 0 && <div style={{ color: '#888' }}>No stories yet.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
        {stories.map((s) => (
          <div key={s.id} style={{ background: 'rgba(13,24,16,0.7)', padding: 12, borderRadius: 8 }}>
            <div style={{ height: 140, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {s.media_url ? <img src={s.media_url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#777' }}>No media</div>}
            </div>
            <div style={{ color: '#fff', fontWeight: 700, marginTop: 8 }}>{s.title}</div>
            <div style={{ color: '#bbb', fontSize: 13, marginTop: 6 }}>{s.trek_name || `${s.district}, ${s.state}`}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => handleEdit(s)} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(43,255,136,0.08)', border: '1px solid rgba(43,255,136,0.12)', color: '#2bff88' }}>Edit</button>
              <button onClick={() => handleDelete(s)} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.12)', color: '#ff6b5b' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
