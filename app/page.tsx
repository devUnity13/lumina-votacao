"use client";

import { useEffect, useMemo, useState } from "react";

export type Model = { id: string; name: string; city: string; bio: string; images: string[]; votes?: number };

const fallbackModels: Model[] = [
  { id: "maya", name: "Maya Alves", city: "São Paulo, SP", bio: "Moda, movimento e uma presença que transforma cada passarela.", images: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85"], votes: 1284 },
  { id: "isadora", name: "Isadora Lima", city: "Rio de Janeiro, RJ", bio: "Autenticidade tropical com uma assinatura editorial inesquecível.", images: ["/isadora-01.jpg", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85"], votes: 1197 },
  { id: "helena", name: "Helena Costa", city: "Belo Horizonte, MG", bio: "Elegância contemporânea, atitude e uma beleza que fala por si.", images: ["https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85"], votes: 1043 },
];

function Arrow({ direction }: { direction: "left" | "right" }) {
  return <span aria-hidden="true">{direction === "left" ? "←" : "→"}</span>;
}

function ModelCard({ model, onVote, alreadyVoted }: { model: Model; onVote: (model: Model) => void; alreadyVoted: boolean }) {
  const [image, setImage] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
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
          <span><strong>{(model.votes || 0).toLocaleString("pt-BR")}</strong> votos</span>
          <button className="vote-button" onClick={() => onVote(model)} disabled={alreadyVoted}>{alreadyVoted ? "Voto registrado" : "Votar nesta modelo"}</button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [models, setModels] = useState<Model[]>(fallbackModels);
  const [selected, setSelected] = useState<Model | null>(null);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    setVotedFor(localStorage.getItem("lumina-vote"));
    fetch("/api/models").then((r) => r.ok ? r.json() : null).then((data) => data?.models?.length && setModels(data.models)).catch(() => null);
  }, []);

  const totalVotes = useMemo(() => models.reduce((sum, model) => sum + (model.votes || 0), 0), [models]);
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
      localStorage.setItem("lumina-vote", selected.id);
      setVotedFor(selected.id);
      setModels((current) => current.map((model) => model.id === selected.id ? { ...model, votes: (model.votes || 0) + 1 } : model));
      setStatus("success");
    } catch { setStatus("error"); }
  };

  return (
    <main>
      <nav className="nav"><a className="brand" href="#top">LUMINA<span>○</span></a><div><a href="#finalistas">Finalistas</a><a href="#como-votar">Como votar</a></div><span className="live"><i /> Votação aberta</span></nav>
      <header id="top" className="hero">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy"><p className="eyebrow">Escolha do público • Edição 2026</p><h1>Uma passarela.<br />Um voto. <em>Uma estrela.</em></h1><p>Conheça as finalistas, explore seus ensaios e escolha quem merece iluminar esta noite.</p><a className="primary-button" href="#finalistas">Conhecer as finalistas <span>↓</span></a></div>
        <div className="hero-stat"><span>Votos computados</span><strong>{totalVotes.toLocaleString("pt-BR")}</strong><small>Seu voto pode decidir a vencedora.</small></div>
      </header>

      <section id="finalistas" className="finalists section-shell">
        <div className="section-heading"><div><p className="eyebrow">As escolhidas</p><h2>Conheça as finalistas</h2></div><p>Cada história é única. Deslize pelas fotos, conheça cada candidata e escolha com o coração.</p></div>
        <div className="model-grid">{models.map((model) => <ModelCard key={model.id} model={model} onVote={(item) => { setSelected(item); setStatus("idle"); }} alreadyVoted={Boolean(votedFor)} />)}</div>
      </section>

      <section id="como-votar" className="how"><div className="section-shell how-inner"><p className="eyebrow">Simples e transparente</p><h2>Seu voto em três passos</h2><div className="steps"><div><span>01</span><h3>Explore</h3><p>Conheça as finalistas e veja todos os ensaios.</p></div><div><span>02</span><h3>Escolha</h3><p>Selecione a modelo que mais representa o evento.</p></div><div><span>03</span><h3>Confirme</h3><p>Confirme sua escolha. É permitido um voto por pessoa.</p></div></div></div></section>

      <footer><a className="brand" href="#top">LUMINA<span>○</span></a><p>Beleza que inspira. Escolhas que brilham.</p><a href="/admin">Área da organização</a></footer>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={() => status !== "sending" && setSelected(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Confirmar voto" onMouseDown={(event) => event.stopPropagation()}>
        {status === "success" ? <div className="success"><span>✓</span><p className="eyebrow">Voto confirmado</p><h2>Você fez sua escolha brilhar.</h2><p>Seu voto em {selected.name} foi registrado com sucesso.</p><button className="primary-button" onClick={() => setSelected(null)}>Concluir</button></div> : <><button className="close" aria-label="Fechar" onClick={() => setSelected(null)}>×</button><img src={selected.images[0]} alt={selected.name} /><p className="eyebrow">Confirme sua escolha</p><h2>Seu voto vai para<br /><em>{selected.name}?</em></h2><p>Depois de confirmado, o voto não poderá ser alterado.</p>{status === "error" && <p className="error">Não foi possível registrar agora. Confira a configuração do banco e tente novamente.</p>}<button className="primary-button full" onClick={confirmVote} disabled={status === "sending" || Boolean(votedFor)}>{status === "sending" ? "Registrando…" : votedFor ? "Você já votou" : "Sim, confirmar meu voto"}</button></>}
      </div></div>}
    </main>
  );
}
