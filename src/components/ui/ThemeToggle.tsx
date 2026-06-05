import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./button";
import { useTheme, type Theme } from "@/hooks/useTheme";

const CYCLE: Theme[] = ["light", "dark", "system"];

const icons: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const labels: Record<Theme, string> = {
  light: "Light mode — click to switch to dark",
  dark: "Dark mode — click to switch to system",
  system: "System theme — click to switch to light",
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
  const Icon = icons[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={labels[theme]}
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
