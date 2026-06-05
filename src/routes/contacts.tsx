import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { contacts } from "@/lib/demo-data";
import { Tab, Avatar } from "@/components/ui-bits";
import { useMeta } from "@/contexts/PageMetaContext";
import { Filter, Plus, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "Contacts · Crosscurrent" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const { setMeta } = useMeta();
  useEffect(() => { setMeta({ title: "Contacts" }); }, [setMeta]);

  return (
    <div>
      <div className="px-4 py-3">
        <table className="w-full text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left font-medium py-2">Name</th>
              <th className="text-left font-medium py-2">Title</th>
              <th className="text-left font-medium py-2">Company</th>
              <th className="text-left font-medium py-2">Email</th>
              <th className="text-left font-medium py-2">Phone</th>
              <th className="text-right font-medium py-2 pr-2">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((p) => {
              const initials = p.name.split(" ").map(n => n[0]).slice(0,2).join("");
              return (
                <tr key={p.id} className="row-hover border-b border-border/60">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar initials={initials} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{p.title}</td>
                  <td className="py-2.5">{p.company}</td>
                  <td className="py-2.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {p.email}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground font-mono text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</span>
                  </td>
                  <td className="py-2.5 pr-2 text-right text-muted-foreground font-mono text-[11px]">{p.lastActivity} ago</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
