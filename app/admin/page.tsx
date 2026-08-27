"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminModel = { id: string; name: string; city: string; bio: string; images: string[]; votes?: number };
type View = "home" | "create" | "manage" | "edit" | "results";
type PhotoPreview = { file: File; url: string };
type EditPhoto = { url: string; file?: File };

const TOTAL_STEPS = 4;

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [view, setView] = useState<View>("home");
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [published, setPublished] = useState(false);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminModel | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [editTarget, setEditTarget] = useState<AdminModel | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhotos, setEditPhotos] = useState<EditPhoto[]>([]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const response = await fetch("/api/admin/models", { cache: "no-store", headers: { "x-admin-password": password } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setModels(Array.isArray(result.models) ? result.models : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar as modelos.");
    } finally {
      setLoadingModels(false);
    }
  }, [password]);

  useEffect(() => {
    if (view === "manage" || view === "results") void loadModels();
  }, [view, loadModels]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/auth", { method: "POST", headers: { "x-admin-password": loginPassword } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPassword(loginPassword);
      setLoginPassword("");
      setAuthorized(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Você não tem autorização para acessar esta área.");
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setView("create");
    setStep(1);
    setPublished(false);
    setMessage("");
  }

  function resetCreate() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    setName("");
    setBio("");
    setPhotos([]);
    setStep(1);
    setPublished(false);
    setMessage("");
  }

  function goHome() {
    if (view === "create") resetCreate();
    setView("home");
    setMessage("");
    setDeleteTarget(null);
    setDeletePassword("");
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  function selectPhotos(files: FileList | null) {
    if (!files) return;
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    const fileList = Array.from(files);
    const selected = fileList.slice(0, 3).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos(selected);
    setMessage(fileList.length > 3 ? "Você pode cadastrar no máximo três fotos por modelo." : "");
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const images: string[] = [];
      for (const photo of photos) {
        const upload = new FormData();
        upload.append("file", photo.file);
        const response = await fetch("/api/upload", { method: "POST", headers: { "x-admin-password": password }, body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        images.push(result.url);
      }
      const response = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ name, bio, images }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPublished(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao publicar a modelo.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(model: AdminModel) {
    setEditTarget(model);
    setEditName(model.name);
    setEditBio(model.bio);
    setEditPhotos(model.images.slice(0, 3).map((url) => ({ url })));
    setMessage("");
    setView("edit");
  }

  function selectEditPhotos(files: FileList | null) {
    if (!files) return;
    editPhotos.filter((photo) => photo.file).forEach((photo) => URL.revokeObjectURL(photo.url));
    const fileList = Array.from(files);
    setEditPhotos(fileList.slice(0, 3).map((file) => ({ file, url: URL.createObjectURL(file) })));
    setMessage(fileList.length > 3 ? "Você pode manter no máximo três fotos por modelo." : "");
  }

  function removeEditPhoto(index: number) {
    setEditPhotos((current) => {
      if (current[index].file) URL.revokeObjectURL(current[index].url);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget || editPhotos.length === 0 || editPhotos.length > 3) return;
    setBusy(true);
    setMessage("");
    try {
      const images: string[] = [];
      for (const photo of editPhotos) {
        if (!photo.file) {
          images.push(photo.url);
          continue;
        }
        const upload = new FormData();
        upload.append("file", photo.file);
        const uploadResponse = await fetch("/api/upload", { method: "POST", headers: { "x-admin-password": password }, body: upload });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error);
        images.push(uploadResult.url);
      }
      const response = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ id: editTarget.id, name: editName, bio: editBio, images }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      editPhotos.filter((photo) => photo.file).forEach((photo) => URL.revokeObjectURL(photo.url));
      setEditTarget(null);
      setView("manage");
      setMessage(result.warning || "As informações da modelo foram atualizadas. Os votos permaneceram inalterados.");
      await loadModels();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao editar a modelo.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteTarget) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/models", {
        method: "DELETE",
        headers: { "content-type": "application/json", "x-admin-password": deletePassword },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setModels((current) => current.filter((model) => model.id !== deleteTarget.id));
      setMessage(result.warning || `${deleteTarget.name} foi excluída com sucesso.`);
      setDeleteTarget(null);
      setDeletePassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao excluir a modelo.");
    } finally {
      setBusy(false);
    }
  }

  const rankedModels = [...models].sort((first, second) => (second.votes || 0) - (first.votes || 0));
  const totalVotes = rankedModels.reduce((total, model) => total + (model.votes || 0), 0);
  const highestVotes = Math.max(1, ...rankedModels.map((model) => model.votes || 0));

  return <main className="admin-page">
    <header className="admin-nav"><a href="/" className="brand">LUMINA<span>○</span></a>{authorized ? <button className="logout-button" onClick={() => { setAuthorized(false); setPassword(""); setView("home"); setMessage(""); }}>Sair do painel</button> : <a href="/">Ver votação</a>}</header>

    {!authorized && <section className="login-shell"><form className="login-card" onSubmit={login}><span className="lock-mark">L</span><p className="eyebrow">Área restrita</p><h1>Acesso da organização</h1><p>Digite a senha para cadastrar, editar ou excluir as modelos desta edição.</p><label>Senha da organização<input autoFocus type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Digite sua senha" required /></label>{message && <p className="form-message error-message" role="alert">{message}</p>}<button className="primary-button full" disabled={busy}>{busy ? "Verificando…" : "Entrar no painel"}</button><small>Se você não recebeu a senha da organização, não possui autorização para acessar esta área.</small></form></section>}

    {authorized && <>

    {view === "home" && <section className="admin-home">
      <div className="home-copy"><p className="eyebrow">Acesso administrativo</p><h1>O que você<br />deseja fazer?</h1><p>Cadastre uma nova participante ou gerencie as finalistas desta edição exclusiva de Mendes, RJ.</p></div>
      <div className="action-grid">
        <button className="action-card action-primary" onClick={openCreate}><span>01</span><strong>Cadastrar nova modelo</strong><small>Um passo de cada vez</small><i>→</i></button>
        <button className="action-card" onClick={() => { setView("manage"); setMessage(""); }}><span>02</span><strong>Gerenciar finalistas</strong><small>Edite ou exclua cadastros</small><i>→</i></button>
        <button className="action-card results-action" onClick={() => { setView("results"); setMessage(""); }}><span>03</span><strong>Acompanhar votação</strong><small>Resultados privados e somente leitura</small><i>→</i></button>
      </div>
    </section>}

    {view === "create" && <section className="wizard-shell">
      <button className="text-back" onClick={published ? goHome : () => step > 1 ? setStep(step - 1) : goHome}>← {step > 1 && !published ? "Voltar" : "Início"}</button>
      {!published && <div className="progress-wrap"><div className="progress-copy"><span>Etapa {step} de {TOTAL_STEPS}</span><span>{Math.round((step / TOTAL_STEPS) * 100)}%</span></div><div className="progress-track"><i style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} /></div></div>}

      {published ? <div className="wizard-card success-card"><span className="success-mark">✓</span><p className="eyebrow">Cadastro concluído</p><h2>{name} está no concurso</h2><p>O perfil já está publicado na votação de Mendes, RJ.</p><button className="primary-button full" onClick={() => { resetCreate(); }}>Cadastrar outra modelo</button><button className="secondary-button full" onClick={() => { resetCreate(); setView("manage"); }}>Gerenciar finalistas</button></div> : <>
        {step === 1 && <form className="wizard-card" onSubmit={next}><p className="eyebrow">Vamos começar</p><h2>Qual é o nome da modelo?</h2><p>Use o nome completo que aparecerá para o público.</p><label className="large-field">Nome completo<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Ana Clara Souza" required maxLength={80} /></label><div className="fixed-location"><span>Local desta edição</span><strong>Mendes, RJ</strong></div><button className="primary-button full">Continuar <span>→</span></button></form>}

        {step === 2 && <form className="wizard-card" onSubmit={next}><p className="eyebrow">Apresentação</p><h2>Conte um pouco sobre {name.split(" ")[0]}</h2><p>Escreva um texto curto e marcante para apresentar a modelo ao público.</p><label className="large-field"><span className="sr-only">Texto sobre a modelo</span><textarea autoFocus value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Fale sobre sua personalidade, trajetória e o que a torna especial…" rows={7} required maxLength={500} /></label><div className="character-count">{bio.length} / 500</div><button className="primary-button full">Continuar <span>→</span></button></form>}

        {step === 3 && <form className="wizard-card" onSubmit={next}><p className="eyebrow">Galeria da modelo</p><h2>Escolha até três fotos</h2><p>A primeira será a capa. Selecione de uma a três imagens de uma só vez.</p><label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectPhotos(event.target.files)} /><span>＋</span><strong>{photos.length ? "Trocar fotos" : "Selecionar fotos"}</strong><small>Máximo de 3 · JPG, PNG ou WebP · até 4 MB cada</small></label>{photos.length > 0 && <div className="photo-previews">{photos.map((photo, index) => <figure key={photo.url}><img src={photo.url} alt={`Prévia ${index + 1}`} />{index === 0 && <figcaption>Capa</figcaption>}<button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => removePhoto(index)}>×</button></figure>)}</div>}{message && <p className="form-message error-message" role="alert">{message}</p>}<button className="primary-button full" disabled={photos.length === 0 || photos.length > 3}>Revisar cadastro <span>→</span></button></form>}

        {step === 4 && <form className="wizard-card" onSubmit={publish}><p className="eyebrow">Última etapa</p><h2>Revise o cadastro</h2><div className="review-card">{photos[0] && <img src={photos[0].url} alt="Foto de capa" />}<div><strong>{name}</strong><span>Mendes, RJ</span><p>{bio}</p><small>{photos.length} {photos.length === 1 ? "foto selecionada" : "fotos selecionadas"}</small></div></div><small className="security-note">Publicação autorizada pelo acesso administrativo atual.</small>{message && <p className="form-message error-message" role="alert">{message}</p>}<button className="primary-button full" disabled={busy}>{busy ? "Publicando…" : "Publicar modelo"}</button></form>}
      </>}
    </section>}

    {view === "manage" && <section className="manage-shell"><button className="text-back" onClick={goHome}>← Início</button><div className="manage-heading"><div><p className="eyebrow">Painel da organização</p><h1>Finalistas</h1></div><button className="primary-button" onClick={openCreate}>＋ Cadastrar modelo</button></div>{message && <p className="manage-message" role="status">{message}</p>}{loadingModels ? <p className="empty-state">Carregando finalistas…</p> : models.length === 0 ? <div className="empty-card"><span>○</span><h2>Nenhuma modelo publicada</h2><button className="primary-button" onClick={openCreate}>Fazer primeiro cadastro</button></div> : <div className="model-list">{models.map((model, index) => <article className="model-item" key={model.id}><span className="model-number">{String(index + 1).padStart(2, "0")}</span>{model.images?.[0] ? <img src={model.images[0]} alt={`Foto de ${model.name}`} /> : <div className="image-placeholder" />}<div className="model-info"><strong>{model.name}</strong><span>{model.city}</span><small>{model.images?.length || 0} fotos cadastradas</small></div><div className="item-actions"><button className="edit-button" onClick={() => openEdit(model)}>Editar</button><button className="delete-button" onClick={() => { setDeleteTarget(model); setDeletePassword(""); setMessage(""); }}>Excluir</button></div></article>)}</div>}</section>}

    {view === "results" && <section className="manage-shell results-shell"><button className="text-back" onClick={goHome}>← Início</button><div className="results-heading"><p className="eyebrow">Apuração confidencial</p><h1>Acompanhamento de votos</h1><p>Esta tela é exclusiva da organização e funciona somente para consulta. Não existe opção para adicionar, remover ou alterar votos.</p></div>{message && <p className="manage-message" role="status">{message}</p>}{loadingModels ? <p className="empty-state">Carregando apuração…</p> : <><div className="results-summary"><div><span>Total computado</span><strong>{totalVotes.toLocaleString("pt-BR")}</strong><small>votos válidos</small></div><div><span>Finalistas</span><strong>{rankedModels.length}</strong><small>participantes</small></div><div><span>Segurança</span><strong className="readonly-value">Somente leitura</strong><small>contagem protegida</small></div></div><div className="ranking-list">{rankedModels.map((model, index) => { const votes = model.votes || 0; const percentage = totalVotes ? (votes / totalVotes) * 100 : 0; return <article className="ranking-item" key={model.id}><span className="ranking-position">{String(index + 1).padStart(2, "0")}</span>{model.images?.[0] ? <img src={model.images[0]} alt={`Foto de ${model.name}`} /> : <div className="ranking-placeholder" />}<div className="ranking-info"><div><strong>{model.name}</strong><span>{percentage.toFixed(1).replace(".", ",")}% do total</span></div><div className="vote-track"><i style={{ width: `${(votes / highestVotes) * 100}%` }} /></div></div><strong className="vote-total">{votes.toLocaleString("pt-BR")}<small> votos</small></strong></article>; })}</div><p className="readonly-note">Os resultados não são enviados pela API pública e não aparecem para participantes ou visitantes.</p></>}</section>}

    {view === "edit" && editTarget && <section className="wizard-shell"><button className="text-back" onClick={() => { editPhotos.filter((photo) => photo.file).forEach((photo) => URL.revokeObjectURL(photo.url)); setEditTarget(null); setView("manage"); setMessage(""); }}>← Cancelar edição</button><form className="wizard-card" onSubmit={saveEdit}><p className="eyebrow">Editar finalista</p><h2>Atualize o perfil</h2><p>Você pode alterar informações e fotos. Os {editTarget.votes || 0} votos já recebidos não serão modificados.</p><label className="large-field">Nome completo<input value={editName} onChange={(event) => setEditName(event.target.value)} required maxLength={80} /></label><label className="large-field edit-bio">Apresentação<textarea value={editBio} onChange={(event) => setEditBio(event.target.value)} rows={6} required maxLength={500} /></label><div className="fixed-location"><span>Local desta edição</span><strong>Mendes, RJ</strong></div><label className="photo-picker compact-picker"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => selectEditPhotos(event.target.files)} /><span>＋</span><strong>Substituir galeria</strong><small>Selecione de 1 a 3 fotos</small></label>{editPhotos.length > 0 && <div className="photo-previews">{editPhotos.map((photo, index) => <figure key={`${photo.url}-${index}`}><img src={photo.url} alt={`Foto ${index + 1}`} />{index === 0 && <figcaption>Capa</figcaption>}<button type="button" aria-label={`Remover foto ${index + 1}`} onClick={() => removeEditPhoto(index)}>×</button></figure>)}</div>}{message && <p className="form-message error-message" role="alert">{message}</p>}<button className="primary-button full" disabled={busy || editPhotos.length === 0 || editPhotos.length > 3}>{busy ? "Salvando…" : "Salvar alterações"}</button><small className="security-note">Somente o perfil e as fotos serão atualizados. A contagem de votos permanece protegida.</small></form></section>}

    {deleteTarget && <div className="dialog-backdrop" role="presentation"><form className="delete-dialog" onSubmit={confirmDelete} role="dialog" aria-modal="true" aria-labelledby="delete-title"><button type="button" className="dialog-close" aria-label="Fechar" onClick={() => setDeleteTarget(null)}>×</button>{deleteTarget.images?.[0] && <img src={deleteTarget.images[0]} alt="" />}<p className="eyebrow">Confirmar exclusão</p><h2 id="delete-title">Excluir {deleteTarget.name}?</h2><p>O cadastro, os votos e as fotos enviadas serão removidos permanentemente.</p><label>Senha da organização<input autoFocus type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Digite a senha" required /></label>{message && <p className="form-message error-message" role="alert">{message}</p>}<button className="danger-button full" disabled={busy}>{busy ? "Excluindo…" : "Excluir definitivamente"}</button><button type="button" className="secondary-button full" onClick={() => setDeleteTarget(null)}>Cancelar</button></form></div>}
    </>}

    <style jsx>{`
      .admin-page{min-height:100vh;background:#eee9df}.admin-nav{height:76px;padding:0 clamp(20px,5vw,70px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(17,16,15,.13);background:rgba(250,248,243,.8);font-size:12px}.brand{font-size:20px}.logout-button{border:0;background:transparent;text-decoration:underline;text-underline-offset:5px;cursor:pointer}.login-shell{min-height:calc(100vh - 76px);display:grid;place-items:center;padding:35px 20px}.login-card{width:min(500px,100%);background:#faf8f3;border:1px solid rgba(17,16,15,.15);padding:clamp(32px,7vw,64px);text-align:center;box-shadow:0 24px 80px rgba(32,25,17,.08)}.login-card h1{font-size:clamp(48px,8vw,68px);line-height:.92;margin:12px 0 20px}.login-card>p:not(.eyebrow):not(.form-message){color:#706a61;line-height:1.65}.login-card label{display:grid;gap:9px;text-align:left;margin-top:30px;font-size:10px;text-transform:uppercase;letter-spacing:.14em}.login-card input{width:100%;border:1px solid rgba(17,16,15,.22);background:#fff;padding:15px;font:16px var(--font-sans);letter-spacing:normal}.login-card>small{display:block;color:#777;line-height:1.5;margin-top:18px}.lock-mark{display:grid;place-items:center;width:60px;height:60px;border:1px solid #a98752;border-radius:50%;margin:0 auto 25px;font:26px var(--font-display);color:#a98752}.admin-home{min-height:calc(100vh - 76px);max-width:1200px;margin:auto;padding:clamp(55px,9vw,120px) clamp(20px,5vw,60px);display:grid;grid-template-columns:1fr 1fr;gap:clamp(45px,8vw,110px);align-items:center}.home-copy h1,.manage-heading h1{font-size:clamp(58px,7vw,96px);line-height:.88;margin:12px 0 30px}.home-copy>p:last-child{max-width:480px;color:#676159;line-height:1.8}.action-grid{display:grid;gap:16px}.action-card{min-height:190px;text-align:left;padding:28px;border:1px solid rgba(17,16,15,.18);background:#faf8f3;display:grid;grid-template-columns:1fr auto;gap:9px;cursor:pointer;transition:.25s}.action-card:hover{transform:translateY(-3px);box-shadow:0 18px 45px rgba(30,24,17,.09)}.action-card>span,.action-card>small{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8b8174}.action-card>strong{grid-column:1/-1;font:36px var(--font-display);font-weight:500}.action-card>i{grid-column:2;grid-row:1;font-style:normal;font-size:24px}.action-primary{background:#171614;color:#fff}.action-primary>span,.action-primary>small{color:#b9ad9e}.wizard-shell,.manage-shell{max-width:920px;margin:auto;padding:38px 20px 90px}.wizard-shell{max-width:720px}.text-back{border:0;background:transparent;padding:8px 0;margin-bottom:30px;cursor:pointer;font-size:12px}.progress-wrap{margin-bottom:18px}.progress-copy{display:flex;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:#746e66;margin-bottom:10px}.progress-track{height:2px;background:rgba(17,16,15,.13)}.progress-track i{display:block;height:100%;background:#a98752;transition:width .35s}.wizard-card{background:#faf8f3;border:1px solid rgba(17,16,15,.15);padding:clamp(28px,7vw,64px);box-shadow:0 20px 70px rgba(32,25,17,.06)}.wizard-card h2,.delete-dialog h2,.empty-card h2{font-size:clamp(42px,7vw,62px);line-height:.98;margin:10px 0 18px}.wizard-card>p:not(.eyebrow):not(.form-message),.delete-dialog>p:not(.eyebrow){color:#706a61;line-height:1.65;margin-bottom:30px}.large-field,.delete-dialog label{display:grid;gap:9px;font-size:10px;text-transform:uppercase;letter-spacing:.15em}.large-field input,.large-field textarea,.delete-dialog input{width:100%;border:0;border-bottom:1px solid rgba(17,16,15,.28);background:transparent;padding:15px 2px;font:18px var(--font-sans);letter-spacing:normal;text-transform:none;outline:none}.large-field input:focus,.large-field textarea:focus,.delete-dialog input:focus{border-color:#a98752}.large-field textarea{resize:vertical;line-height:1.6}.edit-bio{margin-top:25px}.fixed-location{display:flex;justify-content:space-between;align-items:center;background:#eee9df;padding:16px 18px;margin:24px 0}.fixed-location span{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#766f65}.fixed-location strong{font:20px var(--font-display)}.character-count{text-align:right;color:#817a70;font-size:11px;margin:8px 0 10px}.photo-picker{min-height:190px;border:1px dashed rgba(17,16,15,.35);display:grid;place-content:center;text-align:center;gap:7px;cursor:pointer;background:#f4f0e8;margin-bottom:18px}.compact-picker{min-height:135px}.photo-picker input{position:absolute;opacity:0;pointer-events:none}.photo-picker span{font-size:32px;color:#a98752}.photo-picker strong{font:24px var(--font-display)}.photo-picker small{color:#777}.photo-previews{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.photo-previews figure{aspect-ratio:4/5;margin:0;position:relative;background:#ddd}.photo-previews img{width:100%;height:100%;object-fit:cover}.photo-previews figcaption{position:absolute;left:6px;bottom:6px;background:#171614;color:#fff;padding:5px 7px;font-size:9px;text-transform:uppercase}.photo-previews figure button{position:absolute;right:5px;top:5px;width:28px;height:28px;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff;font-size:19px;cursor:pointer}.review-card{display:grid;grid-template-columns:125px 1fr;gap:22px;padding:16px;background:#eee9df;margin:25px 0}.review-card img{width:125px;height:158px;object-fit:cover}.review-card>div{display:flex;flex-direction:column;align-items:flex-start;min-width:0}.review-card strong{font:28px var(--font-display)}.review-card span,.review-card small{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#766f65}.review-card p{font-size:12px;color:#676159;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.security-note{display:block;color:#777;margin:10px 0 0}.form-message{font-size:12px;padding:12px;margin:14px 0 0}.error-message{color:#8d2e27;background:#f5e8e5}.primary-button.full,.danger-button.full,.secondary-button.full{margin-top:24px}.secondary-button{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(17,16,15,.22);background:transparent;padding:15px 20px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}.success-card{text-align:center}.success-mark{display:grid;place-items:center;width:72px;height:72px;margin:0 auto 25px;border-radius:50%;background:#1f6d45;color:#fff;font-size:27px}.manage-heading{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:35px}.manage-heading h1{margin-bottom:0}.manage-message{background:#faf8f3;border:1px solid rgba(17,16,15,.12);padding:14px 18px;font-size:12px}.model-list{background:#faf8f3;border:1px solid rgba(17,16,15,.15)}.model-item{display:grid;grid-template-columns:45px 78px 1fr auto;align-items:center;gap:18px;padding:16px 20px;border-bottom:1px solid rgba(17,16,15,.12)}.model-item:last-child{border-bottom:0}.model-number{font:16px var(--font-display);color:#a98752}.model-item img,.image-placeholder{width:78px;height:92px;object-fit:cover;background:#ddd}.model-info{display:grid;gap:4px}.model-info strong{font:27px var(--font-display);font-weight:500}.model-info span,.model-info small{font-size:11px;color:#746e66}.item-actions{display:flex;gap:8px}.edit-button,.delete-button{background:transparent;padding:11px 16px;cursor:pointer}.edit-button{border:1px solid rgba(17,16,15,.32);color:#171614}.delete-button{border:1px solid #8d2e27;color:#8d2e27}.empty-card{text-align:center;background:#faf8f3;border:1px solid rgba(17,16,15,.14);padding:70px 20px}.empty-card>span{font-size:42px;color:#a98752}.empty-card h2{font-size:38px}.empty-state{text-align:center;padding:70px;color:#706a61}.dialog-backdrop{position:fixed;inset:0;z-index:80;background:rgba(12,11,10,.74);backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px}.delete-dialog{width:min(470px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#faf8f3;padding:clamp(28px,6vw,48px);position:relative;text-align:center}.delete-dialog>img{width:86px;height:104px;object-fit:cover;margin-bottom:18px}.delete-dialog h2{font-size:42px}.delete-dialog label{text-align:left;margin-top:25px}.dialog-close{position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:30px;cursor:pointer}.danger-button{display:inline-flex;align-items:center;justify-content:center;background:#8d2e27;color:#fff;border:1px solid #8d2e27;padding:16px 20px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}.full{width:100%}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}button:disabled{opacity:.5;cursor:not-allowed}
      .results-action{border-color:#a98752}.results-heading{max-width:760px;margin-bottom:35px}.results-heading h1{font-size:clamp(52px,7vw,86px);line-height:.9;margin:12px 0 24px}.results-heading>p:last-child{color:#706a61;line-height:1.7;max-width:650px}.results-summary{display:grid;grid-template-columns:repeat(3,1fr);background:#171614;color:#fff;margin-bottom:22px}.results-summary>div{padding:28px;border-right:1px solid rgba(255,255,255,.14);display:grid;gap:5px}.results-summary>div:last-child{border:0}.results-summary span,.results-summary small{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#aaa49b}.results-summary strong{font:44px var(--font-display);font-weight:500}.results-summary .readonly-value{font:18px var(--font-sans);margin:10px 0}.ranking-list{background:#faf8f3;border:1px solid rgba(17,16,15,.15)}.ranking-item{display:grid;grid-template-columns:42px 66px 1fr auto;align-items:center;gap:18px;padding:17px 20px;border-bottom:1px solid rgba(17,16,15,.12)}.ranking-item:last-child{border:0}.ranking-position{font:20px var(--font-display);color:#a98752}.ranking-item>img,.ranking-placeholder{width:66px;height:76px;object-fit:cover;background:#ddd}.ranking-info{display:grid;gap:12px}.ranking-info>div:first-child{display:flex;justify-content:space-between;gap:16px;align-items:end}.ranking-info strong{font:25px var(--font-display);font-weight:500}.ranking-info span{font-size:10px;color:#756e65}.vote-track{height:4px;background:#e7e0d5;overflow:hidden}.vote-track i{display:block;height:100%;background:#a98752}.vote-total{font:30px var(--font-display);font-weight:500;text-align:right}.vote-total small{font:10px var(--font-sans);text-transform:uppercase;color:#777}.readonly-note{text-align:center;color:#706a61;font-size:11px;margin-top:20px}.card-footer>span{font-size:10px;text-transform:uppercase;letter-spacing:.1em}
      @media(max-width:760px){.admin-home{grid-template-columns:1fr;align-content:start}.home-copy h1{font-size:58px}.action-card{min-height:155px}.action-card>strong{font-size:30px}.manage-heading{display:grid;align-items:start}.manage-heading .primary-button{width:100%}.model-item{grid-template-columns:60px 1fr}.model-number{display:none}.model-item img,.image-placeholder{width:60px;height:74px}.model-info strong{font-size:22px}.model-info span{display:none}.item-actions{grid-column:1/-1}.item-actions button{flex:1}.review-card{grid-template-columns:92px 1fr}.review-card img{width:92px;height:122px}.results-summary{grid-template-columns:1fr}.results-summary>div{border-right:0;border-bottom:1px solid rgba(255,255,255,.14)}.ranking-item{grid-template-columns:34px 56px 1fr}.ranking-item>img,.ranking-placeholder{width:56px;height:66px}.vote-total{grid-column:3;text-align:left;font-size:24px}.ranking-info>div:first-child{display:grid;gap:3px}}
      @media(max-width:500px){.admin-nav{height:66px}.login-shell{min-height:calc(100vh - 66px);padding:20px}.login-card{padding:34px 22px}.admin-home{min-height:calc(100vh - 66px);padding-top:48px}.wizard-shell,.manage-shell{padding-top:24px}.wizard-card{padding:30px 22px}.photo-previews{grid-template-columns:repeat(3,1fr)}.model-item{grid-template-columns:54px 1fr;padding:13px}.model-item img,.image-placeholder{width:54px;height:68px}.delete-dialog{padding:38px 22px 24px}.review-card p{display:none}}
    `}</style>
  </main>;
}
