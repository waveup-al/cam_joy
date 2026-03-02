import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Rule, Project, AmazonBulkRow, ProcessedChange } from "./types";
import { migrateRuleAction } from "./lib/entityRegistry";

/** Migrate projects from old action format to new entity-aware format */
const migrateProjects = (projects: Project[]): Project[] =>
  projects.map((p) => ({
    ...p,
    rules: p.rules.map((r) => ({ ...r, action: migrateRuleAction(r.action) })),
  }));

interface AppContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Project) => void;
  deleteProject: (id: string) => void;

  rawData: AmazonBulkRow[];
  setRawData: React.Dispatch<React.SetStateAction<AmazonBulkRow[]>>;

  processedData: AmazonBulkRow[];
  setProcessedData: React.Dispatch<React.SetStateAction<AmazonBulkRow[]>>;

  changes: ProcessedChange[];
  setChanges: React.Dispatch<React.SetStateAction<ProcessedChange[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('autocamp_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return migrateProjects(parsed);
      }
    } catch { }
    return [
      {
        id: "p1",
        name: "Default Campaign Optimization",
        description: "Basic rules for pausing bleeding keywords and reducing high ACOS bids.",
        rules: [
          {
            id: "1",
            name: "7D: >= 8 clicks, 0 orders -> -10% bid",
            entityType: "Keyword",
            isActive: true,
            conditions: [
              { id: "c1", metric: "7d Clicks", operator: ">=", value: 8 },
              { id: "c2", metric: "7d Orders", operator: "=", value: 0 },
            ],
            action: { type: "decrease", targetField: "Bid", value: 10, unit: "%" },
          },
          {
            id: "2",
            name: "7D: >= 15 clicks, 0 orders & 30D: >= 2 orders -> -10% bid",
            entityType: "Keyword",
            isActive: true,
            conditions: [
              { id: "c3", metric: "7d Clicks", operator: ">=", value: 15 },
              { id: "c4", metric: "7d Orders", operator: "=", value: 0 },
              { id: "c5", metric: "30d Orders", operator: ">=", value: 2 },
            ],
            action: { type: "decrease", targetField: "Bid", value: 10, unit: "%" },
          },
          {
            id: "3",
            name: "7D: >= 15 clicks, 0 orders & 30D: 0 orders -> Pause",
            entityType: "Keyword",
            isActive: true,
            conditions: [
              { id: "c6", metric: "7d Clicks", operator: ">=", value: 15 },
              { id: "c7", metric: "7d Orders", operator: "=", value: 0 },
              { id: "c8", metric: "30d Orders", operator: "=", value: 0 },
            ],
            action: { type: "pause", targetField: "State" },
          },
        ]
      }
    ];
  });

  const [rawData, setRawData] = useState<AmazonBulkRow[]>([]);
  const [processedData, setProcessedData] = useState<AmazonBulkRow[]>([]);
  const [changes, setChanges] = useState<ProcessedChange[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('autocamp_projects', JSON.stringify(projects));
    } catch { }
  }, [projects]);

  const addProject = (project: Project) => setProjects([...projects, project]);
  const updateProject = (id: string, updatedProject: Project) =>
    setProjects(projects.map((p) => (p.id === id ? updatedProject : p)));
  const deleteProject = (id: string) =>
    setProjects(projects.filter((p) => p.id !== id));

  return (
    <AppContext.Provider
      value={{
        projects,
        setProjects,
        addProject,
        updateProject,
        deleteProject,
        rawData,
        setRawData,
        processedData,
        setProcessedData,
        changes,
        setChanges,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
