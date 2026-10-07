import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from './supabase';

import { assetCategories as categories, categoryLabel } from './categories';
const empty = { title: '', kind: 'lut', category: 'Filmové', description: '', format: '', software: '', image_url: '', download_url: '', featured: false };
export function assetPayload(form) {
  const data = Object.fromEntries(Object.keys(empty).map(key => [key, typeof form[key] === 'string' ? form[key].trim() : form[key]]));
  if (!data.title || data.title.length > 120 || !data.format || !data.software) throw new Error('Enter a title (up to 120 characters), file format and supported apps.');
  if (!['lut', 'preset'].includes(data.kind) || !categories.includes(data.category)) throw new Error('Choose a valid type and category.');
  let image, download;
  try { image = new URL(data.image_url); if (data.download_url) download = new URL(data.download_url); } catch { throw new Error('Enter valid preview and download URLs.'); }
  if (image.protocol !== 'https:') throw new Error('The preview URL must start with https://.');
  if (download && (download.protocol !== 'https:' || download.hostname !== 'drive.google.com' || download.port || download.username || download.password)) throw new Error('The download must be an HTTPS URL on drive.google.com.');
  data.download_url = data.download_url || null;
  return data;
}
export default function Admin({ assets, onChange }) {
  const [editing, setEditing] = useState(null), [form, setForm] = useState(empty), [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const field = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  function edit(asset) { setEditing(asset?.id || 'new'); setForm(asset ? { ...empty, ...asset, download_url: asset.download_url || '' } : { ...empty }); setDeleting(null); setMessage(''); }
  async function save(event) {
    event.preventDefault(); if (busy) return; setMessage(''); setBusy(true); setFailed(false);
    try {
      const data = assetPayload(form);
      const request = editing === 'new' ? supabase.from('assets').insert(data) : supabase.from('assets').update(data).eq('id', editing);
      const { data: saved, error } = await request.select('id').single();
      if (error || !saved) throw new Error('Unable to save. Check your connection and admin permissions.');
      setEditing(null); setMessage('Item saved.'); onChange();
    } catch (error) { setFailed(true); setMessage(error.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (busy || !deleting) return; setBusy(true); setMessage(''); setFailed(false);
    try {
      const { data, error } = await supabase.from('assets').delete().eq('id', deleting.id).select('id').single();
      if (error || !data) throw new Error('Unable to delete. Check your connection and admin permissions.');
      setDeleting(null); setMessage('Item deleted.'); onChange();
    } catch (error) { setFailed(true); setMessage(error.message); } finally { setBusy(false); }
  }
  return <section id="admin" className="admin-panel">
    <div className="section-top"><div><div className="eyebrow muted">LIBRARY MANAGEMENT</div><h2>Admin<span>.</span></h2><p>Add and manage your LUTs and photo presets.</p></div><button className="button small" disabled={busy} onClick={() => edit(null)}><Plus size={16}/>Add item</button></div>
    {message && <p className={`notice ${failed ? 'error' : ''}`} role={failed ? 'alert' : 'status'}>{message}</p>}
    {editing && <form className="admin-form" onSubmit={save}><fieldset disabled={busy}>
      <h3>{editing === 'new' ? 'New item' : 'Edit item'}</h3>
      <div className="admin-fields">
        <label>Title<input required maxLength={120} value={form.title} onChange={e => field('title', e.target.value)}/></label>
        <label>Type<select value={form.kind} onChange={e => field('kind', e.target.value)}><option value="lut">Video LUT</option><option value="preset">Photo preset</option></select></label>
        <label>Category<select value={form.category} onChange={e => field('category', e.target.value)}>{categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
        <label>File format<input required placeholder=".CUBE / .XMP" value={form.format} onChange={e => field('format', e.target.value)}/></label>
        <label className="wide">Supported apps<input required placeholder="DaVinci Resolve, Premiere Pro…" value={form.software} onChange={e => field('software', e.target.value)}/></label>
        <label className="wide">Description<textarea value={form.description} onChange={e => field('description', e.target.value)}/></label>
        <label className="wide">Preview image URL<input type="url" required placeholder="https://…" value={form.image_url} onChange={e => field('image_url', e.target.value)}/></label>
        <label className="wide">Google Drive download URL (optional)<input type="url" placeholder="https://drive.google.com/file/d/…/view" value={form.download_url} onChange={e => field('download_url', e.target.value)}/><span className="muted">Set the Drive file to anyone with the link.</span></label>
        <label className="admin-check wide"><input type="checkbox" checked={form.featured} onChange={e => field('featured', e.target.checked)}/>Lucas Presets pick</label>
      </div><div className="admin-actions"><button className="button small" type="submit">{busy ? 'Saving…' : 'Save item'}</button><button className="text-button" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
    </fieldset></form>}
    {deleting && <div className="notice error" role="alert"><strong>Delete “{deleting.title}”?</strong><p>Its ratings and comments will also be deleted. The file on Google Drive will remain.</p><div className="admin-actions"><button className="button small danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Confirm deletion'}</button><button className="text-button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div></div>}
    <div className="admin-list">{assets.length ? assets.map(asset => <div className="admin-row" key={asset.id}><div><strong>{asset.title}</strong><span>{asset.kind === 'lut' ? 'Video LUT' : 'Photo preset'} · {categoryLabel(asset.category)}</span></div><div className="admin-actions"><button className="text-button" disabled={busy} onClick={() => edit(asset)} aria-label={`Edit ${asset.title}`}><Pencil size={16}/>Edit</button><button className="text-button" disabled={busy} onClick={() => { setDeleting(asset); setEditing(null); setMessage(''); }} aria-label={`Delete ${asset.title}`}><Trash2 size={16}/>Delete</button></div></div>) : <p className="muted">The library is empty. Add your first item.</p>}</div>
  </section>;
}
