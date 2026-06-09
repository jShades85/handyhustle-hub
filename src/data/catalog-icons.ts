import type { LucideIcon } from "lucide-react";
import {
  Archive, AirVent, Bath, Battery, Bell, BellRing,
  Box, Boxes, Building2, Cable, Camera, CircuitBoard,
  ClipboardList, Cog, Cpu, Database, DoorOpen, Droplet,
  Droplets, Eye, Fan, Fingerprint, Flame, Gauge, Globe,
  HardDrive, HardHat, Headphones, Home, Hammer, KeyRound,
  Lamp, Layers, Lightbulb, Lock, Mic, Monitor, Mountain,
  Music, Network, Package2, Paintbrush, Plug, Power,
  Radio, Ruler, Scissors, Server, Settings, Settings2,
  Shield, ShieldAlert, ShieldCheck, Snowflake, Speaker,
  Sun, Tag, Tags, Thermometer, ToggleLeft, Truck, Tv,
  Video, Volume2, Warehouse, Waves, Wifi, Wind, Wrench, Zap,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Archive, AirVent, Bath, Battery, Bell, BellRing,
  Box, Boxes, Building2, Cable, Camera, CircuitBoard,
  ClipboardList, Cog, Cpu, Database, DoorOpen, Droplet,
  Droplets, Eye, Fan, Fingerprint, Flame, Gauge, Globe,
  HardDrive, HardHat, Headphones, Home, Hammer, KeyRound,
  Lamp, Layers, Lightbulb, Lock, Mic, Monitor, Mountain,
  Music, Network, Package2, Paintbrush, Plug, Power,
  Radio, Ruler, Scissors, Server, Settings, Settings2,
  Shield, ShieldAlert, ShieldCheck, Snowflake, Speaker,
  Sun, Tag, Tags, Thermometer, ToggleLeft, Truck, Tv,
  Video, Volume2, Warehouse, Waves, Wifi, Wind, Wrench, Zap,
};

export interface IconGroup {
  label: string;
  icons: string[];
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: "Security",
    icons: ["Camera", "Shield", "ShieldAlert", "ShieldCheck", "KeyRound", "Lock", "Bell", "BellRing", "Eye", "Fingerprint", "DoorOpen", "Video"],
  },
  {
    label: "Audio / Visual",
    icons: ["Monitor", "Tv", "Volume2", "Speaker", "Headphones", "Mic", "Music", "Radio", "Wifi"],
  },
  {
    label: "Networking & IT",
    icons: ["Network", "Server", "HardDrive", "Cpu", "Database", "Globe", "Cable"],
  },
  {
    label: "Electrical",
    icons: ["Zap", "Plug", "Lightbulb", "Lamp", "CircuitBoard", "Power", "ToggleLeft", "Battery"],
  },
  {
    label: "HVAC & Mechanical",
    icons: ["Thermometer", "Flame", "Snowflake", "Wind", "Fan", "Sun", "Droplets", "AirVent", "Gauge", "Cog"],
  },
  {
    label: "Plumbing",
    icons: ["Droplet", "Waves", "Bath", "Gauge", "Wrench", "Settings"],
  },
  {
    label: "Construction",
    icons: ["Hammer", "HardHat", "Layers", "Home", "Building2", "DoorOpen", "Scissors", "Ruler", "Paintbrush", "Mountain"],
  },
  {
    label: "General / Labor",
    icons: ["Wrench", "Settings2", "Package2", "Box", "Boxes", "Tag", "Tags", "Archive", "Warehouse", "Truck", "ClipboardList"],
  },
];
