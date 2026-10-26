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

export type StoredSponsor = {
  id: string;
  name: string;
  logoUrl: string;
  website?: string;
  tier: "principal" | "apoio";
  displayOrder: number;
};

const defaults: StoredModel[] = [];

const dataDir = path.join(process.cwd(), "data");
const modelsFile = path.join(dataDir, "models.json");
const votesFile = path.join(dataDir, "votes.json");
const sponsorsFile = path.join(dataDir, "sponsors.json");

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

function storagePathFromPublicUrl(imageUrl: string, supabaseUrl: string): string | null {
  try {
    const image = new URL(imageUrl);
    const project = new URL(supabaseUrl);
    const prefix = "/storage/v1/object/public/modelos/";
    if (image.origin !== project.origin || !image.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(image.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

export async function updateModel(
  modelId: string,
  updates: Pick<StoredModel, "name" | "bio" | "images">,
): Promise<{ storageWarning?: string }> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: current, error: findError } = await supabase
      .from("models")
      .select("id,images")
      .eq("id", modelId)
      .maybeSingle();
    if (findError) throw findError;
    if (!current) throw new Error("MODEL_NOT_FOUND");

    const { error: updateError } = await supabase
      .from("models")
      .update({ name: updates.name, bio: updates.bio, images: updates.images, city: "Mendes, RJ" })
      .eq("id", modelId);
    if (updateError) throw updateError;

    const oldImages = Array.isArray(current.images) ? current.images.map(String) : [];
    const removedImages = oldImages.filter((image) => !updates.images.includes(image));
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const storagePaths = removedImages
      .map((image) => storagePathFromPublicUrl(image, supabaseUrl))
      .filter((path): path is string => Boolean(path));
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from("modelos").remove(storagePaths);
      if (storageError) {
        console.error("[updateModel] Cadastro atualizado, mas houve falha ao limpar fotos antigas:", storageError);
        return { storageWarning: "As informações foram atualizadas, mas algumas fotos antigas podem precisar ser removidas manualmente do Storage." };
      }
    }
    return {};
  }

  const models = await readJson<StoredModel[]>(modelsFile, defaults);
  const index = models.findIndex((model) => model.id === modelId);
  if (index < 0) throw new Error("MODEL_NOT_FOUND");
  models[index] = { ...models[index], name: updates.name, city: "Mendes, RJ", bio: updates.bio, images: updates.images };
  await fs.writeFile(modelsFile, JSON.stringify(models, null, 2));
  return {};
}

export async function deleteModel(modelId: string): Promise<{ storageWarning?: string }> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: model, error: findError } = await supabase
      .from("models")
      .select("id,images")
      .eq("id", modelId)
      .maybeSingle();
    if (findError) throw findError;
    if (!model) throw new Error("MODEL_NOT_FOUND");

    const { error: deleteError } = await supabase.from("models").delete().eq("id", modelId);
    if (deleteError) throw deleteError;

    const supabaseUrl = process.env.SUPABASE_URL || "";
    const storagePaths = (Array.isArray(model.images) ? model.images : [])
      .map(String)
      .map((image) => storagePathFromPublicUrl(image, supabaseUrl))
      .filter((path): path is string => Boolean(path));
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from("modelos").remove(storagePaths);
      if (storageError) {
        console.error("[deleteModel] Modelo apagada, mas houve falha ao limpar fotos:", storageError);
        return { storageWarning: "A modelo foi apagada, mas algumas fotos podem precisar ser removidas manualmente do Storage." };
      }
    }
    return {};
  }

  const models = await readJson<StoredModel[]>(modelsFile, defaults);
  if (!models.some((model) => model.id === modelId)) throw new Error("MODEL_NOT_FOUND");
  await fs.writeFile(modelsFile, JSON.stringify(models.filter((model) => model.id !== modelId), null, 2));
  const votes = await readJson<{ modelId: string; voterHash: string }[]>(votesFile, []);
  await fs.writeFile(votesFile, JSON.stringify(votes.filter((vote) => vote.modelId !== modelId), null, 2));
  return {};
}

export async function getSponsors(): Promise<StoredSponsor[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("sponsors")
      .select("id,name,logo_url,website,tier,display_order,created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((sponsor) => ({
      id: String(sponsor.id),
      name: String(sponsor.name),
      logoUrl: String(sponsor.logo_url),
      website: sponsor.website ? String(sponsor.website) : undefined,
      tier: sponsor.tier === "principal" ? "principal" : "apoio",
      displayOrder: Number(sponsor.display_order || 0),
    }));
  }
  return readJson<StoredSponsor[]>(sponsorsFile, []);
}

export async function addSponsor(sponsor: StoredSponsor): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("sponsors").insert({
      id: sponsor.id,
      name: sponsor.name,
      logo_url: sponsor.logoUrl,
      website: sponsor.website || null,
      tier: sponsor.tier,
      display_order: sponsor.displayOrder,
    });
    if (error) throw error;
    return;
  }
  const sponsors = await readJson<StoredSponsor[]>(sponsorsFile, []);
  sponsors.push(sponsor);
  await fs.writeFile(sponsorsFile, JSON.stringify(sponsors, null, 2));
}

export async function deleteSponsor(sponsorId: string): Promise<{ storageWarning?: string }> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: sponsor, error: findError } = await supabase
      .from("sponsors")
      .select("id,logo_url")
      .eq("id", sponsorId)
      .maybeSingle();
    if (findError) throw findError;
    if (!sponsor) throw new Error("SPONSOR_NOT_FOUND");
    const { error: deleteError } = await supabase.from("sponsors").delete().eq("id", sponsorId);
    if (deleteError) throw deleteError;

    const storagePath = storagePathFromPublicUrl(String(sponsor.logo_url), process.env.SUPABASE_URL || "");
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from("modelos").remove([storagePath]);
      if (storageError) {
        console.error("[deleteSponsor] Patrocinador apagado, mas houve falha ao limpar a logo:", storageError);
        return { storageWarning: "O patrocinador foi removido, mas a logo pode precisar ser apagada manualmente do Storage." };
      }
    }
    return {};
  }
  const sponsors = await readJson<StoredSponsor[]>(sponsorsFile, []);
  if (!sponsors.some((sponsor) => sponsor.id === sponsorId)) throw new Error("SPONSOR_NOT_FOUND");
  await fs.writeFile(sponsorsFile, JSON.stringify(sponsors.filter((sponsor) => sponsor.id !== sponsorId), null, 2));
  return {};
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
