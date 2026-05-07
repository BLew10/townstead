import type { Doc } from "../../../../convex/_generated/dataModel";
import type { Column } from "../spreadsheet";

export type ContactExportRow = Pick<
  Doc<"contacts">,
  | "company"
  | "firstName"
  | "lastName"
  | "salutation"
  | "email"
  | "phone"
  | "cellPhone"
  | "altPhone"
  | "fax"
  | "altContactFirstName"
  | "altContactLastName"
  | "address"
  | "website"
  | "category"
  | "notes"
  | "customerSince"
>;

export const contactExportColumns: Column<ContactExportRow>[] = [
  { header: "Company", value: (c) => c.company },
  { header: "First Name", value: (c) => c.firstName },
  { header: "Last Name", value: (c) => c.lastName },
  { header: "Alt Contact First Name", value: (c) => c.altContactFirstName },
  { header: "Alt Contact Last Name", value: (c) => c.altContactLastName },
  { header: "Salutation", value: (c) => c.salutation },
  { header: "Email", value: (c) => c.email },
  { header: "Phone", value: (c) => c.phone },
  { header: "Alt Phone", value: (c) => c.altPhone },
  { header: "Cell Phone", value: (c) => c.cellPhone },
  { header: "Fax", value: (c) => c.fax },
  { header: "Address", value: (c) => c.address?.street },
  { header: "Address 2", value: (c) => c.address?.street2 },
  { header: "City", value: (c) => c.address?.city },
  { header: "State", value: (c) => c.address?.state },
  { header: "Zip", value: (c) => c.address?.zip },
  { header: "Country", value: (c) => c.address?.country },
  { header: "Customer Since", value: (c) => c.customerSince },
  { header: "Category", value: (c) => c.category },
  { header: "Website", value: (c) => c.website },
  { header: "Notes", value: (c) => c.notes },
];
