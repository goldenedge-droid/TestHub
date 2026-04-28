import { useState, useCallback, useEffect } from 'react';
import { ProjectWorkspace, TestRecord, TestConfiguration } from '../types';

// This abstracts the data layer. Right now it uses localStorage,
// but perfectly set up to be replaced by a tRPC/fetch backend interface for Python.

const LOCAL_STORAGE_KEY = 'test_plan_workspace_data';

const getInitialWorkspace = (): ProjectWorkspace => {
  return {
    id: `proj_${Date.now()}`,
    projectName: 'New Project',
    masterList: [],
    configurations: [],
  };
};

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<ProjectWorkspace>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getInitialWorkspace();
      }
    }
    return getInitialWorkspace();
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const loadMasterList = useCallback((records: TestRecord[]) => {
    setWorkspace(prev => ({
      ...prev,
      masterList: records
    }));
  }, []);

  const addTest = useCallback((test: TestRecord) => {
    setWorkspace(prev => ({
      ...prev,
      masterList: [...prev.masterList, test]
    }));
  }, []);

  const updateTest = useCallback((testId: string, updates: Partial<TestRecord>) => {
    setWorkspace(prev => {
      const newTestId = updates.TestID && updates.TestID !== testId ? updates.TestID : testId;
      const isIdChanged = newTestId !== testId;

      return {
        ...prev,
        masterList: prev.masterList.map(t => {
          // Update the test itself
          if (t.TestID === testId) return { ...t, ...updates };
          // Update children if the ID changed
          if (isIdChanged && t.ParentTestID === testId) return { ...t, ParentTestID: newTestId };
          return t;
        }),
        // Update configurations if the ID changed
        configurations: isIdChanged ? prev.configurations.map(c => ({
          ...c,
          testIds: c.testIds.map(id => id === testId ? newTestId : id)
        })) : prev.configurations
      };
    });
  }, []);

  const deleteTest = useCallback((testId: string) => {
    setWorkspace(prev => ({
      ...prev,
      masterList: prev.masterList.filter(t => t.TestID !== testId),
      configurations: prev.configurations.map(c => ({
        ...c,
        testIds: c.testIds.filter(id => id !== testId)
      }))
    }));
  }, []);

  const addConfiguration = useCallback((configName: string, parentId?: string) => {
    const newConfig: TestConfiguration = {
      id: `config_${Date.now()}`,
      name: configName,
      description: '',
      testIds: [],
      ...(parentId ? { parentId } : {})
    };
    setWorkspace(prev => ({
      ...prev,
      configurations: [...prev.configurations, newConfig]
    }));
    return newConfig;
  }, []);

  const updateConfiguration = useCallback((configId: string, updates: Partial<TestConfiguration>) => {
    setWorkspace(prev => ({
      ...prev,
      configurations: prev.configurations.map(config => 
        config.id === configId ? { ...config, ...updates } : config
      )
    }));
  }, []);

  const deleteConfiguration = useCallback((configId: string) => {
    setWorkspace(prev => {
      const toDelete = new Set<string>([configId]);
      let added = true;
      while(added) {
        added = false;
        prev.configurations.forEach(c => {
          if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
            toDelete.add(c.id);
            added = true;
          }
        });
      }
      return {
        ...prev,
        configurations: prev.configurations.filter(c => !toDelete.has(c.id))
      };
    });
  }, []);

  const toggleTestInConfiguration = useCallback((configId: string, testId: string) => {
    setWorkspace(prev => ({
      ...prev,
      configurations: prev.configurations.map(config => {
        if (config.id !== configId) return config;
        const exists = config.testIds.includes(testId);
        return {
          ...config,
          testIds: exists 
            ? config.testIds.filter(id => id !== testId)
            : [...config.testIds, testId]
        };
      })
    }));
  }, []);
  
  const setProjectName = useCallback((name: string) => {
    setWorkspace(prev => ({
      ...prev,
      projectName: name
    }));
  }, []);

  const clearWorkspace = useCallback(() => {
    setWorkspace(getInitialWorkspace());
  }, []);

  return {
    workspace,
    loadMasterList,
    addTest,
    updateTest,
    deleteTest,
    addConfiguration,
    updateConfiguration,
    deleteConfiguration,
    toggleTestInConfiguration,
    setProjectName,
    clearWorkspace
  };
}
