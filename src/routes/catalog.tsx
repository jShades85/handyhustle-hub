import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { catalog, currency } from "@/lib/demo-data";
import { Tab } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog · Crosscurrent" }] }),
  component: CatalogPage,
});

function CatalogPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Catalog" }); }, [setMeta]);

  const categories = Array.from(new Set(catalog.map((c) => c.category)));

  return (
    <div>
      <div className="px-4 py-3">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left font-medium py-2 w-32">SKU</th>
              <th className="text-left font-medium py-2">Product</th>
              <th className="text-left font-medium py-2">Category</th>
              <th className="text-left font-medium py-2">Vendor</th>
              <th className="text-right font-medium py-2">Cost</th>
              <th className="text-right font-medium py-2">Price</th>
              <th className="text-right font-medium py-2">Margin</th>
              <th className="text-right font-medium py-2 pr-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((k) => {
              const m = ((k.price - k.cost) / k.price) * 100;
              const lowStock = k.stock <= 4 && k.category !== "Labor";
              return (
                <tr key={k.id} className="row-hover border-b border-border/60">
                  <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{k.sku}</td>
                  <td className="py-2.5 font-medium">{k.name}</td>
                  <td className="py-2.5"><span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{k.category}</span></td>
                  <td className="py-2.5 text-muted-foreground">{k.vendor}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">{currency(k.cost)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-medium">{currency(k.price)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-status-won">{m.toFixed(0)}%</td>
                  <td className={`py-2.5 pr-2 text-right font-mono tabular-nums ${lowStock ? "text-priority-urgent" : ""}`}>
                    {k.category === "Labor" ? "—" : k.stock}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
