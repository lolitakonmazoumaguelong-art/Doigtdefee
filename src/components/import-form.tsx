"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { importProducts } from "@/actions/products";
import { FormError } from "@/components/ui";

const EXAMPLE = `Name\tCategory\tSelling price\tCost price\tQuantity\tSupplier\tReference
4 MP IP dome camera\tCameras\t4500\t3000\t10\tHikvision Mauritius\tDS-2CD1143
8-channel NVR recorder\tRecorders\t9500\t7000\t3\tHikvision Mauritius\tDS-7608
Camera installation\tLabour\t1500\t\t\t\t`;

export function ImportForm() {
  const [state, action, pending] = useActionState(importProducts, undefined);
  const [rows, setRows] = useState("");

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setRows(await file.text());
  };
  const count = rows.split("\n").filter((l) => l.trim()).length;

  return (
    <form action={action} className="card max-w-3xl space-y-4 p-5 sm:p-6">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>In Excel or Google Sheets, put your items in columns in this order: Name, Category, Selling price, Cost price, Quantity, Supplier, Reference.</li>
        <li>Select the rows, copy, and paste them below. Or choose a CSV file.</li>
        <li>Only the name is required. A header row is fine and lets you change the column order.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-ghost">
          Choose a CSV file
          <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={onFile} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setRows(EXAMPLE)}>
          Show me an example
        </button>
      </div>
      <div>
        <label className="label" htmlFor="rows">
          Your list {count > 0 && `(${count} rows)`}
        </label>
        <textarea
          id="rows"
          name="rows"
          rows={10}
          className="input font-mono text-xs whitespace-pre"
          placeholder="Paste your rows here..."
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          required
        />
      </div>
      <FormError message={state?.error} />
      {state?.ok && (
        <p role="status" className="rounded-lg border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">
          {state.message}{" "}
          <Link href="/app/stock" className="font-medium underline underline-offset-4">
            View the stock
          </Link>
        </p>
      )}
      {state?.details && state.details.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-clay">
          {state.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Importing..." : "Import items"}
        </button>
        <Link href="/app/stock" className="btn btn-ghost">
          Back to stock
        </Link>
      </div>
    </form>
  );
}
