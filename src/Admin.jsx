import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from './supabase';

const categories = ['Filmové', 'Příroda', 'Lifestyle', 'Cestování', 'Vintage'];
const empty = { title: '', kind: 'lut', category: 'Filmové', description: '', format: '', software: '', image_url: '', download_url: '', featured: false };
export function assetPayload(form) {
  const data = Object.fromEntries(Object.keys(empty).map(key => [key, typeof form[key] === 'string' ? form[key].trim() : form[key]]));
  if (!data.title || data.title.length > 120 || !data.format || !data.software) throw new Error('Vyplň název (nejvýše 120 znaků), formát a podporované programy.');
  if (!['lut', 'preset'].includes(data.kind) || !categories.includes(data.category)) throw new Error('Vyber platný typ a kategorii.');
  let image, download;
  try { image = new URL(data.image_url); if (data.download_url) download = new URL(data.download_url); } catch { throw new Error('Zadej platné adresy náhledu a stažení.'); }
  if (image.protocol !== 'https:') throw new Error('Odkaz na náhled musí začínat https://.');
  if (download && (download.protocol !== 'https:' || download.hostname !== 'drive.google.com' || download.port || download.username || download.password)) throw new Error('Stažení musí být HTTPS odkaz na drive.google.com.');
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
      if (error || !saved) throw new Error('Uložení se nezdařilo. Ověř připojení a admin oprávnění.');
      setEditing(null); setMessage('Položka byla uložena.'); onChange();
    } catch (error) { setFailed(true); setMessage(error.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (busy || !deleting) return; setBusy(true); setMessage(''); setFailed(false);
    try {
      const { data, error } = await supabase.from('assets').delete().eq('id', deleting.id).select('id').single();
      if (error || !data) throw new Error('Smazání se nezdařilo. Ověř připojení a admin oprávnění.');
      setDeleting(null); setMessage('Položka byla smazána.'); onChange();
    } catch (error) { setFailed(true); setMessage(error.message); } finally { setBusy(false); }
  }
  return <section id="admin" className="admin-panel">
    <div className="section-top"><div><div className="eyebrow muted">SPRÁVA KNIHOVNY</div><h2>Administrace<span>.</span></h2><p>Přidávej a upravuj své LUTy a foto presety.</p></div><button className="button small" disabled={busy} onClick={() => edit(null)}><Plus size={16}/>Přidat položku</button></div>
    {message && <p className={`notice ${failed ? 'error' : ''}`} role={failed ? 'alert' : 'status'}>{message}</p>}
    {editing && <form className="admin-form" onSubmit={save}><fieldset disabled={busy}>
      <h3>{editing === 'new' ? 'Nová položka' : 'Upravit položku'}</h3>
      <div className="admin-fields">
        <label>Název<input required maxLength={120} value={form.title} onChange={e => field('title', e.target.value)}/></label>
        <label>Typ<select value={form.kind} onChange={e => field('kind', e.target.value)}><option value="lut">Video LUT</option><option value="preset">Foto preset</option></select></label>
        <label>Kategorie<select value={form.category} onChange={e => field('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Formát<input required placeholder=".CUBE / .XMP" value={form.format} onChange={e => field('format', e.target.value)}/></label>
        <label className="wide">Podporované programy<input required placeholder="DaVinci Resolve, Premiere Pro…" value={form.software} onChange={e => field('software', e.target.value)}/></label>
        <label className="wide">Popis<textarea value={form.description} onChange={e => field('description', e.target.value)}/></label>
        <label className="wide">Odkaz na obrázek náhledu<input type="url" required placeholder="https://…" value={form.image_url} onChange={e => field('image_url', e.target.value)}/></label>
        <label className="wide">Odkaz na stažení z Google Drive (volitelný)<input type="url" placeholder="https://drive.google.com/file/d/…/view" value={form.download_url} onChange={e => field('download_url', e.target.value)}/><span className="muted">Soubor na Drive nastav jako dostupný každému s odkazem.</span></label>
        <label className="admin-check wide"><input type="checkbox" checked={form.featured} onChange={e => field('featured', e.target.checked)}/>Výběr FRAME</label>
      </div><div className="admin-actions"><button className="button small" type="submit">{busy ? 'Ukládám…' : 'Uložit položku'}</button><button className="text-button" type="button" onClick={() => setEditing(null)}>Zrušit</button></div>
    </fieldset></form>}
    {deleting && <div className="notice error" role="alert"><strong>Smazat „{deleting.title}“?</strong><p>Smažou se také její hodnocení a komentáře. Soubor na Google Drive zůstane.</p><div className="admin-actions"><button className="button small danger" disabled={busy} onClick={remove}>{busy ? 'Mažu…' : 'Potvrdit smazání'}</button><button className="text-button" disabled={busy} onClick={() => setDeleting(null)}>Zrušit</button></div></div>}
    <div className="admin-list">{assets.length ? assets.map(asset => <div className="admin-row" key={asset.id}><div><strong>{asset.title}</strong><span>{asset.kind === 'lut' ? 'Video LUT' : 'Foto preset'} · {asset.category}</span></div><div className="admin-actions"><button className="text-button" disabled={busy} onClick={() => edit(asset)} aria-label={`Upravit ${asset.title}`}><Pencil size={16}/>Upravit</button><button className="text-button" disabled={busy} onClick={() => { setDeleting(asset); setEditing(null); setMessage(''); }} aria-label={`Smazat ${asset.title}`}><Trash2 size={16}/>Smazat</button></div></div>) : <p className="muted">Knihovna je prázdná. Přidej první položku.</p>}</div>
  </section>;
}
