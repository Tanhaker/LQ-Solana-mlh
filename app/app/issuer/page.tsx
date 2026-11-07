"use client";

import { useEffect, useMemo, useState } from "react";
import { useChain } from "@/components/ChainData";
import { PlanLogo, usePlanInfo } from "@/components/PlanInfo";
import { Empty, PageHead } from "@/components/ui";
import { createPlan, setPlanActive, setPlanMetadata } from "@/lib/actions";
import { parseUsdc, planLength, usdc } from "@/lib/format";
import { LOGO_TYPES, MAX_DESCRIPTION, logoProblem, uploadPlanMetadata } from "@/lib/ipfs";
import type { Plan } from "@/lib/program";

const UNITS = { minutes: 60, hours: 3600, days: 86400 } as const;
type Unit = keyof typeof UNITS;

export default function IssuerPage() {
  const { plans, passes, listings, wallet, run } = useChain();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [length, setLength] = useState("30");
  const [unit, setUnit] = useState<Unit>("days");
  const [royalty, setRoyalty] = useState("10");
  const [logo, setLogo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoError = logoProblem(logo);

  const parsedPrice = parseUsdc(price);
  const lengthNum = Number(length);
  const seconds = Number.isFinite(lengthNum) ? Math.round(lengthNum * UNITS[unit]) : 0;
  const royaltyNum = Number(royalty);
  const errors = [
    !name.trim() || name.length > 32 ? "Name must be 1–32 characters." : null,
    !parsedPrice || parsedPrice.isZero() ? "Enter a price above zero." : null,
    seconds < 60 || seconds > 366 * 86400 ? "Length must be between 1 minute and 366 days." : null,
    !(royaltyNum >= 0 && royaltyNum <= 50) ? "Royalty must be 0–50%." : null,
  ].filter(Boolean) as string[];

  const myPlans = wallet
    ? plans
        .filter((p) => p.issuer.equals(wallet))
        .sort((a, b) => b.createdAt.toNumber() - a.createdAt.toNumber())
    : [];

  return (
    <>
      <PageHead
        eyebrow="Issuer"
        title="Sell access once. Earn on every resale."
        sub="Create a plan and every pass you sell carries your royalty. When a holder resells unused time, your cut is paid in the same transaction, automatically."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] items-start">
        <form
          className="panel p-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (errors.length || !parsedPrice || logoError) return;
            // Logo and description go to IPFS first; the link is saved on chain with the plan.
            let metadataUri: string | undefined;
            if (logo || description.trim()) {
              setUploading(true);
              setUploadError(null);
              try {
                metadataUri = await uploadPlanMetadata({ name: name.trim(), description: description.trim(), logo });
              } catch (err) {
                setUploadError((err as Error).message);
                return;
              } finally {
                setUploading(false);
              }
            }
            const ok = await run(`Create ${name.trim()}`, (p) =>
              createPlan(p, {
                name: name.trim(),
                price: parsedPrice,
                durationSec: seconds,
                royaltyBps: Math.round(royaltyNum * 100),
                metadataUri,
              }),
            );
            if (ok) {
              setName("");
              setPrice("");
              setLogo(null);
              setDescription("");
            }
          }}
        >
          <h2 className="text-xl font-semibold">New plan</h2>
          <Field label="Plan name" htmlFor="name">
            <input
              id="name"
              className="field"
              maxLength={32}
              placeholder="AI Writer Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Price (test USDC)" htmlFor="price">
            <input
              id="price"
              className="field num"
              inputMode="decimal"
              placeholder="20.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Length" htmlFor="length">
            <div className="flex gap-2">
              <input
                id="length"
                className="field num"
                inputMode="numeric"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
              <select
                aria-label="Length unit"
                className="field w-36"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          </Field>
          <Field label="Resale royalty (%)" htmlFor="royalty">
            <input
              id="royalty"
              className="field num"
              inputMode="decimal"
              value={royalty}
              onChange={(e) => setRoyalty(e.target.value)}
            />
          </Field>
          <MetadataFields
            idPrefix="new"
            name={name || "New plan"}
            logo={logo}
            onLogo={setLogo}
            description={description}
            onDescription={setDescription}
          />
          {(name || price) && errors.length > 0 && (
            <ul className="text-sm text-warn list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {(logoError || uploadError) && <p className="text-sm text-warn">{logoError ?? uploadError}</p>}
          <button className="btn btn-primary" disabled={!wallet || errors.length > 0 || !!logoError || uploading}>
            {!wallet ? "Connect a wallet to create a plan" : uploading ? "Uploading to IPFS…" : "Create plan"}
          </button>
          <p className="text-xs text-muted">
            Tip for demos: a 10-minute plan lets you watch a pass and its resale price run down live.
          </p>
        </form>

        <section>
          <h2 className="text-[24px] sm:text-[28px] font-semibold mb-5">Your plans. <span className="soft">Live on Solana.</span></h2>
          {myPlans.length === 0 ? (
            <Empty>{wallet ? "You haven't created a plan yet." : "Connect a wallet to see your plans."}</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {myPlans.map((plan) => {
                const planPasses = passes.filter((p) => p.plan.equals(plan.address));
                const listed = listings.filter((l) =>
                  planPasses.some((p) => p.address.equals(l.pass)),
                ).length;
                const holders = new Set(planPasses.map((p) => p.owner.toBase58())).size;
                return (
                  <IssuerPlan key={plan.address.toBase58()} plan={plan} holders={holders} listed={listed} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function IssuerPlan({ plan, holders, listed }: { plan: Plan; holders: number; listed: number }) {
  const { run } = useChain();
  const info = usePlanInfo(plan.address);
  const [editing, setEditing] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoError = logoProblem(logo);

  const open = () => {
    setDescription(info?.description ?? "");
    setLogo(null);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (logoError) return;
    setBusy(true);
    setError(null);
    try {
      const uri = await uploadPlanMetadata({
        name: plan.name,
        description: description.trim(),
        logo,
        keepImage: info?.image,
      });
      if (await run(`Update ${plan.name} details`, (p) => setPlanMetadata(p, plan, uri))) setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <PlanLogo name={plan.name} info={info} size={48} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="text-sm text-muted mt-1">
              {usdc(plan.price)} USDC · {planLength(plan.duration.toNumber())} · {plan.royaltyBps / 100}% royalty
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${plan.active ? "chip-live" : ""}`}>{plan.active ? "On sale" : "Paused"}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              run(plan.active ? "Pause plan" : "Resume plan", (p) => setPlanActive(p, plan, !plan.active))
            }
          >
            {plan.active ? "Pause sales" : "Resume sales"}
          </button>
        </div>
      </div>
      {info?.description && <p className="text-sm text-ink-2 mt-3 leading-snug">{info.description}</p>}
      <dl className="grid grid-cols-3 gap-3 mt-4 text-sm">
        <Stat label="Passes sold" value={plan.sold.toString()} />
        <Stat label="Holders now" value={String(holders)} />
        <Stat label="Listed for resale" value={String(listed)} />
      </dl>

      {editing ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border-[2.5px] border-black p-4">
          <MetadataFields
            idPrefix={plan.address.toBase58()}
            name={plan.name}
            logo={logo}
            onLogo={setLogo}
            currentLogo={info?.imageUrl ?? null}
            description={description}
            onDescription={setDescription}
          />
          {(logoError || error) && <p className="text-sm text-warn">{logoError ?? error}</p>}
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm flex-1"
              disabled={busy || !!logoError || (!logo && !description.trim() && !info?.image)}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save to IPFS and Solana"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button className="btn btn-ghost btn-sm" onClick={open}>
            {info ? "Edit logo & description" : "Add logo & description"}
          </button>
          {info?.jsonUrl && (
            <a className="text-xs underline text-muted" href={info.jsonUrl} target="_blank" rel="noreferrer">
              Metadata on IPFS ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}

/** Logo picker (with preview) and description box, shared by "new plan" and "edit". */
function MetadataFields({
  idPrefix,
  name,
  logo,
  onLogo,
  currentLogo = null,
  description,
  onDescription,
}: {
  idPrefix: string;
  name: string;
  logo: File | null;
  onLogo: (f: File | null) => void;
  currentLogo?: string | null;
  description: string;
  onDescription: (v: string) => void;
}) {
  const preview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = preview ?? currentLogo;

  return (
    <>
      <Field label="Logo (optional)" htmlFor={`${idPrefix}-logo`}>
        <div className="flex items-center gap-3">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview or IPFS image
            <img src={shown} alt="" className="w-[52px] h-[52px] rounded-[14px] border-[2.5px] border-black object-cover bg-white" />
          ) : (
            <PlanLogo name={name} info={null} />
          )}
          <label htmlFor={`${idPrefix}-logo`} className="btn btn-ghost btn-sm cursor-pointer">
            {logo ? "Change image" : "Choose image"}
          </label>
          <input
            id={`${idPrefix}-logo`}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
          />
          {logo && (
            <button type="button" className="text-xs underline text-muted" onClick={() => onLogo(null)}>
              Remove
            </button>
          )}
        </div>
        <span className="text-xs text-muted">PNG, JPG, WebP or GIF, up to 1 MB.</span>
      </Field>
      <Field label="Description (optional)" htmlFor={`${idPrefix}-desc`}>
        <textarea
          id={`${idPrefix}-desc`}
          className="field min-h-[84px] py-3 resize-y"
          maxLength={MAX_DESCRIPTION}
          placeholder="What does this pass unlock?"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
        />
        <span className="text-xs text-muted num self-end">
          {description.length}/{MAX_DESCRIPTION}
        </span>
      </Field>
      <p className="text-xs text-muted -mt-1">
        Stored on IPFS (pinned with Pinata). Its ipfs:// link is saved on Solana with the plan.
      </p>
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card-2 border border-line p-3">
      <dt className="label">{label}</dt>
      <dd className="num text-xl mt-1">{value}</dd>
    </div>
  );
}
