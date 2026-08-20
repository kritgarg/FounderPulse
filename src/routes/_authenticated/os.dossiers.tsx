import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Download, History } from "lucide-react";
import { toast } from "sonner";
import { compileStartupDossier } from "@/lib/startup-dossier.functions";

export const Route = createFileRoute("/_authenticated/os/dossiers")({
  component: DossierViewer,
});

function DossierViewer() {
  const { isStaff, isMentor, isLeadership, founderId: myFounderId, loading } = useAuth();
  const hasFull = isStaff || isMentor || isLeadership;
  const [founders, setFounders] = useState<any[]>([]);
  const [founderId, setFounderId] = useState<string>("");
  const [dossier, setDossier] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const runCompile = useServerFn(compileStartupDossier);

  useEffect(() => {
    if (hasFull) {
      supabase.from("founders").select("id, startup_name").order("startup_name")
        .then(({ data }) => {
          setFounders(data ?? []);
          if (!founderId && data?.[0]) setFounderId(data[0].id);
        });
    } else if (myFounderId) {
      setFounderId(myFounderId);
    }
  }, [hasFull, myFounderId]);

  useEffect(() => {
    if (!founderId) { setDossier(null); setVersions([]); setSelectedVersion(null); return; }
    (async () => {
      const [{ data: cur }, { data: hist }] = await Promise.all([
        supabase.from("startup_dossiers").select("*").eq("founder_id", founderId).maybeSingle(),
        supabase.from("startup_dossier_versions").select("*")
          .eq("founder_id", founderId).order("version", { ascending: false }),
      ]);
      setDossier(cur);
      const rows = hist ?? [];
      // Attach signed URLs for md exports
      const withUrls = await Promise.all(rows.map(async (r: any) => {
        if (!r.markdown_storage_path) return { ...r, downloadUrl: null };
        const { data: s } = await supabase.storage.from("dossiers")
          .createSignedUrl(r.markdown_storage_path, 60 * 30);
        return { ...r, downloadUrl: s?.signedUrl ?? null };
      }));
      setVersions(withUrls);
      setSelectedVersion(withUrls[0] ?? null);
    })();
  }, [founderId, busy]);

  const canRegen = isStaff; // matches server function auth (staff-only)

  async function recompile() {
    if (!founderId) return;
    setBusy(true);
    try {
      const res = await runCompile({ data: { founderId, uploadMarkdown: true } });
      toast.success(`Dossier v${(res as any).version ?? ""} compiled`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }


  const startupName = useMemo(() => founders.find((f) => f.id === founderId)?.startup_name ?? "", [founders, founderId]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!hasFull && !myFounderId) return <Navigate to="/os" replace />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Startup dossier</div>
          <div className="font-display text-2xl tracking-tight">{startupName || "Compiled startup file"}</div>
        </div>
        {hasFull && (
          <Select value={founderId} onValueChange={setFounderId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Founder" /></SelectTrigger>
            <SelectContent>
              {founders.map((f) => <SelectItem key={f.id} value={f.id}>{f.startup_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {dossier && (
          <>
            <Badge variant="outline">Latest v{dossier.version}</Badge>
            <span className="text-xs text-muted-foreground">
              Generated {new Date(dossier.generated_at).toLocaleString()} · {dossier.model}
            </span>
          </>
        )}
        {selectedVersion && dossier && selectedVersion.version !== dossier.version && (
          <Badge className="bg-amber-100 text-amber-900 border-amber-200" variant="outline">
            Viewing v{selectedVersion.version}
          </Badge>
        )}
        <div className="flex-1" />
        {canRegen && (
          <Button size="sm" disabled={busy || !founderId} onClick={recompile}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {busy ? "Compiling…" : dossier ? "Recompile dossier" : "Compile dossier"}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-[0.18em]">
              {selectedVersion ? `v${selectedVersion.version} · ${new Date(selectedVersion.generated_at).toLocaleString()}` : "Compiled sections"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedVersion && !dossier ? (
              <div className="text-sm text-muted-foreground">
                No dossier yet. {canRegen ? "Click 'Compile dossier' to generate one from onboarding + transcripts." : "Ask staff to compile the dossier."}
              </div>
            ) : (
              <article className="prose prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-p:text-sm prose-p:leading-relaxed">
                <ReactMarkdown>{selectedVersion?.markdown ?? dossier?.markdown ?? ""}</ReactMarkdown>
              </article>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none h-fit">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <History className="h-3.5 w-3.5" />
            <CardTitle className="text-sm uppercase tracking-[0.18em]">Version history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.length === 0 && <div className="text-xs text-muted-foreground">No versions yet.</div>}
            {versions.map((v) => {
              const isSel = selectedVersion?.id === v.id;
              return (
                <button key={v.id} onClick={() => setSelectedVersion(v)}
                  className={`w-full text-left border rounded-md px-2.5 py-2 text-xs ${isSel ? "border-foreground bg-muted/60" : "border-border/60 hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">v{v.version}</span>
                    {v.downloadUrl && (
                      <a href={v.downloadUrl} target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-accent hover:underline">
                        <Download className="h-3 w-3" /> md
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(v.generated_at).toLocaleString()}
                  </div>
                  {v.source_summary && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {v.source_summary.transcripts ?? 0} transcripts · {v.source_summary.submissions ?? 0} submissions
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );

}
