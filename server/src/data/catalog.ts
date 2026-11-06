// Synthetic stand-in for data that would normally be extracted from SolidWorks
// files via the Document Manager API. Shape matches what that extractor would
// produce: a flat tool catalog plus a set of past layouts, each listing which
// tools it holds.

export interface Tool {
  id: string;
  partNumber: string;
  name: string;
  widthIn: number;
  heightIn: number;
}

export interface Layout {
  id: string;
  name: string;
  drawerWidthIn: number;
  drawerHeightIn: number;
  toolIds: string[];
  usedOnJobId: string;
}

export const tools: Tool[] = [
  { id: "t1", partNumber: "SK-1012", name: "10mm Combination Wrench", widthIn: 7.5, heightIn: 1 },
  { id: "t2", partNumber: "SK-1013", name: "12mm Combination Wrench", widthIn: 8, heightIn: 1 },
  { id: "t3", partNumber: "SK-1014", name: "14mm Combination Wrench", widthIn: 8.5, heightIn: 1.1 },
  { id: "t4", partNumber: "SK-2001", name: "3/8in Drive Ratchet", widthIn: 9, heightIn: 1.5 },
  { id: "t5", partNumber: "SK-2045", name: "1/2in Drive Ratchet", widthIn: 10.5, heightIn: 1.8 },
  { id: "t6", partNumber: "SK-3010", name: "Needle Nose Pliers 6in", widthIn: 6, heightIn: 1.2 },
  { id: "t7", partNumber: "SK-3011", name: "Diagonal Cutting Pliers 6in", widthIn: 6, heightIn: 1.2 },
  { id: "t8", partNumber: "SK-4001", name: "Phillips Screwdriver #2", widthIn: 8, heightIn: 0.8 },
  { id: "t9", partNumber: "SK-4002", name: "Flathead Screwdriver 1/4in", widthIn: 8, heightIn: 0.8 },
  { id: "t10", partNumber: "SK-5030", name: "Torque Wrench 3/8in", widthIn: 14, heightIn: 2 },
  { id: "t11", partNumber: "SK-6012", name: "Hex Key Set 10pc", widthIn: 5, heightIn: 3 },
  { id: "t12", partNumber: "SK-7001", name: "Ball Peen Hammer 16oz", widthIn: 11, heightIn: 2.5 },
  { id: "t13", partNumber: "SK-8015", name: "Adjustable Wrench 10in", widthIn: 10, heightIn: 1.5 },
  { id: "t14", partNumber: "SK-9002", name: "Wire Stripper", widthIn: 6.5, heightIn: 1.3 },
  { id: "t15", partNumber: "SK-9100", name: "Multimeter Probe Set", widthIn: 7, heightIn: 2 },
  { id: "t16", partNumber: "SK-1015", name: "16mm Combination Wrench", widthIn: 9, heightIn: 1.1 },
  { id: "t17", partNumber: "SK-2050", name: "1/4in Drive Ratchet", widthIn: 7, heightIn: 1.3 },
  { id: "t18", partNumber: "SK-3020", name: "Locking Pliers 7in", widthIn: 7, heightIn: 1.4 },
];

export const layouts: Layout[] = [
  {
    id: "L1",
    name: "Mechanic Starter Set A",
    drawerWidthIn: 24,
    drawerHeightIn: 18,
    toolIds: ["t1", "t2", "t3", "t4", "t6", "t7", "t8", "t9"],
    usedOnJobId: "J1001",
  },
  {
    id: "L2",
    name: "Mechanic Starter Set B (metric heavy)",
    drawerWidthIn: 24,
    drawerHeightIn: 18,
    toolIds: ["t1", "t2", "t3", "t16", "t4", "t5", "t13"],
    usedOnJobId: "J1002",
  },
  {
    id: "L3",
    name: "Electrical Tray",
    drawerWidthIn: 18,
    drawerHeightIn: 12,
    toolIds: ["t8", "t9", "t14", "t15", "t18"],
    usedOnJobId: "J1003",
  },
  {
    id: "L4",
    name: "Torque & Ratchet Set",
    drawerWidthIn: 30,
    drawerHeightIn: 20,
    toolIds: ["t4", "t5", "t10", "t17", "t11"],
    usedOnJobId: "J1004",
  },
  {
    id: "L5",
    name: "Full Mechanic Set",
    drawerWidthIn: 36,
    drawerHeightIn: 24,
    toolIds: ["t1", "t2", "t3", "t16", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t13"],
    usedOnJobId: "J1005",
  },
  {
    id: "L6",
    name: "Pliers & Cutters Tray",
    drawerWidthIn: 18,
    drawerHeightIn: 12,
    toolIds: ["t6", "t7", "t18", "t14"],
    usedOnJobId: "J1006",
  },
  {
    id: "L7",
    name: "Hammer & Hex Combo",
    drawerWidthIn: 20,
    drawerHeightIn: 16,
    toolIds: ["t12", "t11", "t13"],
    usedOnJobId: "J1007",
  },
  {
    id: "L8",
    name: "Compact Wrench Roll",
    drawerWidthIn: 16,
    drawerHeightIn: 10,
    toolIds: ["t1", "t2", "t3", "t16"],
    usedOnJobId: "J1008",
  },
];

export const foamPricePerSqIn = 0.18; // $ per square inch of drawer foam
export const designHoursPerMissingTool = 0.35; // hours of layout design per tool not already in a matched layout
export const designHourRate = 65; // $/hr
