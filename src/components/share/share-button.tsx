import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Eye, Link2, Loader2, Share2, Trash2, UserRoundPlus, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isValidInviteEmail,
  normalizeInviteEmails,
  type SharedResource,
  type ShareResourceType,
  type ShareSnapshot,
} from "@/lib/share-content";
import {
  deleteShareLink,
  isValidCustomShareSlug,
  loadShareLink,
  normalizeCustomShareSlug,
  saveShareLink,
  type ShareVisibility,
} from "@/lib/share-links";
import { useAuth } from "@/store/auth-context";
import { isDeveloperModeUnlocked } from "@/lib/developer-mode";
import { registerDevSharePreview } from "@/lib/dev-share-preview";
import { useKnowly } from "@/store/knowly";

type ShareButtonProps = {
  resourceType: ShareResourceType;
  resourceId: string;
  title: string;
  payload: ShareSnapshot;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

const RESOURCE_LABELS: Record<ShareResourceType, string> = {
  deck: "deck",
  module: "module",
  course: "course",
  practice_quiz: "practice quiz",
  print_exam: "print exam",
};

export function ShareButton({
  resourceType,
  resourceId,
  title,
  payload,
  variant = "outline",
  size = "sm",
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { state } = useKnowly();
  const canPreview = isDeveloperModeUnlocked() && state.settings.developerMode;

  const previewShareView = () => {
    const previewId = registerDevSharePreview({
      title,
      resourceType,
      payload,
    } satisfies SharedResource);
    if (!previewId) return;
    void navigate({ to: "/share-preview/$previewId", params: { previewId } });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          onClick={() => setOpen(true)}
        >
          <Share2 className="size-4" />
          Share
        </Button>
        {canPreview && (
          <Button
            type="button"
            variant="outline"
            size={size}
            onClick={previewShareView}
            aria-label={`Preview ${RESOURCE_LABELS[resourceType]} as a viewer`}
          >
            <Eye className="size-4" />
            Preview viewer
          </Button>
        )}
      </div>
      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        title={title}
        payload={payload}
      />
    </>
  );
}

function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  title,
  payload,
}: ShareButtonProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { configured, loading: authLoading, user } = useAuth();
  const [visibility, setVisibility] = useState<ShareVisibility>("anyone");
  const [emails, setEmails] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState("");
  const [savedCustomSlug, setSavedCustomSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const normalizedCustomSlug = normalizeCustomShareSlug(customSlug);
  const customSlugValid = !normalizedCustomSlug || isValidCustomShareSlug(normalizedCustomSlug);
  const customSlugChanged = token !== null && normalizedCustomSlug !== (savedCustomSlug ?? "");
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const identifier = normalizedCustomSlug
      ? customSlugValid
        ? normalizedCustomSlug
        : null
      : token;
    return identifier ? `${window.location.origin}/share/${identifier}` : "";
  }, [customSlugValid, normalizedCustomSlug, token]);
  const canCopyShareUrl = Boolean(token && shareUrl && !customSlugChanged);

  useEffect(() => {
    if (!open || !user || !configured) return;
    let active = true;
    setLoading(true);
    setToken(null);
    setCustomSlug("");
    setSavedCustomSlug(null);
    setVisibility("anyone");
    setEmails([]);
    setError(null);
    void loadShareLink(user.id, resourceType, resourceId)
      .then((existing) => {
        if (!active) return;
        setToken(existing?.token ?? null);
        setCustomSlug(existing?.customSlug ?? "");
        setSavedCustomSlug(existing?.customSlug ?? null);
        setVisibility(existing?.visibility ?? "anyone");
        setEmails(existing?.allowedEmails ?? []);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        console.error("[Sharing] Could not load share settings:", loadError);
        setError("Could not load this resource's sharing settings. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [configured, open, resourceId, resourceType, user]);

  const addEmail = () => {
    const candidate = email.trim().toLowerCase();
    if (!isValidInviteEmail(candidate)) {
      setError("Enter a valid email address before adding someone.");
      return;
    }
    if (emails.includes(candidate)) {
      setEmail("");
      setError(null);
      return;
    }
    if (emails.length >= 50) {
      setError("A share link can be restricted to at most 50 people.");
      return;
    }
    setEmails((current) => normalizeInviteEmails([...current, candidate]));
    setEmail("");
    setError(null);
  };

  const save = async () => {
    if (!user) {
      const message = "Sign in to create or manage share links.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!customSlugValid) {
      const message =
        "Custom URLs must be 3–40 characters using lowercase letters, numbers, or hyphens.";
      setError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveShareLink({
        ownerId: user.id,
        resourceType,
        resourceId,
        title,
        payload,
        visibility,
        allowedEmails: emails,
        customSlug: normalizedCustomSlug,
        existingToken: token ?? undefined,
      });
      setToken(saved.token);
      setCustomSlug(saved.customSlug ?? "");
      setSavedCustomSlug(saved.customSlug);
      setVisibility(saved.visibility);
      setEmails(saved.allowedEmails);
      toast.success(token ? "Sharing settings updated" : "Share link created");
    } catch (saveError) {
      console.error("[Sharing] Could not save share link:", saveError);
      const message =
        saveError instanceof Error ? saveError.message : "Could not save this share link.";
      setError(message);
      toast.error("Could not update sharing", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!canCopyShareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch (copyError) {
      console.error("[Sharing] Could not copy share link:", copyError);
      setError("The link is ready, but your browser could not copy it. Select and copy the link.");
      toast.error("Could not copy the share link");
    }
  };

  const removeLink = async () => {
    if (!user) {
      const message = "Sign in to remove this share link.";
      setError(message);
      toast.error(message);
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      await deleteShareLink(user.id, resourceType, resourceId);
      setToken(null);
      setCustomSlug("");
      setSavedCustomSlug(null);
      setVisibility("anyone");
      setEmails([]);
      setConfirmRemove(false);
      toast.success("Share link removed");
    } catch (removeError) {
      console.error("[Sharing] Could not remove share link:", removeError);
      const message =
        removeError instanceof Error ? removeError.message : "Could not remove this share link.";
      setError(message);
      toast.error("Could not remove the share link", { description: message });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              Share {RESOURCE_LABELS[resourceType]}
            </DialogTitle>
            <DialogDescription className="break-words">{title}</DialogDescription>
          </DialogHeader>

          {authLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking your account…
            </div>
          ) : !configured ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">Cloud sharing isn’t configured</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Share links require a Supabase-backed Knowly account. Local-only accounts cannot
                create or manage links.
              </p>
            </div>
          ) : !user ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium">Sign in to create or manage share links</p>
              <p className="text-xs leading-5 text-muted-foreground">
                You can view an “Anyone with the link” share without an account, but only signed-in
                Knowly users can create or change one.
              </p>
              <Button asChild size="sm">
                <Link to="/login">Sign in to Knowly</Link>
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading sharing settings…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold" htmlFor="share-access">
                  General access
                </label>
                <Select
                  value={visibility}
                  onValueChange={(value) => {
                    if (value === "anyone" || value === "restricted") {
                      setVisibility(value);
                      setError(null);
                    }
                  }}
                >
                  <SelectTrigger id="share-access">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anyone">Anyone with the link</SelectItem>
                    <SelectItem value="restricted">Restricted to invited accounts</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {visibility === "anyone"
                    ? "Anyone who has the link can view this resource, even without a Knowly account."
                    : "Only you and invited people signed in with a confirmed matching email can view it."}
                </p>
              </div>

              {visibility === "restricted" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="share-email">
                    Invite people
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="share-email"
                      type="email"
                      value={email}
                      placeholder="student@example.com"
                      onChange={(event) => setEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addEmail();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addEmail}
                      aria-label="Add email"
                    >
                      <UserRoundPlus className="size-4" />
                    </Button>
                  </div>
                  {emails.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {emails.map((address) => (
                        <li
                          key={address}
                          className="flex items-center gap-1 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-xs"
                        >
                          {address}
                          <button
                            type="button"
                            aria-label={`Remove ${address}`}
                            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() =>
                              setEmails((current) => current.filter((item) => item !== address))
                            }
                          >
                            <X className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Invited people need a Knowly account using one of these confirmed email
                    addresses.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold" htmlFor="share-custom-slug">
                  Custom URL (optional)
                </label>
                <Input
                  id="share-custom-slug"
                  value={customSlug}
                  maxLength={40}
                  placeholder="biology-review"
                  onChange={(event) => {
                    setCustomSlug(event.target.value.toLowerCase());
                    setError(null);
                  }}
                  aria-invalid={!customSlugValid}
                />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Choose a unique 3–40 character suffix using letters, numbers, and hyphens. Leave
                  blank to use a private random URL.
                </p>
                {!customSlugValid && (
                  <p className="text-[11px] text-destructive">
                    Use 3–40 lowercase letters, numbers, or hyphens; start and end with a letter or
                    number.
                  </p>
                )}
              </div>

              {shareUrl && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="share-link">
                    {token ? "Share link · Viewer" : "Custom URL preview"}
                  </label>
                  <div className="flex gap-2">
                    <Input id="share-link" readOnly value={shareUrl} className="min-w-0" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyLink}
                      disabled={!canCopyShareUrl}
                      aria-label="Copy share link"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  {customSlugChanged ? (
                    <p className="text-[11px] text-muted-foreground">
                      Save access to activate this updated URL before copying it.
                    </p>
                  ) : !token ? (
                    <p className="text-[11px] text-muted-foreground">
                      Create the share link to activate this URL.
                    </p>
                  ) : null}
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                {token ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={saving || removing}
                    onClick={() => setConfirmRemove(true)}
                  >
                    <Trash2 className="size-4" /> Remove link
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">View-only access</span>
                )}
                <Button
                  type="button"
                  disabled={
                    loading ||
                    saving ||
                    removing ||
                    !customSlugValid ||
                    (visibility === "restricted" && !emails.length)
                  }
                  onClick={() => void save()}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : token ? (
                    <Check className="size-4" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  {saving ? "Saving…" : token ? "Save access" : "Create link"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove this share link?"
        description="Anyone using the link will lose access. You can create a new link later."
        confirmLabel={removing ? "Removing…" : "Remove link"}
        destructive
        onConfirm={() => void removeLink()}
      />
    </>
  );
}
