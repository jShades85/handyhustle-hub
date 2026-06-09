export interface TemplateCategory {
  name: string;
  icon: string;
}

export interface TradeTemplate {
  id: string;
  name: string;
  description: string;
  categories: TemplateCategory[];
}

export const TRADE_TEMPLATES: TradeTemplate[] = [
  {
    id: "av",
    name: "Audio/Visual",
    description: "Conference rooms, displays, AV distribution, and control systems",
    categories: [
      { name: "Displays & Projection", icon: "Monitor" },
      { name: "Audio Equipment",       icon: "Volume2" },
      { name: "Video Distribution",    icon: "Video" },
      { name: "Control Systems",       icon: "Settings2" },
      { name: "Structured Cabling",    icon: "Cable" },
      { name: "Labor",                 icon: "Wrench" },
    ],
  },
  {
    id: "security",
    name: "Security",
    description: "Surveillance cameras, access control, and intrusion detection",
    categories: [
      { name: "Cameras",            icon: "Camera" },
      { name: "Access Control",     icon: "KeyRound" },
      { name: "Intrusion Detection",icon: "ShieldAlert" },
      { name: "Video Management",   icon: "Monitor" },
      { name: "Intercoms & Gates",  icon: "Bell" },
      { name: "Labor",              icon: "Wrench" },
    ],
  },
  {
    id: "hvac",
    name: "HVAC",
    description: "Heating, cooling, ventilation, and environmental controls",
    categories: [
      { name: "Heating Equipment",     icon: "Flame" },
      { name: "Cooling Equipment",     icon: "Snowflake" },
      { name: "Controls & Thermostats",icon: "Thermometer" },
      { name: "Refrigerants",          icon: "Droplets" },
      { name: "Ductwork",              icon: "Wind" },
      { name: "Labor",                 icon: "Wrench" },
    ],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    description: "Pipes, fixtures, water heaters, and pumps",
    categories: [
      { name: "Pipes & Fittings", icon: "Gauge" },
      { name: "Valves & Controls",icon: "Settings" },
      { name: "Fixtures & Trim",  icon: "Droplet" },
      { name: "Water Heaters",    icon: "Flame" },
      { name: "Pumps",            icon: "Zap" },
      { name: "Labor",            icon: "Wrench" },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    description: "Wire, conduit, panels, fixtures, and devices",
    categories: [
      { name: "Wire & Conduit",     icon: "Zap" },
      { name: "Panels & Breakers",  icon: "Cpu" },
      { name: "Fixtures & Lighting",icon: "Lightbulb" },
      { name: "Devices & Switches", icon: "ToggleLeft" },
      { name: "Labor",              icon: "Wrench" },
    ],
  },
  {
    id: "general",
    name: "General Contractor",
    description: "Framing, concrete, roofing, insulation, and finishes",
    categories: [
      { name: "Lumber & Framing",  icon: "Hammer" },
      { name: "Concrete & Masonry",icon: "Layers" },
      { name: "Roofing",           icon: "Home" },
      { name: "Insulation",        icon: "Box" },
      { name: "Doors & Windows",   icon: "DoorOpen" },
      { name: "Labor",             icon: "Wrench" },
    ],
  },
];

export const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
];
