"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantConfig } from "@/lib/data-drops/config";
import type { Site } from "@/lib/data-drops/types";
import {
  DataDropsApiError,
  createSite,
  deleteSite,
  listSites,
  updateSite,
} from "@/lib/data-drops/api";
import { Modal } from "./ui/modal";
import { useToast } from "./ui/toast";
import { Field, FormError, inputClass } from "./ui/field";
import { LoadingState, EmptyState, ErrorState } from "./ui/states";
import { SiteOverview } from "./site-overview";

type SelectedSite = Site & { targetDate?: string };

function getParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function SiteSelector({ tenant }: { tenant: TenantConfig }) {
  const toast = useToast();
  const domain = tenant.domain;

  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<SelectedSite | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState({ site_name: "", site_code: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deepLinkHandled = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const fetchSites = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSites(domain);
      setSites(data);
      setError(null);
      return data;
    } catch {
      setError("Failed to load sites. Please try again later.");
      return [] as Site[];
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  // Initial load + email deep-link handling (?site=&date=).
  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchSites();
      if (!active || deepLinkHandled.current) return;

      const linkSite = getParam("site");
      const linkDate = getParam("date");
      if (!linkSite || !linkDate) return;
      deepLinkHandled.current = true;

      const match = data.find(
        (site) => site.site_name.toLowerCase() === linkSite.toLowerCase(),
      );
      if (match) {
        setSelectedSite({ ...match, targetDate: linkDate });
      } else {
        toast({
          type: "info",
          message: `Site "${linkSite}" was not found - it may have been renamed. Please choose the correct site for date ${linkDate}.`,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchSites, toast]);

  function openCreate() {
    setEditingSite(null);
    setForm({ site_name: "", site_code: "" });
    setFormError("");
    setShowFormModal(true);
  }

  function openEdit(site: Site) {
    setEditingSite(site);
    setForm({ site_name: site.site_name, site_code: site.site_code });
    setFormError("");
    setShowFormModal(true);
  }

  function closeForm() {
    setShowFormModal(false);
    setEditingSite(null);
    setForm({ site_name: "", site_code: "" });
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    const siteName = form.site_name.trim();
    const siteCode = form.site_code.trim();
    if (!siteName || !siteCode) {
      setFormError("Both a site name and code are required.");
      return;
    }

    const duplicateCode = sites.some(
      (site) =>
        site.site_code.toLowerCase() === siteCode.toLowerCase() &&
        (!editingSite || site.id !== editingSite.id),
    );
    if (duplicateCode) {
      setFormError("Site code already exists. Please use a different code.");
      return;
    }

    const duplicateName = sites.some(
      (site) =>
        site.site_name.toLowerCase() === siteName.toLowerCase() &&
        (!editingSite || site.id !== editingSite.id),
    );
    if (duplicateName) {
      setFormError("Site name already exists. Please use a different name.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSite) {
        await updateSite(editingSite.id, {
          site_name: siteName,
          site_code: siteCode,
          old_site_name: editingSite.site_name,
          site_domain: domain,
        });
        toast({ type: "success", message: `Updated "${siteName}".` });
      } else {
        await createSite({
          site_name: siteName,
          site_code: siteCode,
          site_domain: domain,
        });
        toast({ type: "success", message: `Added "${siteName}".` });
      }
      await fetchSites();
      closeForm();
    } catch (err) {
      const message =
        err instanceof DataDropsApiError
          ? err.message
          : `Failed to ${editingSite ? "update" : "create"} site. Please try again.`;
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(site: Site) {
    setDeletingSite(site);
    setDeletePassword("");
    setDeleteError("");
  }

  function closeDelete() {
    setDeletingSite(null);
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deletingSite) return;
    if (!deletePassword.trim()) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleting(true);
    try {
      await deleteSite(deletingSite.id, {
        admin_password: deletePassword,
        site_domain: domain,
      });
      const name = deletingSite.site_name;
      await fetchSites();
      closeDelete();
      toast({ type: "success", message: `Site "${name}" has been deleted.` });
    } catch (err) {
      if (err instanceof DataDropsApiError && err.status === 401) {
        setDeleteError("Invalid administrative password.");
      } else {
        setDeleteError("Failed to delete site. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (selectedSite) {
    return (
      <SiteOverview
        tenant={tenant}
        site={selectedSite}
        targetDate={selectedSite.targetDate ?? null}
        onBack={() => setSelectedSite(null)}
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Network Run Confirmations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          {tenant.name}
        </h1>
      </header>

      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Sites</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Site
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading sites" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSites} />
      ) : sites.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No sites yet"
          description="Add your first site to start tracking network run confirmations."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Site
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {sites.map((site) => (
            <motion.li
              key={site.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 transition-colors hover:border-white/25"
            >
              <button
                type="button"
                onClick={() => setSelectedSite(site)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">
                    {site.site_name}
                  </span>
                  <span className="block truncate text-xs text-white/40">
                    {site.site_code}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(site)}
                  title="Edit site"
                  aria-label={`Edit ${site.site_name}`}
                  className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(site)}
                  title="Delete site"
                  aria-label={`Delete ${site.site_name}`}
                  className="rounded-lg p-2 text-white/40 transition-colors hover:bg-primary/15 hover:text-primary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="ml-1 h-4 w-4 text-white/20" />
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal
        open={showFormModal}
        onClose={closeForm}
        title={editingSite ? "Update Site" : "Add New Site"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Site Name" htmlFor="dd-site-name">
            <input
              id="dd-site-name"
              type="text"
              value={form.site_name}
              autoFocus
              onChange={(event) => {
                setForm((prev) => ({ ...prev, site_name: event.target.value }));
                setFormError("");
              }}
              className={inputClass}
              placeholder="e.g. Main Building"
            />
          </Field>
          <Field label="Site Code" htmlFor="dd-site-code">
            <input
              id="dd-site-code"
              type="text"
              value={form.site_code}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, site_code: event.target.value }));
                setFormError("");
              }}
              className={inputClass}
              placeholder="e.g. MB-01"
            />
          </Field>
          <FormError>{formError}</FormError>
          <div className="flex gap-3 pt-1">
            <Button type="submit" size="sm" disabled={submitting} className="flex-1">
              {submitting
                ? "Saving..."
                : editingSite
                  ? "Update Site"
                  : "Create Site"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeForm}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingSite)}
        onClose={closeDelete}
        title="Confirm Deletion"
      >
        {deletingSite ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-white/70">
              <p>
                You are about to permanently delete{" "}
                <span className="font-semibold text-white">
                  {deletingSite.site_name}
                </span>{" "}
                and all of its network run data, history, and settings.
              </p>
              <p className="mt-2 font-semibold text-primary">
                This action cannot be undone.
              </p>
            </div>
            <Field
              label="Administrative Password"
              htmlFor="dd-delete-site-pw"
              hint="If you have forgotten the password, contact web@mckeesecurity.ca"
            >
              <input
                id="dd-delete-site-pw"
                type="password"
                value={deletePassword}
                onChange={(event) => {
                  setDeletePassword(event.target.value);
                  setDeleteError("");
                }}
                className={inputClass}
                placeholder="Enter administrative password"
              />
            </Field>
            <FormError>{deleteError}</FormError>
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeDelete}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
