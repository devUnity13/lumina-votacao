"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminModel = { id: string; name: string; city: string; images: string[]; votes?: number };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setModels(Array.isArray(result.models) ? result.models : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar as modelos.");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => { void loadModels(); }, [loadModels]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data.getAll("photos") as File[];
    try {
      const images: string[] = [];
      for (const file of files) {
        const upload = new FormData();
        upload.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", headers: { "x-admin-password": password }, body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        images.push(result.url);
      }
      const response = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ name: data.get("name"), city: data.get("city"), bio: data.get("bio"), images }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("Modelo publicada com sucesso.");
      await loadModels();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeModel(model: AdminModel) {
    if (!password) {
      setMessage("Informe a senha da organização antes de excluir.");
      return;
    }
    if (!window.confirm(`Excluir ${model.name}? Os votos e as fotos dessa modelo também serão apagados.`)) return;
    setDeletingId(model.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/models", {
        method: "DELETE",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ id: model.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setModels((current) => current.filter((item) => item.id !== model.id));
      setMessage(result.warning || `${model.name} foi excluída com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao excluir a modelo.");
    } finally {
      setDeletingId(null);
    }
  }

  return <main className="admin-page">
    <a href="/" className="admin-back">← Voltar para a votação</a>
    <section className="admin-panel">
      <p className="eyebrow">Área da organização</p><h1>Nova finalista</h1>
      <p>Cadastre a modelo e envie as imagens que irão compor o carrossel.</p>
      <form onSubmit={submit}>
        <label>Senha da organização<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <div className="admin-row"><label>Nome completo<input name="name" required /></label><label>Cidade / Estado<input name="city" required /></label></div>
        <label>Apresentação<textarea name="bio" rows={4} required /></label>
        <label>Fotos do carrossel<input name="photos" type="file" accept="image/*" multiple required /><small>JPG, PNG ou WebP. Até 4 MB por foto.</small></label>
        <button className="primary-button full" disabled={busy}>{busy ? "Publicando…" : "Publicar finalista"}</button>
      </form>
      {message && <p className="admin-message" role="status">{message}</p>}
    </section>
    <section className="admin-panel manage-panel">
      <p className="eyebrow">Finalistas publicadas</p><h2>Gerenciar modelos</h2>
      <p>A exclusão também remove os votos associados e as fotos enviadas para o evento.</p>
      {loadingModels ? <p className="empty-state">Carregando…</p> : models.length === 0 ? <p className="empty-state">Nenhuma modelo publicada.</p> : <div className="model-list">
        {models.map((model) => <article className="model-item" key={model.id}>
          {model.images?.[0] ? <img src={model.images[0]} alt="" /> : <div className="image-placeholder" />}
          <div><strong>{model.name}</strong><span>{model.city}</span><small>{model.votes || 0} votos</small></div>
          <button type="button" className="delete-button" disabled={deletingId !== null} onClick={() => void removeModel(model)}>{deletingId === model.id ? "Excluindo…" : "Excluir"}</button>
        </article>)}
      </div>}
    </section>
    <style jsx>{`.admin-page{min-height:100vh;background:#eee9df;padding:40px 20px}.admin-back{display:block;max-width:760px;margin:0 auto 25px;font-size:12px}.admin-panel{max-width:760px;margin:0 auto 28px;background:#faf8f3;padding:clamp(30px,6vw,70px);border:1px solid rgba(17,16,15,.15)}h1{font-size:70px;line-height:.9;margin:8px 0 18px}h2{font-size:42px;line-height:1;margin:8px 0 18px}.admin-panel>p:not(.eyebrow):not(.admin-message){color:#706a61;margin-bottom:35px}form,label{display:grid;gap:8px}form{gap:22px}label{font-size:11px;text-transform:uppercase;letter-spacing:.12em}.admin-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}input,textarea{width:100%;border:1px solid rgba(17,16,15,.2);background:#fff;padding:14px;font:14px var(--font-sans);text-transform:none;letter-spacing:normal}small{color:#777;text-transform:none;letter-spacing:normal}.admin-message{text-align:center;font-size:13px;margin:22px 0 0}.manage-panel{padding-top:48px}.model-list{display:grid;border-top:1px solid rgba(17,16,15,.13)}.model-item{display:grid;grid-template-columns:72px 1fr auto;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid rgba(17,16,15,.13)}.model-item img,.image-placeholder{width:72px;height:86px;object-fit:cover;background:#ddd}.model-item div{display:grid;gap:4px}.model-item strong{font:24px var(--font-serif)}.model-item span{font-size:12px;color:#706a61}.delete-button{border:1px solid #8d2e27;background:transparent;color:#8d2e27;padding:11px 16px;cursor:pointer}.delete-button:hover:not(:disabled){background:#8d2e27;color:#fff}.delete-button:disabled{opacity:.55;cursor:not-allowed}.empty-state{color:#706a61}@media(max-width:600px){.admin-row{grid-template-columns:1fr}h1{font-size:54px}.model-item{grid-template-columns:56px 1fr}.model-item img,.image-placeholder{width:56px;height:70px}.delete-button{grid-column:1/-1}.model-item strong{font-size:21px}}`}</style>
  </main>;
}
