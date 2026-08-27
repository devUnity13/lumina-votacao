"use client";

import { useEffect, useState } from "react";

export type Model = { id: string; name: string; city: string; bio: string; images: string[] };

const VOTE_STORAGE_KEY = "lumina-vote-oficial-2026";

function Arrow({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true">{direction === "left" ? "←" : "→"}</span>;
}

function ModelCard({ model, onVote, votedFor }: { model: Model; onVote: (model: Model) => void; votedFor: string | null }) {
  const [image, setImage] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const alreadyVoted = Boolean(votedFor);
  const isFavorite = votedFor === model.id;
  const move = (step: number) => setImage((current) => (current + step + model.images.length) % model.images.length);
  const handleImageError = () => {
    const failedUrl = model.images[image];
    const failed = new Set([...failedImages, failedUrl]);
    setFailedImages(Array.from(failed));
    const next = model.images.findIndex((url, index) => index !== image && !failed.has(url));
    if (next >= 0) setImage(next);
  };
  return (
    <article className="model-card">
      <div className="photo-frame">
        <img src={model.images[image]} alt={`${model.name}, foto ${image + 1}`} onError={handleImageError} />
        <div className="photo-shade" />
        <span className="number">0{model.id === "maya" ? 1 : model.id === "isadora" ? 2 : 3}</span>
        <div className="carousel-controls">
          <button onClick={() => move(-1)} aria-label={`Foto anterior de ${model.name}`}><Arrow direction="left" /></button>
          <span>{String(image + 1).padStart(2, "0")} / {String(model.images.length).padStart(2, "0")}</span>
          <button onClick={() => move(1)} aria-label={`Próxima foto de ${model.name}`}><Arrow direction="right" /></button>
        </div>
      </div>
      <div className="model-copy">
        <p className="eyebrow">{model.city}</p>
        <h3>{model.name}</h3>
        <p>{model.bio}</p>
        <div className="card-footer">
          <button className={`heart-button${isFavorite ? " selected" : ""}`} onClick={() => onVote(model)} disabled={alreadyVoted} aria-label={isFavorite ? `${model.name} recebeu seu voto` : `Votar em ${model.name}`} aria-pressed={isFavorite}>{isFavorite ? "♥" : "♡"}</button>
          <button className="vote-button" onClick={() => onVote(model)} disabled={alreadyVoted}>{isFavorite ? "Seu voto" : alreadyVoted ? "Votação concluída" : "Votar nesta modelo"}</button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [selected, setSelected] = useState<Model | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    setVotedFor(localStorage.getItem(VOTE_STORAGE_KEY));
    fetch("/api/models")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setModels(Array.isArray(data?.models) ? data.models : []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, []);

  const confirmVote = async () => {
    if (!selected || votedFor) return;
    setStatus("sending");
    let voterKey = localStorage.getItem("lumina-voter-key");
    if (!voterKey) { voterKey = crypto.randomUUID(); localStorage.setItem("lumina-voter-key", voterKey); }
    try {
      const invite = new URLSearchParams(location.search).get("convite");
      const response = await fetch("/api/votes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ modelId: selected.id, voterKey, invite }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar o voto.");
      localStorage.setItem(VOTE_STORAGE_KEY, selected.id);
      setVotedFor(selected.id);
      setStatus("success");
    } catch { setStatus("error"); }
  };

  return (
    <main>
      <nav className="nav"><a className="brand" href="#top">LUMINA<span>○</span></a><div><a href="#finalistas">Finalistas</a><a href="#como-votar">Como votar</a></div><span className="live"><i /> Votação aberta</span></nav>
      <header id="top" className="hero">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy"><p className="eyebrow">Escolha do público • Edição 2026</p><h1>Uma passarela.<br />Um voto. <em>Uma estrela.</em></h1><p>Conheça as finalistas, explore seus ensaios e escolha quem merece iluminar esta noite.</p><a className="primary-button" href="#finalistas">Conhecer as finalistas <span>↓</span></a></div>
        <div className="hero-stat"><span>Escolha do público</span><strong className="hero-heart">♥</strong><small>Escolha sua favorita e vote com o coração.</small></div>
      </header>

      <section id="finalistas" className="finalists section-shell">
        <div className="section-heading"><div><p className="eyebrow">As escolhidas</p><h2>Conheça as finalistas</h2></div><p>Cada história é única. Deslize pelas fotos, conheça cada candidata e escolha com o coração.</p></div>
        {loadingModels ? <div className="no-finalists"><span>○</span><h3>Carregando finalistas…</h3></div> : models.length > 0 ? <div className="model-grid">{models.map((model) => <ModelCard key={model.id} model={model} onVote={(item) => { setSelected(item); setStatus("idle"); }} votedFor={votedFor} />)}</div> : <div className="no-finalists"><span>○</span><h3>Novas finalistas em breve</h3><p>A organização está preparando os perfis desta edição.</p></div>}
      </section>

      <section id="como-votar" className="how"><div className="section-shell how-inner"><p className="eyebrow">Simples e transparente</p><h2>Seu voto em três passos</h2><div className="steps"><div><span>01</span><h3>Explore</h3><p>Conheça as finalistas e veja todos os ensaios.</p></div><div><span>02</span><h3>Escolha</h3><p>Selecione a modelo que mais representa o evento.</p></div><div><span>03</span><h3>Confirme</h3><p>Confirme sua escolha. É permitido um voto por pessoa.</p></div></div></div></section>

      <footer><a className="brand" href="#top">LUMINA<span>○</span></a><p>Beleza que inspira. Escolhas que brilham.</p><a href="/admin">Área da organização</a></footer>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={() => status !== "sending" && setSelected(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar voto" onMouseDown={(event) => event.stopPropagation()}>
        {status === "success" ? <div className="success"><span>✓</span><p className="eyebrow">Voto confirmado</p><h2>Você fez sua escolha brilhar.</h2><p>Seu voto em {selected.name} foi registrado com sucesso.</p><button className="primary-button" onClick={() => setSelected(null)}>Concluir</button></div> : <><button className="close" aria-label="Fechar" onClick={() => setSelected(null)}>×</button><img src={selected.images[0]} alt={selected.name} /><p className="eyebrow">Confirme sua escolha</p><h2>Seu voto vai para<br /><em>{selected.name}?</em></h2><p>Depois de confirmado, o voto não poderá ser alterado.</p>{status === "error" && <p className="error">Não foi possível registrar agora. Confira a configuração do banco e tente novamente.</p>}<button className="primary-button full" onClick={confirmVote} disabled={status === "sending" || Boolean(votedFor)}>{status === "sending" ? "Registrando…" : votedFor ? "Você já votou" : "Sim, confirmar meu voto"}</button></>}
      </div></div>}
    </main>
  );
}
