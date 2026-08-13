import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase";

export type StoredModel = {
  id: string;
  name: string;
  city: string;
  bio: string;
  images: string[];
  votes?: number;
};

const defaults: StoredModel[] = [
  { id: "maya", name: "Maya Alves", city: "São Paulo, SP", bio: "Moda, movimento e uma presença que transforma cada passarela.", images: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85"], votes: 1284 },
  { id: "isadora", name: "Isadora Lima", city: "Rio de Janeiro, RJ", bio: "Autenticidade tropical com uma assinatura editorial inesquecível.", images: ["https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85"], votes: 1197 },
  { id: "helena", name: "Helena Costa", city: "Belo Horizonte, MG", bio: "Elegância contemporânea, atitude e uma beleza que fala por si.", images: ["https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85"], votes: 1043 },
];

const dataDir = path.join(process.cwd(), "data");
const modelsFile = path.join(dataDir, "models.json");
const votesFile = path.join(dataDir, "votes.json");

function normalizeImageUrl(url: string): string {
  if (url.includes("photo-1488426862026-3ee34a7d66df")) return "/isadora-01.jpg";
  return url;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

export async function getModels(): Promise<StoredModel[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("model_vote_totals")
      .select("id,name,city,bio,images,votes,created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((model) => ({
      id: String(model.id), name: String(model.name), city: String(model.city), bio: String(model.bio),
      images: Array.isArray(model.images) ? model.images.map(String).map(normalizeImageUrl) : [], votes: Number(model.votes || 0),
    }));
  }

  const models = await readJson<StoredModel[]>(modelsFile, defaults);
  const votes = await readJson<{ modelId: string; voterHash: string }[]>(votesFile, []);
  return models.map((model) => ({ ...model, images: model.images.map(normalizeImageUrl), votes: (model.votes || 0) + votes.filter((vote) => vote.modelId === model.id).length }));
}

export async function addModel(model: StoredModel) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("models").insert({ id: model.id, name: model.name, city: model.city, bio: model.bio, images: model.images, base_votes: 0 });
    if (error) throw error;
    return;
  }
  const models = await readJson<StoredModel[]>(modelsFile, defaults);
  models.push(model);
  await fs.writeFile(modelsFile, JSON.stringify(models, null, 2));
}

export async function registerVote(modelId: string, voterKey: string, invite: string | null, requestSignature: string) {
  const identity = invite ? `invite:${invite}` : `device:${voterKey}:${requestSignature}`;
  const voterHash = createHash("sha256").update(`${process.env.VOTE_SALT || "lumina-local"}:${identity}`).digest("hex");
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("votes").insert({ model_id: modelId, voter_hash: voterHash });
    if (!error) return;
    if (error.code === "23505") throw new Error("ALREADY_VOTED");
    if (error.code === "23503") throw new Error("MODEL_NOT_FOUND");
    throw error;
  }
  const models = await readJson<StoredModel[]>(modelsFile, defaults);
  if (!models.some((model) => model.id === modelId)) throw new Error("MODEL_NOT_FOUND");
  const votes = await readJson<{ modelId: string; voterHash: string }[]>(votesFile, []);
  if (votes.some((vote) => vote.voterHash === voterHash)) throw new Error("ALREADY_VOTED");
  votes.push({ modelId, voterHash });
  await fs.writeFile(votesFile, JSON.stringify(votes, null, 2));
}
