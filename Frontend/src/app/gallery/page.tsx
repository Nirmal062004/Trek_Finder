'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/Gallery.module.css';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Video, Image as ImageIcon, X, Upload, PenTool, ArrowLeft, Trash2, MapPin } from 'lucide-react';
import { defaultCommunities, getIconByKey, Community } from '@/shared/services/communityData';
import { createPortal } from 'react-dom';
import Navigation from '@/components/Navigation';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

import { galleryStates, TrekState, MediaItem, District } from '@/shared/data/galleryData';


const Gallery: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.name || (typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Anonymous' : 'Anonymous');
  const userEmail = user?.email || (typeof window !== 'undefined' ? localStorage.getItem('userEmail') || '' : '');
  const [userStories, setUserStories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchUserStories = async () => {
    try {
      if (!supabase) return;
      const email = userEmail || '';
      if (!email) {
        setUserStories([]);
        return;
      }
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_email', email);
      if (error) throw error;
      setUserStories(data || []);
    } catch (err) {
      console.warn('Could not fetch user stories:', err);
    }
  };

  useEffect(() => {
    fetchUserStories();
  }, [userEmail]);

  const handleEditStory = (story: any) => {
    setEditingId(story.id);
    setFormTitle(story.title || '');
    setFormState(story.state || '');
    setFormDistrict(story.district || '');
    setFormTrekName(story.trek_name || '');
    setFormCommunity(story.community || '');
    setFormDescription(story.description || '');
    setFormPreview(story.media_url || null);
    setIsContributeOpen(true);
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Delete this story? This cannot be undone.')) return;
    try {
      // First get the path
      const { data: existing, error: selErr } = await supabase.from('stories').select('storage_path').eq('id', id).single();

      if (selErr) {
        console.error("Error finding story to delete:", selErr);
        // If row doesn't exist, we can't delete it.
        return;
      }

      // If we have a path, try to delete from storage
      if (existing?.storage_path) {
        const { error: storageError } = await supabase.storage.from('stories').remove([existing.storage_path]);
        if (storageError) {
          console.warn('Storage delete warning (continuing to DB delete):', storageError.message);
        }
      }

      // Finally delete the row
      const { error } = await supabase.from('stories').delete().eq('id', id);
      if (error) throw error;

      await fetchUserStories();
    } catch (err) {
      console.error('Delete failed', err);
      // alert('Failed to delete story'); // Removed alert for better UX, could use toast
    }
  };

  // Use imported states
  const states: TrekState[] = useMemo(() => galleryStates, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'explore' | 'my-stories'>('explore');
  const [contributionType, setContributionType] = useState<'media' | 'blog'>('media');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formTrekName, setFormTrekName] = useState('');
  const [formCommunity, setFormCommunity] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);

  const activeState = useMemo(
    () => states[currentIndex],
    [states, currentIndex]
  );
  const [activeDistrictId, setActiveDistrictId] = useState(
    activeState.districts?.[0]?.id || ''
  );

  useEffect(() => {
    if (scrollRef.current) {
      const activeCard = scrollRef.current.querySelector<HTMLElement>(
        `[data-index="${currentIndex}"]`
      );
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [currentIndex]);

  const goToNextState = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % states.length);
  }, [states.length]);

  const goToPrevState = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + states.length) % states.length);
  }, [states.length]);

  const handleStateClick = useCallback((displayIndex: number) => {
    setCurrentIndex(displayIndex);
  }, []);

  useEffect(() => {
    if (activeState.districts && activeState.districts.length > 0) {
      setActiveDistrictId(activeState.districts[0].id);
    } else {
      setActiveDistrictId('');
    }
  }, [activeState]);

  const activeDistrict = useMemo(
    () =>
      activeState.districts.find((district) => district.id === activeDistrictId) ||
      activeState.districts[0] || { id: '', name: '', media: [] },
    [activeState, activeDistrictId]
  );

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const closeMedia = () => {
    setSelectedMedia(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed for stories.');
        e.currentTarget.value = '';
        return;
      }
      setFormFile(file);
      setFormPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState || !formDistrict) return;

    try {
      // Enforce image-only on submit as well
      if (formFile && !formFile.type.startsWith('image/')) {
        alert('Only image files are allowed for stories.');
        return;
      }
      // Prepare storage upload if file present
      let mediaUrl: string | null = formPreview || null;
      let storagePath: string | null = null;

      if (formFile && supabase) {
        const safeName = `${Date.now()}-${formFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        storagePath = `stories/${userEmail || 'anon'}/${safeName}`;
        try {
          const { error: uploadErr } = await supabase.storage.from('stories').upload(storagePath, formFile as File, { cacheControl: '3600', upsert: false });
          if (uploadErr) {
            // If bucket is missing or other storage error, don't crash — fall back to using the preview URL
            console.warn('Supabase storage upload failed, falling back to preview URL:', uploadErr.message || uploadErr);
          } else {
            const { data: urlData } = supabase.storage.from('stories').getPublicUrl(storagePath);
            mediaUrl = urlData?.publicUrl || mediaUrl;
          }
        } catch (err) {
          console.warn('Storage upload skipped due to error:', err);
        }
      }

      const payload: any = {
        title: formTitle || formTrekName || 'Untitled',
        state: formState,
        district: formDistrict,
        trek_name: formTrekName || null,
        community: formCommunity || null,
        community_name: defaultCommunities.find((c: Community) => c.iconKey === formCommunity)?.name || null,
        description: formDescription || null,
        media_url: mediaUrl,
        media_type: formFile ? (formFile.type.startsWith('video') ? 'video' : 'image') : 'image',
        user_name: userName,
        user_email: userEmail || null,
        storage_path: storagePath,
      };

      if (editingId) {
        const { error } = await supabase.from('stories').update(payload).eq('id', editingId);
        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase.from('stories').insert([payload]);
        if (error) throw error;
      }

      // reset
      setFormTitle('');
      setFormState('');
      setFormDistrict('');
      setFormTrekName('');
      setFormCommunity('');
      setFormDescription('');
      setFormFile(null);
      setFormPreview(null);
      setIsContributeOpen(false);

      await fetchUserStories();
    } catch (err) {
      console.error('Error saving story:', err);
      alert('Failed to save story');
    }
  };


  if (isContributeOpen) {
    return (
      <div className={styles['story-mode-container']}>
        <div className={styles['story-content-wrapper']}>
          <div className={styles['preview-section']}>
            <button
              className={styles['story-back-btn']}
              onClick={() => setIsContributeOpen(false)}
            >
              <ArrowLeft size={20} /> Back to Gallery
            </button>

            <div className={styles['preview-card']}>
              <div className={styles['preview-image-placeholder']}>
                {formPreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Image src={formPreview} alt="Preview" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                ) : (
                  <span>Add a photo</span>
                )}
              </div>
              <div className={styles['preview-caption-area']}>
                <div className={styles['preview-title']}>
                  {formTitle || "Your Story Title"}
                </div>
                <div className={styles['preview-location']}>
                  {formTrekName || "Location"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles['story-form-container']}>
            <div className={styles['story-form-header']}>
              <h2 className={styles['story-form-title']}>Share Your Adventure</h2>
              <p className={styles['story-form-subtitle']}>
                Inspire others with your journey.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Title</label>
                <input
                  className={styles['minimal-input']}
                  type="text"
                  placeholder="Give your story a catchy title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className={styles['input-group']}>
                  <label className={styles['input-label']}>State</label>
                  <select
                    className={styles['minimal-input']}
                    value={formState}
                    onChange={(e) => {
                      setFormState(e.target.value);
                      setFormDistrict('');
                    }}
                    required
                  >
                    <option value="" style={{ color: '#000' }}>Select State</option>
                    {states.map(s => (
                      <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles['input-group']}>
                  <label className={styles['input-label']}>District</label>
                  <input
                    className={styles['minimal-input']}
                    type="text"
                    placeholder="District Name"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    disabled={!formState}
                    required
                  />
                </div>
              </div>

              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Trek / Spot Name</label>
                <input
                  className={styles['minimal-input']}
                  type="text"
                  placeholder="Where did you go?"
                  value={formTrekName}
                  onChange={(e) => setFormTrekName(e.target.value)}
                  required
                />
              </div>

              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Community Tag (Optional)</label>
                <select
                  className={styles['minimal-input']}
                  value={formCommunity}
                  onChange={(e) => setFormCommunity(e.target.value)}
                >
                  <option value="" style={{ color: '#000' }}>None</option>
                  {defaultCommunities.map((c: Community) => (
                    <option key={c.id} value={c.iconKey} style={{ color: '#000' }}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Your Story</label>
                <textarea
                  className={styles['minimal-textarea']}
                  placeholder="Tell us about the trail, the view, the feeling..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                ></textarea>
              </div>

              <div className={styles['input-group']}>
                <label className={styles['input-label']}>Photo (one image)</label>
                <div className={styles['upload-zone']} onClick={() => document.getElementById('story-file')?.click()}>
                  <Upload size={32} color="#2bff88" />
                  <p style={{ marginTop: '10px', color: '#ccc' }}>Click to upload one image (JPEG/PNG)</p>
                  <input
                    id="story-file"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <button type="submit" className={styles['publish-btn']}>
                Publish Story
              </button>

            </form>
          </div>
        </div>
      </div>
    );
  }
  return (
    <section className={styles['gallery-section']}>
      <div className={styles['gallery-container']}>
        <div className={styles['gallery-header']}>
          <h2 className={styles['gallery-title']}>Trek Gallery</h2>
          <p className={styles['gallery-subtitle']}>
            Pick a state, then explore districts with popular trek photos and videos.
            <br />
            Join the community by sharing your own memories!
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setViewMode('explore')}
              style={{
                background: viewMode === 'explore' ? '#2bff88' : 'transparent',
                color: viewMode === 'explore' ? '#000' : '#fff',
                border: '1px solid #2bff88',
                padding: '10px 24px',
                borderRadius: '24px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                opacity: viewMode === 'explore' ? 1 : 0.7
              }}
            >
              Explore Gallery
            </button>
            <button
              onClick={() => { setViewMode('my-stories'); fetchUserStories(); }}
              style={{
                background: viewMode === 'my-stories' ? '#2bff88' : 'transparent',
                color: viewMode === 'my-stories' ? '#000' : '#fff',
                border: '1px solid #2bff88',
                padding: '10px 24px',
                borderRadius: '24px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                opacity: viewMode === 'my-stories' ? 1 : 0.7
              }}
            >
              My Stories {userStories.length > 0 && `(${userStories.length})`}
            </button>
          </div>

          <div className={styles['header-actions']} style={{ marginTop: 0 }}>
            <button
              className={styles['action-btn']}
              onClick={() => {
                setContributionType('blog');
                setFormTitle(''); setFormState(''); setFormDistrict(''); setFormTrekName(''); setFormCommunity(''); setFormDescription(''); setFormPreview(null); setFormFile(null); setEditingId(null);
                setIsContributeOpen(true);
              }}
              style={{ background: 'rgba(43, 255, 136, 0.1)', color: '#2bff88', border: '1px solid rgba(43, 255, 136, 0.3)' }}
            >
              <PenTool size={18} /> + Share New Story
            </button>
          </div>
        </div>

        {viewMode === 'explore' ? (
          <>

            <div className={styles['states-slider-wrapper']}>
              <button
                className={styles['arrow-btn']}
                onClick={goToPrevState}
                aria-label="Previous state"
              >
                <ChevronLeft size={24} />
              </button>

              <div
                className={styles['states-scroll']}
                aria-label="State selector"
                ref={scrollRef}
              >
                <div className={styles['states-track']} data-states-track="true">
                  {states.map((state, index) => (
                    <button
                      key={state.id}
                      className={`${styles['state-card']} ${index === currentIndex ? styles['active'] : ''}
                    `}
                      data-state-card="true"
                      data-index={index}
                      onClick={() => handleStateClick(index)}
                    >
                      <div className={styles['state-name']}>{state.name}</div>
                      <div className={styles['state-subtitle']}>{state.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={styles['arrow-btn']}
                onClick={goToNextState}
                aria-label="Next state"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className={styles['districts-panel']}>
              <div className={styles['panel-header']}>
                <h3 className={styles['panel-title']}>
                  {activeState.name} Districts
                </h3>
                <span className={styles['panel-hint']}>
                  Popular treks and spots
                </span>
              </div>
              <div className={styles['district-tabs']}>
                {activeState.districts.map((district) => (
                  <button
                    key={district.id}
                    className={`${styles['district-tab']} ${activeDistrictId === district.id ? styles.active : ''}
                  `}
                    onClick={() => setActiveDistrictId(district.id)}
                  >
                    {district.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles['media-grid']}>
              {activeDistrict.media.map((item) => (
                <div
                  key={item.id}
                  className={styles['media-card']}
                  onClick={() => handleMediaClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                  {item.type === 'image' ? (
                    <div style={{ position: 'relative', width: '100%', height: 220 }}>
                      <Image src={item.src} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                    </div>
                  ) : (
                    <video
                      className={styles['media-asset']}
                      src={item.src}
                      muted
                      loop
                      playsInline
                    />
                  )}
                  <div className={styles['media-overlay']}>
                    <div className={styles['media-title']}>{item.title}</div>
                    <div className={styles['media-location']}>{item.location}</div>
                    <span className={styles['media-tag']}>
                      {item.type === 'video' ? <><Video size={14} /> Video</> : <><ImageIcon size={14} /> Photo</>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 40, padding: 20 }}>
            {userStories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <ImageIcon size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <h3>No stories yet</h3>
                <p>Share your trekking adventures with the community!</p>
                <button
                  className={styles['action-btn']}
                  onClick={() => {
                    setContributionType('blog');
                    setFormTitle(''); setFormState(''); setFormDistrict(''); setFormTrekName(''); setFormCommunity(''); setFormDescription(''); setFormPreview(null); setFormFile(null); setEditingId(null);
                    setIsContributeOpen(true);
                  }}
                  style={{ background: '#2bff88', color: '#0d1810', border: 'none', margin: '20px auto', display: 'block' }}
                >
                  <PenTool size={18} /> Create Story
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {userStories.map(story => (
                  <div key={story.id} style={{ background: '#111', borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}>
                    <div
                      style={{ position: 'relative', height: 180, background: '#000', cursor: 'pointer' }}
                      onClick={() => setSelectedMedia({
                        id: story.id,
                        type: story.media_type || 'image',
                        src: story.mediaUrl || story.media_url,
                        title: story.title,
                        location: story.trek_name || story.district || '',
                        description: story.description
                      })}
                    >
                      {story.mediaUrl || story.media_url ? (
                        <img src={story.mediaUrl || story.media_url} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>No Media</div>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 12px 12px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                        <h4 style={{ color: '#fff', margin: 0, fontSize: 16 }}>{story.title}</h4>
                      </div>
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 }}>
                        {story.media_type === 'video' ? <Video size={14} color="#fff" /> : <ImageIcon size={14} color="#fff" />}
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {story.trek_name || story.district || 'Unknown Location'}
                      </div>
                      <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.4, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 36 }}>
                        {story.description || 'No description provided.'}
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleEditStory(story)}
                          style={{ flex: 1, padding: '8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          style={{ flex: 1, padding: '8px', background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMedia && createPortal(
        <div className={styles['modal-overlay']} onClick={closeMedia}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
            <button className={styles['modal-close']} onClick={closeMedia}>
              <X size={32} />
            </button>

            {selectedMedia.type === 'image' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={selectedMedia.src} alt={selectedMedia.title} fill style={{ objectFit: 'contain' }} unoptimized />
              </div>
            ) : (
              <video
                src={selectedMedia.src}
                className={styles['modal-media']}
                controls
                autoPlay
              />
            )}

            <div className={styles['modal-info']}>
              <h3 className={styles['modal-title']}>{selectedMedia.title}</h3>
              <p className={styles['modal-location']}>{selectedMedia.location}</p>

              {selectedMedia.communityName && (
                <div className={styles['modal-community']}>
                  {getIconByKey(selectedMedia.community)} <span>{selectedMedia.communityName}</span>
                </div>
              )}

              {selectedMedia.description && (
                <div className={styles['modal-description']}>
                  {selectedMedia.description}
                </div>
              )}

              <button
                className={styles['delete-story-btn']}
                onClick={() => {
                  alert("Story removed! (This is a demo, refreshing will restore it)");
                  closeMedia();
                }}
              >
                <Trash2 size={16} /> Remove Story
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Form replaced by Story Mode Page */}
    </section>
  );
};

export default Gallery;