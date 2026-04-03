"use client";
import { useState, useRef } from "react";
import { useFoliaStore } from "@/store";
import { documentsApi } from "@/lib/api/client";
import type { DocumentResult, DocType } from "@/types";

const DOC_TYPES: {
  value: DocType;
  label: string;
  desc: string;
}[] = [
  { value: "pay_stub", label: "Pay Stub", desc: "Recent paycheck", },
  { value: "w2", label: "W-2", desc: "Annual wage statement",},
  {
    value: "bank_statement",
    label: "Bank Statement",
    desc: "Monthly account",
  },
  {
    value: "credit_card_statement",
    label: "Credit Card",
    desc: "Monthly card statement",
  },
  {
    value: "brokerage_statement",
    label: "Brokerage",
    desc: "Investment account",
  },
  {
    value: "financial_aid_letter",
    label: "Financial Aid",
    desc: "College award letter",
  },
  {
    value: "tax_return",
    label: "Tax Return",
    desc: "1040 or state return",
  },
  {
    value: "insurance_policy",
    label: "Insurance Policy",
    desc: "Any insurance doc",
  },
  { value: "other", label: "Other", desc: "Any financial doc", },
];

export default function DocumentsPage() {
  const userId = useFoliaStore((s) => s.userId)!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>("pay_stub");
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = async (file: File) => {
    setLoading(true);
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const res = await documentsApi.analyze(file, docType, userId);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: 900,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--t1)",
            letterSpacing: "-0.03em",
          }}
        >
          Document Intelligence
        </h1>
        <p style={{ fontSize: "0.8rem", color: "var(--t3)", marginTop: 4 }}>
          Upload any financial document — AI extracts key data, spots issues,
          and gives personalized action items
        </p>
      </div>

      {/* Doc type selector */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          Select document type
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
            gap: "0.5rem",
          }}
        >
          {DOC_TYPES.map(({ value, label, desc, icon }) => (
            <button
              key={value}
              onClick={() => setDocType(value)}
              style={{
                padding: "0.75rem",
                background:
                  docType === value ? "var(--green-bg)" : "var(--bg-4)",
                border: `1px solid ${docType === value ? "var(--green-border)" : "var(--b1)"}`,
                borderRadius: "var(--r)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.12s",
              }}
            >
              <div style={{ fontSize: "1.1rem", marginBottom: 4 }}>{icon}</div>
              <div
                style={{
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  color: docType === value ? "var(--green)" : "var(--t1)",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--t4)" }}>
                {desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) processFile(f);
        }}
        style={{
          border: `2px dashed ${dragOver ? "var(--green)" : "var(--b2)"}`,
          borderRadius: "var(--r-lg)",
          padding: "3rem 2rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "var(--green-bg)" : "var(--bg-2)",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
          }}
        />

        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--bg-5)",
                borderTop: `3px solid var(--green)`,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ color: "var(--t2)", fontSize: "0.875rem" }}>
              Analyzing {fileName}...
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--t3)" }}>
              Gemini AI is extracting data and generating insights
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "0.75rem",
                opacity: 0.5,
              }}
            >
              ↑
            </div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--t1)",
                marginBottom: "0.375rem",
              }}
            >
              Drop your {DOC_TYPES.find((d) => d.value === docType)?.label}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--t3)" }}>
              or click to browse · PDF or image · max 10MB
            </div>
          </>
        )}
      </div>

      {error && <div className="alert alert-red">{error}</div>}

      {/* Results */}
      {result && (
        <div
          className="stagger"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* AI summary */}
          {result.ai_summary && (
            <div className="insight">
              <div className="insight-label">
                AI summary —{" "}
                {DOC_TYPES.find((d) => d.value === result.doc_type)?.label}
              </div>
              {result.ai_summary}
            </div>
          )}

          {/* Insights + Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {result.insights.length > 0 && (
              <div className="card">
                <div
                  className="section-title"
                  style={{ marginBottom: "0.875rem" }}
                >
                  Key insights
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {result.insights.map((ins, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "0.625rem",
                        fontSize: "0.825rem",
                        lineHeight: 1.55,
                      }}
                    >
                      <span style={{ color: "var(--blue)", flexShrink: 0 }}>
                        →
                      </span>
                      <span style={{ color: "var(--t1)" }}>{ins}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.action_items.length > 0 && (
              <div className="card">
                <div
                  className="section-title"
                  style={{ marginBottom: "0.875rem" }}
                >
                  Action items
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                  }}
                >
                  {result.action_items.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "0.625rem",
                        fontSize: "0.825rem",
                        lineHeight: 1.55,
                      }}
                    >
                      <span style={{ color: "var(--amber)", flexShrink: 0 }}>
                        !
                      </span>
                      <span style={{ color: "var(--t1)" }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extracted data */}
          {Object.keys(result.extracted_data).length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: "1rem" }}>
                Extracted data
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
                  gap: "0.5rem",
                }}
              >
                {Object.entries(result.extracted_data).map(([key, val]) => {
                  if (val == null || val === "" || typeof val === "object")
                    return null;
                  const isNum = typeof val === "number";
                  const isMoney =
                    isNum &&
                    (key.includes("income") ||
                      key.includes("wage") ||
                      key.includes("pay") ||
                      key.includes("tax") ||
                      key.includes("balance") ||
                      key.includes("amount") ||
                      key.includes("salary"));
                  const display = isMoney
                    ? `$${Number(val).toLocaleString()}`
                    : String(val);
                  return (
                    <div
                      key={key}
                      style={{
                        background: "var(--bg-4)",
                        borderRadius: "var(--r-sm)",
                        padding: "0.5rem 0.625rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--t4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 3,
                        }}
                      >
                        {key.replace(/_/g, " ")}
                      </div>
                      <div
                        style={{
                          fontFamily: isNum ? "var(--mono)" : "inherit",
                          fontSize: "0.825rem",
                          fontWeight: 600,
                          color: "var(--t1)",
                        }}
                      >
                        {display}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
