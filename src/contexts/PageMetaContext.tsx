import { createContext, useContext, useState } from "react";

type PageMeta = {
  title: string;
  subtitle?: string;
  newLabel?: string;
  onNew?: () => void;
};

type PageMetaContextValue = {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
};

const defaultMeta: PageMeta = { title: "" };

const PageMetaContext = createContext<PageMetaContextValue>({
  meta: defaultMeta,
  setMeta: () => undefined,
});

export function PageMetaProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>(defaultMeta);
  return (
    <PageMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </PageMetaContext.Provider>
  );
}

export function useMeta() {
  return useContext(PageMetaContext);
}
