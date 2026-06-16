import React, { createContext, useContext, useState } from 'react';

interface CollapseContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const CollapseContext = createContext<CollapseContextValue>({ collapsed: false, setCollapsed: () => {} });

export function CollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <CollapseContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </CollapseContext.Provider>
  );
}

export function useCollapse() {
  return useContext(CollapseContext);
}
