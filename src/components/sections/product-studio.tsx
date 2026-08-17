"use client";

import * as React from "react";
import {
  ImageIcon,
  Sparkles,
  Loader2,
  UploadCloud,
  Type,
  Download,
  Trash2,
  Eye,
  Wand2,
  ScanSearch,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GlassCard, EmptyState } from "@/components/shared";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const STYLES = [
  {
    id: "Dynamic Liquid Splash",
    label: "Liquid Splash",
    emoji: "💧",
    desc: "Chrome/paint explosion with iridescent neon highlights",
    gradient: "from-cyan-500/20 to-blue-600/20",
    border: "border-cyan-500/40",
  },
  {
    id: "Clean Studio Lighting",
    label: "Studio Clean",
    emoji: "🎯",
    desc: "White cyclorama, three-point lighting, luxury minimal",
    gradient: "from-slate-400/20 to-zinc-500/20",
    border: "border-slate-400/40",
  },
  {
    id: "Urban Streetwear",
    label: "Urban Street",
    emoji: "🏙️",
    desc: "Golden hour, concrete, graffiti, gritty saturated tones",
    gradient: "from-orange-500/20 to-rose-600/20",
    border: "border-orange-500/40",
  },
  {
    id: "Neon Cyberpunk",
    label: "Cyberpunk",
    emoji: "🌆",
    desc: "Rain-slicked streets, purple/cyan neon, volumetric fog",
    gradient: "from-violet-500/20 to-fuchsia-600/20",
    border: "border-violet-500/40",
  },
  {
    id: "Minimalist Floating",
    label: "Minimalist",
    emoji: "✨",
    desc: "Pure white void, geometric shadows, Apple-aesthetic",
    gradient: "from-gray-300/20 to-slate-400/20",
    border: "border-gray-400/40",
  },
  {
    id: "Nature Outdoor Setup",
    label: "Nature Outdoor",
    emoji: "🌿",
    desc: "Forest clearing, dappled sunlight, morning mist, earthy",
    gradient: "from-green-500/20 to-emerald-600/20",
    border: "border-green-500/40",
  },
  {
    id: "Luxury Gold",
    label: "Luxury Gold",
    emoji: "👑",
    desc: "Dark velvet, gold foil accents, spotlight, prestige",
    gradient: "from-yellow-500/20 to-amber-600/20",
    border: "border-yellow-500/40",
  },
  {
    id: "Pop Art Energy",
    label: "Pop Art",
    emoji: "🎨",
    desc: "Halftone dots, bold flat colors, Andy Warhol inspired",
    gradient: "from-red-500/20 to-pink-600/20",
    border: "border-red-500/40",
  },
];

