"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Profile {
  age: number | null;
  location: string | null;
  residency: string | null;
  annualIncome: number | null;
  employmentStatus: string | null;
  educationLevel: string | null;
  householdSize: number | null;
  dependents: number | null;
  businessOwner: boolean | null;
  housingStatus: string | null;
  disabilityStatus: boolean | null;
  studentStatus: boolean | null;
  agricultureLand: boolean | null;
}

const EMPTY: Profile = {
  age: null,
  location: null,
  residency: null,
  annualIncome: null,
  employmentStatus: null,
  educationLevel: null,
  householdSize: null,
  dependents: null,
  businessOwner: null,
  housingStatus: null,
  disabilityStatus: null,
  studentStatus: null,
  agricultureLand: null,
};

export default function ProfilePage() {
  return (
    <RequireAuth roles={["CITIZEN"]}>
      <ProfileBody />
    </RequireAuth>
  );
}

function ProfileBody() {
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => api.get<{ profile: Profile }>("/api/profile") });

  if (isLoading || !data) return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-slate-500">Loading...</div>;

  // Keying by a stable id-less marker here is unnecessary: this component only
  // mounts once `data` exists, so useState's initializer safely seeds the form
  // from the loaded profile without needing an effect to sync it afterward.
  return <ProfileForm initial={data.profile} />;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Profile>(initial ?? EMPTY);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (updates: Profile) => api.put<{ profile: Profile }>("/api/profile", updates),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      queryClient.invalidateQueries({ queryKey: ["eligibility"] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-sm text-slate-500">
          Only structured facts used by the eligibility engine. Nothing here is shared outside CivicFlow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label="Age" value={form.age} onChange={(v) => field("age", v)} />
          <TextField label="Location" value={form.location} onChange={(v) => field("location", v)} />
          <TextField label="Residency (state)" value={form.residency} onChange={(v) => field("residency", v)} />
          <NumberField label="Annual income (₹)" value={form.annualIncome} onChange={(v) => field("annualIncome", v)} />
          <SelectField
            label="Employment status"
            value={form.employmentStatus}
            options={["employed", "unemployed", "self-employed", "retired"]}
            onChange={(v) => field("employmentStatus", v)}
          />
          <SelectField
            label="Education level"
            value={form.educationLevel}
            options={["none", "secondary", "undergraduate", "postgraduate"]}
            onChange={(v) => field("educationLevel", v)}
          />
          <NumberField label="Household size" value={form.householdSize} onChange={(v) => field("householdSize", v)} />
          <NumberField label="Dependents" value={form.dependents} onChange={(v) => field("dependents", v)} />
          <SelectField
            label="Housing status"
            value={form.housingStatus}
            options={["renting", "owned", "homeless"]}
            onChange={(v) => field("housingStatus", v)}
          />
          <BoolField label="Owns a business" value={form.businessOwner} onChange={(v) => field("businessOwner", v)} />
          <BoolField label="Has a registered disability" value={form.disabilityStatus} onChange={(v) => field("disabilityStatus", v)} />
          <BoolField label="Currently a student" value={form.studentStatus} onChange={(v) => field("studentStatus", v)} />
          <BoolField label="Owns/leases agricultural land" value={form.agricultureLand} onChange={(v) => field("agricultureLand", v)} />
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
          {save.isPending ? "Saving..." : "Save profile"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}

function slugify(label: string): string {
  return `profile-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function TextField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const id = slugify(label);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const id = slugify(label);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={id}
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
}

function BoolField({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const id = slugify(label);
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "true")}
        className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  const id = slugify(label);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="">Unknown</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
