"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Mail, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TenantConfig } from "@/lib/data-drops/config";
import type { Run, SignaturePair } from "@/lib/data-drops/types";
import {
  DataDropsApiError,
  REVOKE_SIGNATURE,
  addDrop,
  deleteDrop,
  getDates,
  getDropsByDate,
  initializeSite,
  notifySigner,
  updateDate,
  updateDrop,
  updateSignature,
} from "@/lib/data-drops/api";
import { signedStatus, toYmd, ymdToLong } from "@/lib/data-drops/dates";
import { Modal } from "./ui/modal";
import { useToast } from "./ui/toast";
import { Field, FormError, inputClass } from "./ui/field";
import { LoadingState } from "./ui/states";
import { StatusDot } from "./ui/status";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function NetworkRunDetails({
  tenant,
  siteName,
  date,
  isNewDay: initialIsNewDay,
  onBack,
}: {
  tenant: TenantConfig;
  siteName: string;
  date: string;
  isNewDay: boolean;
  onBack: (shouldRefresh?: boolean, newDate?: string | null) => void;
}) {
  const toast = useToast();
  const domain = tenant.domain;

  const [entryDate, setEntryDate] = useState(date);
  const [isNewDay, setIsNewDay] = useState(initialIsNewDay);
  const [isLoading, setIsLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [dataModified, setDataModified] = useState(false);

  const [signatures, setSignatures] = useState<SignaturePair>({
    signature_tech: null,
    signature_admin: null,
  });
  const [reqSignatureDate, setReqSignatureDate] = useState<string | null>(null);
  const [reqSignatureEmail, setReqSignatureEmail] = useState<string | null>(null);
  const [isSignatureRequested, setIsSignatureRequested] = useState(false);

  // Add run modal
  const [showAddRun, setShowAddRun] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", location: "", techs: "" });
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit run modal
  const [editForm, setEditForm] = useState<{
    label: string;
    location: string;
    techs: string;
    date: string;
  } | null>(null);
  const [originalLabel, setOriginalLabel] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Date edit modal
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [dateValue, setDateValue] = useState(toYmd(date));
  const [dateSubmitting, setDateSubmitting] = useState(false);

  // Delete run modal
  const [runToDelete, setRunToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Signature modal
  const [signatureType, setSignatureType] = useState<"tech" | "admin" | null>(null);
  const [signatureValue, setSignatureValue] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const [signatureSubmitting, setSignatureSubmitting] = useState(false);

  // Notify signer
  const [signerEmail, setSignerEmail] = useState("");
  const [isNotifying, setIsNotifying] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (getParam("action") === "sign") setIsSignatureRequested(true);
  }, []);

  useEffect(() => {
    setEntryDate(date);
    setDateValue(toYmd(date));
  }, [date]);

  useEffect(() => {
    setIsNewDay(initialIsNewDay);
  }, [initialIsNewDay]);

  const fetchRuns = useCallback(async () => {
    if (isNewDay) {
      setRuns([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const adjusted = new Date(`${toYmd(entryDate)}T12:00:00Z`)
        .toISOString()
        .split("T")[0];
      const data = await getDropsByDate(siteName, adjusted, domain);
      if (data.success && Array.isArray(data.dropsData)) {
        setRuns(
          data.dropsData.map((drop) => ({
            label: drop.data_label,
            location: drop.data_location,
            techs: drop.data_techs || "",
          })),
        );
      } else {
        setRuns([]);
      }
    } catch {
      setRuns([]);
    } finally {
      setIsLoading(false);
    }
  }, [siteName, entryDate, domain, isNewDay]);

  const fetchSignatures = useCallback(async () => {
    try {
      const data = await getDates(siteName, domain);
      if (!data.success || !Array.isArray(data.dateData)) return;
      const longDate = ymdToLong(entryDate);
      const entry = data.dateData.find((item) => item.date === longDate);
      if (entry) {
        setSignatures({
          signature_tech: entry.signature_tech,
          signature_admin: entry.signature_admin,
        });
        setReqSignatureDate(entry.req_signature_date || null);
        setReqSignatureEmail(entry.req_signature_email || null);
      } else {
        setSignatures({ signature_tech: null, signature_admin: null });
        setReqSignatureDate(null);
        setReqSignatureEmail(null);
      }
    } catch {
      // Non-fatal: signature panel just stays empty.
    }
  }, [siteName, entryDate, domain]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const status = signedStatus(signatures.signature_tech, signatures.signature_admin);

  /* ----------------------------- Add run ----------------------------- */
  function openAddRun() {
    setAddForm({ label: "", location: "", techs: "" });
    setAddError("");
    setShowAddRun(true);
  }

  async function handleAddRun(event: React.FormEvent) {
    event.preventDefault();
    setAddError("");
    const label = addForm.label.trim();
    const location = addForm.location.trim();
    const techs = addForm.techs.trim();
    if (!label || !location || !techs) {
      setAddError("Label, location, and techs are all required.");
      return;
    }
    setAddSubmitting(true);
    try {
      if (runs.length === 0) {
        try {
          await initializeSite({
            site_name: siteName,
            date: entryDate,
            site_domain: domain,
          });
        } catch (err) {
          // 409 = already initialized for this date; safe to continue.
          if (!(err instanceof DataDropsApiError && err.status === 409)) throw err;
        }
      }

      await addDrop({
        site_name: siteName,
        data_label: label,
        data_location: location,
        data_techs: techs || null,
        date: entryDate,
        site_domain: domain,
      });

      setShowAddRun(false);
      setDataModified(true);
      if (isNewDay) setIsNewDay(false);

      // Adding a run invalidates a prior admin approval.
      if (signatures.signature_admin) {
        try {
          await updateSignature({
            site_name: siteName,
            date: toYmd(entryDate),
            site_domain: domain,
            signature_admin: REVOKE_SIGNATURE,
          });
          setSignatures((prev) => ({ ...prev, signature_admin: null }));
          toast({
            type: "info",
            message:
              "Administrator signature was reset because a new run was added; it needs re-approval.",
          });
        } catch {
          // Non-fatal.
        }
      }

      await fetchRuns();
      await fetchSignatures();
    } catch (err) {
      if (err instanceof DataDropsApiError && err.status === 409) {
        setAddError(`Label "${label}" already exists for this site.`);
      } else {
        setAddError("Failed to add new run. Please try again.");
      }
    } finally {
      setAddSubmitting(false);
    }
  }

  /* ----------------------------- Edit run ----------------------------- */
  function openEditRun(run: Run) {
    setOriginalLabel(run.label);
    setEditForm({
      label: run.label,
      location: run.location,
      techs: run.techs,
      date: toYmd(entryDate),
    });
    setEditError("");
  }

  async function handleEditRun(event: React.FormEvent) {
    event.preventDefault();
    if (!editForm) return;
    setEditError("");
    if (
      !editForm.label.trim() ||
      !editForm.location.trim() ||
      !editForm.techs.trim() ||
      !editForm.date
    ) {
      setEditError("All fields are required.");
      return;
    }
    setEditSubmitting(true);
    try {
      await updateDrop({
        site_name: siteName,
        old_label: originalLabel,
        new_label: editForm.label.trim(),
        location: editForm.location.trim(),
        techs_data: editForm.techs.trim(),
        date: toYmd(editForm.date),
        site_domain: domain,
      });
      setDataModified(true);
      await fetchRuns();
      await fetchSignatures();
      setEditForm(null);
      setOriginalLabel("");
    } catch (err) {
      if (err instanceof DataDropsApiError && err.status === 409) {
        setEditError("A drop with this label already exists.");
      } else if (err instanceof DataDropsApiError && err.status === 404) {
        setEditError("Drop not found with the specified label.");
      } else {
        setEditError("Failed to update run. Please try again.");
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  /* ----------------------------- Edit date ----------------------------- */
  async function handleDateSave(event: React.FormEvent) {
    event.preventDefault();
    setDateSubmitting(true);
    try {
      await updateDate({
        site_name: siteName,
        old_date: toYmd(entryDate),
        new_date: toYmd(dateValue),
        site_domain: domain,
      });
      setShowDateEdit(false);
      setEntryDate(toYmd(dateValue));
      setDataModified(true);
      toast({ type: "success", message: "Date updated." });
    } catch (err) {
      toast({
        type: "error",
        message:
          err instanceof DataDropsApiError ? err.message : "Failed to update date.",
      });
    } finally {
      setDateSubmitting(false);
    }
  }

  /* ----------------------------- Delete run ----------------------------- */
  async function handleDeleteRun() {
    if (!runToDelete) return;
    if (!deletePassword.trim()) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleting(true);
    try {
      await deleteDrop({
        site_name: siteName,
        data_label: runToDelete,
        admin_password: deletePassword,
        site_domain: domain,
      });
      setDataModified(true);
      const wasLast = runs.length <= 1;
      setRunToDelete(null);
      setDeletePassword("");
      setDeleteError("");
      if (wasLast) {
        toast({ type: "success", message: "Run deleted." });
        onBack(true, null);
        return;
      }
      await fetchRuns();
      await fetchSignatures();
      toast({ type: "success", message: "Run deleted." });
    } catch (err) {
      if (err instanceof DataDropsApiError && err.status === 401) {
        setDeleteError("Invalid administrative password.");
      } else {
        setDeleteError("Failed to delete run. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  /* ----------------------------- Notify signer ----------------------------- */
  async function handleNotify(event: React.FormEvent) {
    event.preventDefault();
    const email = signerEmail.trim();
    if (!EMAIL_RE.test(email)) {
      toast({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    setIsNotifying(true);
    try {
      await notifySigner({
        email,
        site_name: siteName,
        date: toYmd(entryDate),
        domain: tenant.slug,
        site_domain: domain,
      });
      setSignerEmail("");
      setReqSignatureDate(new Date().toISOString().split("T")[0]);
      setReqSignatureEmail(email);
      toast({ type: "success", message: "Signature request sent." });
    } catch (err) {
      toast({
        type: "error",
        message:
          err instanceof DataDropsApiError
            ? err.message
            : "Failed to send signature request.",
      });
    } finally {
      setIsNotifying(false);
    }
  }

  /* ----------------------------- Signatures ----------------------------- */
  function openSignature(type: "tech" | "admin") {
    setSignatureType(type);
    setSignatureValue(
      (type === "tech" ? signatures.signature_tech : signatures.signature_admin) || "",
    );
    setSignatureError("");
  }

  async function handleSaveSignature(event: React.FormEvent) {
    event.preventDefault();
    if (!signatureType) return;
    if (!signatureValue.trim()) {
      setSignatureError("Please enter a signature.");
      return;
    }
    setSignatureSubmitting(true);
    try {
      await updateSignature({
        site_name: siteName,
        date: toYmd(entryDate),
        site_domain: domain,
        ...(signatureType === "tech"
          ? { signature_tech: signatureValue.trim() }
          : { signature_admin: signatureValue.trim() }),
      });
      setSignatures((prev) => ({
        ...prev,
        ...(signatureType === "tech"
          ? { signature_tech: signatureValue.trim() }
          : { signature_admin: signatureValue.trim() }),
      }));
      setDataModified(true);
      setSignatureType(null);
      await fetchSignatures();
    } catch {
      setSignatureError("Failed to save signature. Please try again.");
    } finally {
      setSignatureSubmitting(false);
    }
  }

  async function handleRevokeSignature() {
    if (!signatureType) return;
    setSignatureSubmitting(true);
    try {
      await updateSignature({
        site_name: siteName,
        date: toYmd(entryDate),
        site_domain: domain,
        ...(signatureType === "tech"
          ? { signature_tech: REVOKE_SIGNATURE }
          : { signature_admin: REVOKE_SIGNATURE }),
      });
      const label = signatureType === "tech" ? "Technician" : "Administrator";
      setSignatures((prev) => ({
        ...prev,
        ...(signatureType === "tech"
          ? { signature_tech: null }
          : { signature_admin: null }),
      }));
      setDataModified(true);
      setSignatureType(null);
      await fetchSignatures();
      toast({ type: "info", message: `${label} signature revoked.` });
    } catch {
      toast({ type: "error", message: "Failed to revoke signature." });
    } finally {
      setSignatureSubmitting(false);
    }
  }

  const showRequestBanner =
    isSignatureRequested && Boolean(reqSignatureDate) && Boolean(reqSignatureEmail);
  const showRequestStatus =
    Boolean(reqSignatureDate) &&
    Boolean(reqSignatureEmail) &&
    (!signatures.signature_tech || !signatures.signature_admin);

  return (
    <div>
      <button
        type="button"
        onClick={() => onBack(dataModified)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {siteName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <StatusDot status={status} className="h-3 w-3" />
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {ymdToLong(entryDate)}
          </h1>
          <button
            type="button"
            onClick={() => {
              setDateValue(toYmd(entryDate));
              setShowDateEdit(true);
            }}
            title="Edit date"
            aria-label="Edit date"
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mb-5">
        <Button size="sm" onClick={openAddRun}>
          <Plus className="h-4 w-4" />
          Add New Run
        </Button>
      </div>

      {showRequestBanner ? (
        <div className="mb-5 rounded-xl border-l-4 border-secondary bg-secondary/10 px-4 py-3 text-sm text-sky-200">
          A signature has been requested. Please review the runs for this date, then
          sign below.
        </div>
      ) : null}

      {/* Runs */}
      {isLoading ? (
        <LoadingState label="Loading runs" />
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/50">
          No runs added yet. Click &quot;Add New Run&quot; to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-[1fr_1.4fr_1fr_auto] gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/40 sm:grid">
            <span>Label</span>
            <span>Location</span>
            <span>Techs</span>
            <span className="w-16 text-right">Actions</span>
          </div>
          <ul>
            {runs.map((run, index) => (
              <motion.li
                key={`${run.label}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 sm:grid sm:grid-cols-[1fr_1.4fr_1fr_auto]">
                  <button
                    type="button"
                    onClick={() => openEditRun(run)}
                    className="flex min-w-0 flex-1 flex-col text-left sm:contents"
                  >
                    <span className="truncate font-semibold text-white">
                      {run.label}
                    </span>
                    <span className="truncate text-sm text-white/60">
                      {run.location}
                    </span>
                    <span className="truncate text-sm text-white/50">
                      {run.techs}
                    </span>
                  </button>
                  <div className="flex w-16 shrink-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditRun(run)}
                      title="Edit run"
                      aria-label={`Edit ${run.label}`}
                      className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRunToDelete(run.label);
                        setDeletePassword("");
                        setDeleteError("");
                      }}
                      title="Delete run"
                      aria-label={`Delete ${run.label}`}
                      className="rounded-lg p-2 text-white/40 transition-colors hover:bg-primary/15 hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Request Signature */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-surface p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Mail className="h-4 w-4 text-primary" />
          Request Signature
        </h3>
        <form onSubmit={handleNotify} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={signerEmail}
            onChange={(event) => setSignerEmail(event.target.value)}
            placeholder="Enter signer's email address"
            disabled={isNotifying}
            className={inputClass}
          />
          <Button type="submit" size="sm" disabled={isNotifying} className="sm:w-auto">
            {isNotifying ? "Sending..." : "Notify Signer"}
          </Button>
        </form>
      </div>

      {/* Signatures */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-5">
        <p className="mb-4 text-sm text-white/60">
          By signing below, I confirm that all terminations are labelled and tested as
          per the standards set by the hospital administration.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["tech", "admin"] as const).map((type) => {
            const value =
              type === "tech"
                ? signatures.signature_tech
                : signatures.signature_admin;
            return (
              <button
                key={type}
                type="button"
                onClick={() => openSignature(type)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border px-4 py-6 text-center transition-colors",
                  value
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                    : "border-dashed border-white/15 hover:border-white/35",
                )}
              >
                <span
                  className={cn(
                    "font-accent text-2xl leading-none",
                    value ? "text-white" : "text-white/30",
                  )}
                >
                  {value || "Click to sign"}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
                  <PenLine className="h-3.5 w-3.5" />
                  {type === "tech" ? "Technician" : "Administrator"}
                </span>
              </button>
            );
          })}
        </div>
        {showRequestStatus ? (
          <div className="mt-4 rounded-lg border-l-4 border-secondary bg-secondary/10 px-4 py-3 text-sm text-sky-200">
            Signature requested from <b>{reqSignatureEmail}</b> on{" "}
            <b>{reqSignatureDate}</b>. Waiting for signer.
          </div>
        ) : null}
      </div>

      {/* Add Run Modal */}
      <Modal open={showAddRun} onClose={() => setShowAddRun(false)} title="Add New Run">
        <form onSubmit={handleAddRun} className="space-y-4">
          <Field label="Label" htmlFor="dd-add-label">
            <input
              id="dd-add-label"
              type="text"
              autoFocus
              value={addForm.label}
              onChange={(event) => {
                setAddForm((prev) => ({ ...prev, label: event.target.value }));
                setAddError("");
              }}
              className={inputClass}
              placeholder="e.g. A-204"
            />
          </Field>
          <Field label="Location" htmlFor="dd-add-location">
            <input
              id="dd-add-location"
              type="text"
              value={addForm.location}
              onChange={(event) => {
                setAddForm((prev) => ({ ...prev, location: event.target.value }));
                setAddError("");
              }}
              className={inputClass}
              placeholder="e.g. 2nd floor nurse station"
            />
          </Field>
          <Field label="Techs" htmlFor="dd-add-techs">
            <input
              id="dd-add-techs"
              type="text"
              value={addForm.techs}
              onChange={(event) => {
                setAddForm((prev) => ({ ...prev, techs: event.target.value }));
                setAddError("");
              }}
              className={inputClass}
              placeholder="e.g. AR, TD, BM"
            />
          </Field>
          <FormError>{addError}</FormError>
          <div className="flex gap-3 pt-1">
            <Button type="submit" size="sm" disabled={addSubmitting} className="flex-1">
              {addSubmitting ? "Adding..." : "Add Run"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddRun(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Run Modal */}
      <Modal
        open={Boolean(editForm)}
        onClose={() => setEditForm(null)}
        title="Edit Run"
      >
        {editForm ? (
          <form onSubmit={handleEditRun} className="space-y-4">
            <Field label="Label" htmlFor="dd-edit-label">
              <input
                id="dd-edit-label"
                type="text"
                value={editForm.label}
                onChange={(event) => {
                  setEditForm((prev) => prev && { ...prev, label: event.target.value });
                  setEditError("");
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Location" htmlFor="dd-edit-location">
              <input
                id="dd-edit-location"
                type="text"
                value={editForm.location}
                onChange={(event) => {
                  setEditForm(
                    (prev) => prev && { ...prev, location: event.target.value },
                  );
                  setEditError("");
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Techs" htmlFor="dd-edit-techs">
              <input
                id="dd-edit-techs"
                type="text"
                value={editForm.techs}
                onChange={(event) => {
                  setEditForm((prev) => prev && { ...prev, techs: event.target.value });
                  setEditError("");
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Date" htmlFor="dd-edit-date">
              <input
                id="dd-edit-date"
                type="date"
                value={editForm.date}
                onChange={(event) => {
                  setEditForm((prev) => prev && { ...prev, date: event.target.value });
                  setEditError("");
                }}
                className={cn(inputClass, "[color-scheme:dark]")}
              />
            </Field>
            <FormError>{editError}</FormError>
            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={editSubmitting}
                className="flex-1"
              >
                {editSubmitting ? "Saving..." : "Confirm Edit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditForm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Date Edit Modal */}
      <Modal open={showDateEdit} onClose={() => setShowDateEdit(false)} title="Edit Date">
        <form onSubmit={handleDateSave} className="space-y-4">
          <Field label="Date" htmlFor="dd-date">
            <input
              id="dd-date"
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className={cn(inputClass, "[color-scheme:dark]")}
            />
          </Field>
          <div className="flex gap-3 pt-1">
            <Button type="submit" size="sm" disabled={dateSubmitting} className="flex-1">
              {dateSubmitting ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDateEdit(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Run Modal */}
      <Modal
        open={Boolean(runToDelete)}
        onClose={() => setRunToDelete(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Are you sure you want to delete the data run{" "}
            <span className="font-semibold text-white">&quot;{runToDelete}&quot;</span>?
          </p>
          <Field
            label="Administrative Password"
            htmlFor="dd-delete-run-pw"
            hint="If you have forgotten the password, contact web@mckeesecurity.ca"
          >
            <input
              id="dd-delete-run-pw"
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
              onClick={handleDeleteRun}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRunToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Signature Modal */}
      <Modal
        open={Boolean(signatureType)}
        onClose={() => setSignatureType(null)}
        title={
          signatureType === "tech"
            ? "Technician Signature"
            : "Administrator Signature"
        }
      >
        <form onSubmit={handleSaveSignature} className="space-y-4">
          <Field label="Type your name" htmlFor="dd-signature">
            <input
              id="dd-signature"
              type="text"
              autoFocus
              value={signatureValue}
              onChange={(event) => {
                setSignatureValue(event.target.value);
                setSignatureError("");
              }}
              className={inputClass}
              placeholder="Type your name here"
            />
          </Field>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-center">
            <p className="mb-1 text-xs uppercase tracking-wide text-white/40">
              Preview
            </p>
            <p className="font-accent text-2xl text-white">
              {signatureValue || "Your signature will appear here"}
            </p>
          </div>
          <FormError>{signatureError}</FormError>
          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={signatureSubmitting}
              className="flex-1"
            >
              {signatureSubmitting ? "Saving..." : "Save Signature"}
            </Button>
            {(signatureType === "tech" && signatures.signature_tech) ||
            (signatureType === "admin" && signatures.signature_admin) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevokeSignature}
                disabled={signatureSubmitting}
                className="flex-1"
              >
                Revoke
              </Button>
            ) : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}