export function ProductStudioSection() {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const [form, setForm] = React.useState({
    productName: "",
    headline: "",
    style: STYLES[0].id,
    originalImage: "" as string,
    customPrompt: "",
  });

  const [generating, setGenerating] = React.useState(false);
  const [latestResult, setLatestResult] = React.useState<any | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadHistory = React.useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>("/api/product-studio");
      setHistory(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, originalImage: event.target?.result as string }));
      setPhotoAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, originalImage: event.target?.result as string }));
      setPhotoAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!form.productName) {
      toast.error("Product name is required");
      return;
    }
    setGenerating(true);
    setLatestResult(null);
    setPhotoAnalysis(null);
    try {
      const res = await apiFetch<any>("/api/product-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        retries: 0,
      });
      toast.success("🎨 Marketing image generated by Gemini!");
      setLatestResult(res.data);
      if (res.photoAnalysis) setPhotoAnalysis(res.photoAnalysis);
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch("/api/product-studio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (latestResult?.id === id) setLatestResult(null);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const downloadImage = (imageUrl: string, name: string) => {
    if (imageUrl.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${name}-marketing.png`;
      link.click();
    } else {
      window.open(imageUrl, "_blank");
    }
  };

  const selectedStyle = STYLES.find((s) => s.id === form.style);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI Product Studio
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-500 ring-1 ring-violet-500/20">
              <Zap className="h-2.5 w-2.5" /> FLUX + Gemini
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload your product photo → Gemini analyzes it → Groq writes the perfect prompt → Gemini generates your marketing image.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* ── Controls Pane ── */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard strong className="p-5 space-y-5">

            {/* 1. Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-violet-500" />
                1. Upload Product Photo
                <span className="text-[11px] font-normal text-muted-foreground">(Optional — enables image-to-image)</span>
              </Label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl transition-all cursor-pointer",
                  form.originalImage
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-border hover:border-violet-500/30 hover:bg-violet-500/3"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {form.originalImage ? (
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={form.originalImage}
                      alt="Preview"
                      className="h-16 w-16 object-contain rounded-lg shadow-sm bg-white border border-border/50 flex-shrink-0"
                    />
                    <div>
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400">Product image loaded</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Gemini will analyze + use this as the image base</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((prev) => ({ ...prev, originalImage: "" }));
                          setPhotoAnalysis(null);
                        }}
                        className="text-[11px] text-red-500 hover:text-red-600 mt-1 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground mb-2">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium">Drop product photo here</div>
                    <div className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WebP up to 4MB</div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Settings */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                2. Campaign Settings
              </Label>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Product Name *</Label>
                <Input
                  placeholder="e.g. Nike Air Max 97, Premium Leather Wallet"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Type className="h-3 w-3" /> Headline Text (Optional)
                </Label>
                <Input
                  placeholder='e.g. "JUST DO IT" or "FEEL THE DIFFERENCE"'
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                />
              </div>
            </div>

            {/* 3. Style Selector */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-sm font-semibold">3. Visual Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, style: s.id }))}
                    className={cn(
                      "relative text-left rounded-lg border p-2.5 transition-all text-xs",
                      form.style === s.id
                        ? `bg-gradient-to-br ${s.gradient} ${s.border} ring-1 ring-inset ring-violet-500/30`
                        : "border-border/50 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 leading-tight line-clamp-2">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced: Custom Prompt Override */}
            <div className="pt-2 border-t border-border/50">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Wand2 className="h-3 w-3" />
                Advanced: Custom Prompt Override
                {showAdvanced ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Write your own Gemini prompt (overrides AI-generated prompt)
                      </Label>
                      <Textarea
                        placeholder="A stunning professional advertisement for a luxury leather wallet, floating on dark velvet, gold spotlight, 8K, photorealistic..."
                        value={form.customPrompt}
                        onChange={(e) => setForm({ ...form, customPrompt: e.target.value })}
                        className="text-xs resize-none h-24"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={generating ? {} : { scale: 1.02 }}
              whileTap={generating ? {} : { scale: 0.98 }}
              onClick={handleGenerate}
              disabled={generating || !form.productName}
              className="flex w-full items-center justify-center gap-2 rounded-xl h-12 text-sm font-semibold text-white shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gemini is creating your image...</>
              ) : (
                <><Wand2 className="h-4 w-4" /> Generate Marketing Image</>
              )}
            </motion.button>
          </GlassCard>
        </div>

        {/* ── Results Pane ── */}
        <div className="lg:col-span-7 space-y-4">
          <GlassCard className="p-5 min-h-[460px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-violet-500" />
                Generated Result
              </h3>
              {latestResult && (
                <button
                  onClick={() => {
                    setLatestResult(null);
                    setPhotoAnalysis(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> New
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              {generating ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 text-muted-foreground">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse scale-150" />
                    <div className="relative z-10 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse">
                      <Wand2 className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">FLUX is rendering your image</p>
                    <p className="text-xs">Gemini engineers the perfect prompt → FLUX renders at max quality</p>
                    <p className="text-xs text-muted-foreground">This takes ~15–25 seconds — great images take time ✨</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : latestResult ? (
                <div className="space-y-4">
                  {/* Generated Image */}
                  <div className="relative group rounded-xl overflow-hidden border border-border/50 shadow-xl bg-black/5">
                    <img
                      src={latestResult.generatedImage}
                      alt={`Generated poster for ${latestResult.productName}`}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                        <button
                          onClick={() => downloadImage(latestResult.generatedImage, latestResult.productName)}
                          className="flex-1 flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium text-sm hover:bg-white/90 transition-colors shadow-lg"
                        >
                          <Download className="h-4 w-4" /> Download PNG
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Meta tags */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium ring-1 ring-violet-500/20">
                      {latestResult.style}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {latestResult.productName}
                    </span>
                    {latestResult.headline && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        "{latestResult.headline}"
                      </span>
                    )}
                    <span className="ml-auto text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-violet-500" /> FLUX + Gemini
                    </span>
                  </div>

                  {/* Photo Analysis */}
                  {photoAnalysis && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ScanSearch className="h-3 w-3" /> Gemini Product Analysis
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed italic">{photoAnalysis}</p>
                    </div>
                  )}

                  {/* Prompt Used */}
                  <details className="group">
                    <summary className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center gap-1 hover:text-foreground transition-colors">
                      <Wand2 className="h-3 w-3" /> AI Prompt Used (Groq-engineered)
                    </summary>
                    <div className="mt-2 bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-foreground/80 leading-relaxed font-mono">{latestResult.promptUsed}</p>
                    </div>
                  </details>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<Wand2 className="h-10 w-10 text-muted-foreground/30" />}
                    title="Ready to create"
                    description="Upload your product photo, set a style, and let Gemini Pro generate a stunning marketing image."
                  />
                </div>
              )}
            </div>
          </GlassCard>

          {/* History Gallery */}
          {history.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold mb-3 border-b border-border/50 pb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Previous Designs ({history.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30"
                  >
                    <img
                      src={h.generatedImage}
                      alt={h.productName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onClick={() => { setLatestResult(h); setPhotoAnalysis(null); }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                      <button
                        onClick={() => { setLatestResult(h); setPhotoAnalysis(null); }}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => downloadImage(h.generatedImage, h.productName)}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        className="p-1.5 bg-red-500/30 backdrop-blur-sm rounded-full hover:bg-red-500/50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === h.id ? (
                          <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        )}
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium truncate">{h.productName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
