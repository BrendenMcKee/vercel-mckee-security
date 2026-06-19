export type SignatureStatus = 0 | 1 | 2; // 0 = none, 1 = partial, 2 = full

export type Site = {
  id: number;
  site_name: string;
  site_code: string;
  site_domain: string;
  created_at?: string;
};

/** A `date_data` row as returned by the date endpoint (date is "Month D, YYYY"). */
export type DateEntry = {
  id: number;
  date: string;
  total_drops: number;
  signature_tech: string | null;
  signature_admin: string | null;
  req_signature_date: string | null;
  req_signature_email: string | null;
  site_domain: string;
};

/** A `drops_data` row. `date` may be "YYYY-MM-DD" or an ISO timestamp. */
export type Drop = {
  id: number;
  data_label: string;
  data_location: string;
  data_techs: string | null;
  data_description?: string | null;
  data_device?: string | null;
  date: string;
  site_domain: string;
  signature_tech?: string | null;
  signature_admin?: string | null;
};

/** View model for a row in the date list. */
export type RunDay = {
  id: number;
  /** "Month D, YYYY" display date. */
  date: string;
  signed: SignatureStatus;
  drops: number;
};

/** View model for a single run row. */
export type Run = {
  label: string;
  location: string;
  techs: string;
  device: string;
};

export type SignaturePair = {
  signature_tech: string | null;
  signature_admin: string | null;
};
