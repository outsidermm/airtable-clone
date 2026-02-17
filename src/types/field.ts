import type { ColumnType } from "generated/prisma/enums";

export type FieldCategory = "agent" | "standard";

export interface FieldType {
  id: string;
  name: string;
  type: ColumnType;
  category: FieldCategory;
  icon: React.ReactNode;
  badge?: string;
}
