import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  selectedProjectId: number | null;
  setSelectedProjectId: (projectId: number | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'cobuddy-selected-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const setSelectedProjectId = (projectId: number | null) => {
    setSelectedProjectIdState(projectId);
    if (projectId !== null) {
      localStorage.setItem(STORAGE_KEY, projectId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
