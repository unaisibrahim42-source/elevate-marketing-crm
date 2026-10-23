type SocialLinks = { instagram?: string | null; linkedin?: string | null; tiktok?: string | null; facebook?: string | null };

export type ClientFormDefaults = {
  businessName?: string;
  tradingName?: string | null;
  industry?: string | null;
  description?: string | null;
  address?: string | null;
  website?: string | null;
  socials?: string | null;
  mainContactName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
  internalNotes?: string | null;
  servicePackage?: string | null;
  servicesProvided?: string | null;
  monthlyRetainerPence?: number | null;
  oneOffFeesPence?: number | null;
  billingFrequency?: string | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
  renewalDate?: Date | null;
  noticePeriodDays?: number | null;
  contractStatus?: string | null;
  assignedTeamMemberId?: string | null;
  onboardingDate?: Date | null;
  status?: string | null;
  objectives?: string | null;
  priorities?: string | null;
  nextReviewDate?: Date | null;
};

function toInputDate(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default function ClientForm({
  action,
  defaults = {},
  teamMembers,
  submitLabel = "Save Client",
}: {
  action: (formData: FormData) => void;
  defaults?: ClientFormDefaults;
  teamMembers: { id: string; name: string }[];
  submitLabel?: string;
}) {
  let socials: SocialLinks = {};
  try {
    socials = defaults.socials ? JSON.parse(defaults.socials) : {};
  } catch {
    socials = {};
  }
  let services = "";
  try {
    services = defaults.servicesProvided ? JSON.parse(defaults.servicesProvided).join(", ") : "";
  } catch {
    services = "";
  }

  return (
    <form action={action} className="space-y-6">
      <FormSection title="Business Information">
        <Grid>
          <Field label="Business name" name="businessName" defaultValue={defaults.businessName} required />
          <Field label="Trading name" name="tradingName" defaultValue={defaults.tradingName ?? ""} />
          <Field label="Industry" name="industry" defaultValue={defaults.industry ?? ""} />
          <Field label="Website" name="website" defaultValue={defaults.website ?? ""} />
          <Field label="Address" name="address" defaultValue={defaults.address ?? ""} className="sm:col-span-2" />
          <TextArea label="Business description" name="description" defaultValue={defaults.description ?? ""} className="sm:col-span-2" />
          <Field label="Instagram" name="social_instagram" defaultValue={socials.instagram ?? ""} />
          <Field label="LinkedIn" name="social_linkedin" defaultValue={socials.linkedin ?? ""} />
          <Field label="TikTok" name="social_tiktok" defaultValue={socials.tiktok ?? ""} />
          <Field label="Facebook" name="social_facebook" defaultValue={socials.facebook ?? ""} />
        </Grid>
      </FormSection>

      <FormSection title="Contact Information">
        <Grid>
          <Field label="Main contact name" name="mainContactName" defaultValue={defaults.mainContactName ?? ""} />
          <Field label="Job title" name="jobTitle" defaultValue={defaults.jobTitle ?? ""} />
          <Field label="Email" name="email" type="email" defaultValue={defaults.email ?? ""} />
          <Field label="Phone" name="phone" defaultValue={defaults.phone ?? ""} />
          <Select
            label="Preferred communication"
            name="preferredContact"
            defaultValue={defaults.preferredContact ?? ""}
            options={["EMAIL", "PHONE", "WHATSAPP"]}
          />
          <TextArea label="Internal notes" name="internalNotes" defaultValue={defaults.internalNotes ?? ""} className="sm:col-span-2" />
        </Grid>
      </FormSection>

      <FormSection title="Commercial Information">
        <Grid>
          <Field label="Service package" name="servicePackage" defaultValue={defaults.servicePackage ?? ""} />
          <Field label="Services provided (comma separated)" name="servicesProvided" defaultValue={services} className="sm:col-span-2" />
          <Field label="Monthly retainer (£)" name="monthlyRetainer" type="number" step="0.01" defaultValue={defaults.monthlyRetainerPence != null ? defaults.monthlyRetainerPence / 100 : ""} />
          <Field label="One-off fees (£)" name="oneOffFees" type="number" step="0.01" defaultValue={defaults.oneOffFeesPence != null ? defaults.oneOffFeesPence / 100 : ""} />
          <Select
            label="Billing frequency"
            name="billingFrequency"
            defaultValue={defaults.billingFrequency ?? ""}
            options={["MONTHLY", "QUARTERLY", "ONE_OFF", "ANNUAL"]}
          />
          <Field label="Contract start" name="contractStart" type="date" defaultValue={toInputDate(defaults.contractStart)} />
          <Field label="Contract end" name="contractEnd" type="date" defaultValue={toInputDate(defaults.contractEnd)} />
          <Field label="Renewal date" name="renewalDate" type="date" defaultValue={toInputDate(defaults.renewalDate)} />
          <Field label="Notice period (days)" name="noticePeriodDays" type="number" defaultValue={defaults.noticePeriodDays ?? ""} />
          <Select
            label="Contract status"
            name="contractStatus"
            defaultValue={defaults.contractStatus ?? "DRAFT"}
            options={["DRAFT", "AWAITING_SIGNATURE", "ACTIVE", "EXPIRED", "TERMINATED"]}
          />
          <Select
            label="Assigned team member"
            name="assignedTeamMemberId"
            defaultValue={defaults.assignedTeamMemberId ?? ""}
            options={teamMembers.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Grid>
      </FormSection>

      <FormSection title="Management Information">
        <Grid>
          <Field label="Onboarding date" name="onboardingDate" type="date" defaultValue={toInputDate(defaults.onboardingDate)} />
          <Select
            label="Client status"
            name="status"
            defaultValue={defaults.status ?? "ONBOARDING"}
            options={["ONBOARDING", "ACTIVE", "INACTIVE", "COMPLETED", "ARCHIVED"]}
          />
          <Field label="Next review date" name="nextReviewDate" type="date" defaultValue={toInputDate(defaults.nextReviewDate)} />
          <TextArea label="Objectives" name="objectives" defaultValue={defaults.objectives ?? ""} className="sm:col-span-2" />
          <TextArea label="Current priorities" name="priorities" defaultValue={defaults.priorities ?? ""} className="sm:col-span-2" />
        </Grid>
      </FormSection>

      <div className="flex gap-3">
        <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="crm-panel p-4">
      <h3 className="crm-label mb-4" style={{ color: "var(--crm-cyan)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="crm-label block mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="crm-input"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="crm-label block mb-1.5">{label}</label>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className="crm-input resize-none" />
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: string[] | { value: string; label: string }[];
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div>
      <label className="crm-label block mb-1.5">{label}</label>
      <select name={name} defaultValue={defaultValue ?? ""} className="crm-input crm-select">
        <option value="">—</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
