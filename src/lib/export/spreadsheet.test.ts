import { describe, it, expect } from "vitest";
import { createCsv, createXlsxBlob, type Column } from "./spreadsheet";

type Row = { name: string; age: number | null; note?: string };

const columns: Column<Row>[] = [
  { header: "Name", value: (r) => r.name },
  { header: "Age", value: (r) => r.age },
  { header: "Note", value: (r) => r.note },
];

describe("createCsv", () => {
  it("produces a header row and CRLF-separated data rows", () => {
    const csv = createCsv(
      [
        { name: "Alice", age: 30, note: "hi" },
        { name: "Bob", age: null },
      ],
      columns
    );
    expect(csv).toBe(
      '"Name","Age","Note"\r\n"Alice","30","hi"\r\n"Bob","",""'
    );
  });

  it("escapes embedded quotes and preserves commas", () => {
    const csv = createCsv(
      [{ name: 'O"Brien, Jr.', age: 1 }],
      columns
    );
    expect(csv).toContain('"O""Brien, Jr."');
  });
});

describe("createXlsxBlob", () => {
  it("returns a Blob with the spreadsheetml MIME type", () => {
    const blob = createXlsxBlob([{ name: "Alice", age: 30 }], columns, "Sheet1");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("starts with a ZIP local-file-header signature (PK\\x03\\x04)", async () => {
    const blob = createXlsxBlob([{ name: "Alice", age: 1 }], columns, "S");
    const buf = new Uint8Array(await blob.arrayBuffer());
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });
});
