import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Plus, Trash2, FileSpreadsheet, Settings, FolderCog, Save, FileHeart, Edit2, X, Link as LinkIcon, FileText, ChevronRight, ChevronDown, CheckCheck } from 'lucide-react';
import { useWorkspace } from './hooks/useWorkspace';
import { exportProjectToExcel, parseExcelFile } from './services/excelService';
import { TestRecord } from './types';
import { cn } from './lib/utils';

import Dashboard from './components/Dashboard';
import ExecutionView from './components/ExecutionView';

export default function App() {
  const {
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
  } = useWorkspace();

  const [currentView, setCurrentView] = useState<'dashboard' | 'execution' | 'master' | 'config'>('dashboard');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safely fallback if active config is deleted
  useEffect(() => {
    if (activeConfigId && !workspace.configurations.find(c => c.id === activeConfigId)) {
      setActiveConfigId(null);
      setCurrentView('master');
    }
  }, [workspace.configurations, activeConfigId]);

  // Editing state
  const [editingTest, setEditingTest] = useState<Partial<TestRecord> | null>(null);
  const [originalTestId, setOriginalTestId] = useState<string | null>(null);
  const [isNewTest, setIsNewTest] = useState(false);

  // Custom confirm state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const [masterFilters, setMasterFilters] = useState<Record<string, string>>({});

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const records = await parseExcelFile(e.target.files[0]);
        loadMasterList(records);
      } catch (err) {
        console.error("Failed to parse Excel file.", err);
      }
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    exportProjectToExcel(workspace);
  };

  const activeConfig = activeConfigId 
    ? workspace.configurations.find(c => c.id === activeConfigId) 
    : null;

  const getCategoryTagStyle = (category: string) => {
    if (!category) return "bg-[#e1e8ed] text-[#2f3640]";
    const lower = category.toLowerCase();
    if (lower.includes('performance')) return "bg-[#dff9fb] text-[#130f40]";
    if (lower.includes('safety') || lower.includes('condensation')) return "bg-[#ffeaa7] text-[#d35400]";
    if (lower.includes('compliance') || lower.includes('emc')) return "bg-[#badc58] text-[#2d3436]";
    return "bg-[#e1e8ed] text-[#2f3640]";
  };

  const openNewTestModal = () => {
    const defaultTest: TestRecord = {
      TestID: `T-${Date.now().toString().slice(-4)}`,
      TestName: '',
      Category: '',
      ScopeLevel: '',
      ScopeTags: '',
      AppliesToPath: '',
      PriorityDefault: '',
      ExecutionModeDefault: '',
      Status: 'Pending',
      ActiveTime_Value: '',
      RunningTime_Value: '',
      RunningTime_Unit: '',
      DecisionRule: '',
      MinLimit: '',
      MaxLimit: '',
      TargetValue: '',
      AcceptanceUnit: '',
      AcceptanceSourceType: '',
      SourceRef: '',
      Notes: '',
      ParentTestID: '',
      Description: '',
      DescriptionLink: ''
    };
    setOriginalTestId(defaultTest.TestID);
    setEditingTest(defaultTest);
    setIsNewTest(true);
  };

  const openNewSubTestModal = (parent: TestRecord) => {
    const siblings = workspace.masterList.filter(t => t.ParentTestID === parent.TestID);
    const nextNum = siblings.length + 1;
    const autoId = `${parent.TestID}.${nextNum}`;

    setOriginalTestId(autoId);
    setEditingTest({
      ...parent,
      TestID: autoId,
      ParentTestID: parent.TestID,
      TestName: `Sub-test for ${parent.TestName}`,
      Status: 'Pending',
      RunningTime_Value: '',
      ActualTime_Value: '',
      ReportLink: '',
      Notes: '',
      Description: '',
      DescriptionLink: '',
      PassFailCriteria: ''
    });
    setIsNewTest(true);
  };

  const handleSaveTest = () => {
    if (!editingTest || !editingTest.TestID) return;
    
    // Check for duplicates
    const isDuplicate = workspace.masterList.some(
      t => t.TestID.toLowerCase() === editingTest.TestID?.toLowerCase() && 
      (isNewTest || t.TestID.toLowerCase() !== originalTestId?.toLowerCase())
    );

    if (isDuplicate) {
      alert(`A test with ID "${editingTest.TestID}" already exists. Please choose a unique Test ID.`);
      return;
    }

    if (isNewTest) {
      addTest(editingTest as TestRecord);
    } else {
      if (originalTestId) {
        updateTest(originalTestId, editingTest);
      }
    }
    setEditingTest(null);
    setOriginalTestId(null);
  };

  const renderConfigNode = (config: import('./types').TestConfiguration, depth: number) => {
    const children = workspace.configurations.filter(c => c.parentId === config.id);
    const isSelected = currentView === 'config' && activeConfigId === config.id;
    
    return (
      <React.Fragment key={config.id}>
        <li>
          <div
            className={cn(
              "w-full flex items-center justify-between py-2.5 text-[14px] transition-all group cursor-pointer",
              isSelected ? "bg-white/10 border-l-[4px] border-[#3498db] pr-6" : "pr-6 hover:bg-white/10"
            )}
            style={{ paddingLeft: isSelected ? `${20 + depth * 16}px` : `${24 + depth * 16}px` }}
            onClick={() => { setCurrentView('config'); setActiveConfigId(config.id); }}
          >
            <div className="flex items-center truncate">
              <div className={cn("w-2 h-2 rounded-full mr-3 shrink-0", isSelected ? "bg-[#27ae60]" : "bg-transparent")}></div>
              <span className="truncate">{config.name}</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 shrink-0 transition">
              <Plus 
                className="w-4 h-4 hover:text-[#3498db] transition"
                onClick={(e) => {
                  e.stopPropagation();
                  addConfiguration("New Sub-Plan", config.id);
                }}
                title="Add Sub-Plan"
              />
              <Trash2 
                className="w-3.5 h-3.5 hover:text-red-400 transition" 
                onClick={(e) => {
                  e.stopPropagation();
                  confirmAction("Delete this plan and all sub-plans?", () => {
                    deleteConfiguration(config.id);
                  });
                }}
                title="Delete Plan"
              />
            </div>
          </div>
        </li>
        {children.map(child => renderConfigNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  const filteredMasterList = workspace.masterList.filter(test => {
    if (masterFilters.TestID && !(test.TestID || '').toLowerCase().includes(masterFilters.TestID.toLowerCase())) return false;
    if (masterFilters.TestName && !(test.TestName || '').toLowerCase().includes(masterFilters.TestName.toLowerCase())) return false;
    if (masterFilters.Category && !(test.Category || '').toLowerCase().includes(masterFilters.Category.toLowerCase())) return false;
    if (masterFilters.ScopeLevel && !(test.ScopeLevel || '').toLowerCase().includes(masterFilters.ScopeLevel.toLowerCase())) return false;
    if (masterFilters.DecisionRule && !(test.DecisionRule || '').toLowerCase().includes(masterFilters.DecisionRule.toLowerCase())) return false;
    if (masterFilters.ScopeTags && !(test.ScopeTags || '').toLowerCase().includes(masterFilters.ScopeTags.toLowerCase())) return false;
    if (masterFilters.PriorityDefault && !(test.PriorityDefault || '').toLowerCase().includes(masterFilters.PriorityDefault.toLowerCase())) return false;
    if (masterFilters.SourceRef && !(test.SourceRef || '').toLowerCase().includes(masterFilters.SourceRef.toLowerCase())) return false;
    return true;
  });

  const [collapsedTests, setCollapsedTests] = useState<Set<string>>(new Set());

  const toggleCollapse = (testId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const getDescendantIds = (testId: string): string[] => {
    const descendants: string[] = [];
    const traverse = (id: string) => {
      const children = workspace.masterList.filter(t => t.ParentTestID === id);
      children.forEach(child => {
        descendants.push(child.TestID);
        traverse(child.TestID);
      });
    };
    traverse(testId);
    return descendants;
  };

  const handleSelectBranch = (testId: string, e: React.MouseEvent, select: boolean) => {
    e.stopPropagation();
    if (!activeConfigId) return;
    
    const config = workspace.configurations.find(c => c.id === activeConfigId);
    if (!config) return;

    const idsToChange = [testId, ...getDescendantIds(testId)];
    let newIds = [...config.testIds];
    
    if (select) {
      idsToChange.forEach(id => { if (!newIds.includes(id)) newIds.push(id) });
    } else {
      newIds = newIds.filter(id => !idsToChange.includes(id));
    }
    updateConfiguration(activeConfigId, { testIds: newIds });
  };

  const buildTestHierarchy = (testList: import('./types').TestRecord[]) => {
    const map = new Map<string, import('./types').TestRecord[]>();
    const testIds = new Set(testList.map(t => t.TestID));
    
    const roots: import('./types').TestRecord[] = [];

    testList.forEach(t => {
      const p = t.ParentTestID || '';
      // If it doesn't have a parent, OR its parent is not within this list, it's a root.
      if (!p || !testIds.has(p)) {
        roots.push(t);
      } else {
        if (!map.has(p)) map.set(p, []);
        map.get(p)!.push(t);
      }
    });

    // Find any disjoint circular references before rendering so we don't confuse them with deliberately collapsed children
    const reachable = new Set<import('./types').TestRecord>();
    const markReachable = (tests: import('./types').TestRecord[]) => {
      tests.forEach(child => {
        if (reachable.has(child)) return;
        reachable.add(child);
        markReachable(map.get(child.TestID) || []);
      });
    };
    markReachable(roots);
    
    testList.forEach(t => {
      if (!reachable.has(t)) {
        roots.push(t);
        markReachable([t]); // mark this disjoint loop as reachable
      }
    });
    
    const result: { test: import('./types').TestRecord, depth: number, hasChildren: boolean }[] = [];
    const added = new Set<import('./types').TestRecord>(); // prevent infinite loops using object identity
    
    const traverse = (tests: import('./types').TestRecord[], depth: number) => {
      tests.forEach(child => {
        if (added.has(child)) return;
        added.add(child);
        
        const children = map.get(child.TestID) || [];
        const hasChildren = children.length > 0;
        
        result.push({ test: child, depth, hasChildren });
        
        if (!collapsedTests.has(child.TestID)) {
          traverse(children, depth + 1);
        }
      });
    };

    traverse(roots, 0);
    return result;
  };

  const hasFilters = Object.values(masterFilters).some(v => v !== '');
  const displayTests = hasFilters 
    ? filteredMasterList.map(t => ({ test: t, depth: 0, hasChildren: false }))
    : buildTestHierarchy(filteredMasterList);

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] text-[#2f3640] font-['Helvetica_Neue',Helvetica,Arial,sans-serif] overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-[260px] bg-[#1a252f] text-[#ecf0f1] flex flex-col flex-shrink-0 pt-5 border-r border-[#dcdde1]">
        <div className="px-6 pb-6 flex items-center space-x-2.5">
          <div className="w-6 h-6 bg-[#3498db] rounded flex items-center justify-center shrink-0">
            <FolderCog className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-extrabold text-[18px] tracking-[-0.5px] uppercase">TestArchitect Pro</h1>
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col gap-y-[30px] pb-6">
          
          {/* Project Info */}
          <div>
            <label className="block text-[11px] uppercase tracking-[1px] opacity-50 px-6 pb-2.5 font-normal">Current Project</label>
            <div className="px-6">
              <input 
                type="text" 
                value={workspace.projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[14px] text-[#ecf0f1] focus:outline-none focus:border-[#3498db] transition-colors"
              />
            </div>
          </div>

          {/* Core Actions */}
          <div>
            <label className="block text-[11px] uppercase tracking-[1px] opacity-50 px-6 pb-2.5 font-normal">Data Actions</label>
            
            <input 
              type="file" 
              accept=".xlsx, .xls"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
            
            <div className="px-6 space-y-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-[#dcdde1] text-[#2f3640] px-4 py-2 rounded-[4px] text-[13px] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import Template</span>
              </button>
              
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center space-x-2 bg-[#3498db] border border-[#3498db] text-white px-4 py-2 rounded-[4px] text-[13px] font-semibold cursor-pointer hover:bg-[#2980b9] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Batch Export (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Views */}
          <div>
            <label className="block text-[11px] uppercase tracking-[1px] opacity-50 px-6 pb-2.5 font-normal">Test Structures</label>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "w-full flex items-center space-x-2 py-2.5 text-[14px] transition-all text-left",
                currentView === 'dashboard' ? "bg-white/10 border-l-[4px] border-[#3498db] pl-5 pr-6" : "pl-6 pr-6 hover:bg-white/10"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full mr-1", currentView === 'dashboard' ? "bg-[#3498db]" : "bg-transparent")}></div>
              <span>Project Dashboard</span>
            </button>
            <button 
              onClick={() => setCurrentView('execution')}
              className={cn(
                "w-full flex items-center space-x-2 py-2.5 text-[14px] transition-all text-left",
                currentView === 'execution' ? "bg-white/10 border-l-[4px] border-[#3498db] pl-5 pr-6" : "pl-6 pr-6 hover:bg-white/10"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full mr-1", currentView === 'execution' ? "bg-[#e67e22]" : "bg-transparent")}></div>
              <span>Test Results</span>
            </button>
            <button 
              onClick={() => { setCurrentView('master'); setActiveConfigId(null); }}
              className={cn(
                "w-full flex items-center space-x-2 py-2.5 text-[14px] transition-all text-left",
                currentView === 'master' ? "bg-white/10 border-l-[4px] border-[#3498db] pl-5 pr-6" : "pl-6 pr-6 hover:bg-white/10"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full mr-1", currentView === 'master' ? "bg-[#27ae60]" : "bg-transparent")}></div>
              <span>Master Data List</span>
            </button>
          </div>

          {/* Configurations */}
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[1px] opacity-50 px-6 pb-2.5 font-normal">
              <span>Active Sheet Config</span>
              <button 
                onClick={() => addConfiguration("New Plan")} 
                className="hover:text-white p-1 bg-white/5 rounded hover:bg-white/20 transition-colors"
                title="Add New Plan"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            {workspace.configurations.length === 0 && (
              <div className="text-[13px] text-[#7f8c8d] italic px-6 py-2">
                No configurations yet.
              </div>
            )}

            <ul className="space-y-0">
              {workspace.configurations
                .filter(config => !config.parentId)
                .map(config => renderConfigNode(config, 0))}
            </ul>
          </div>
          
          <div className="pt-4 mt-auto border-t border-white/10 px-6">
            <button 
                onClick={() => {
                   confirmAction('Are you sure you want to clear the workspace? This will delete all tests and plans permanently.', () => {
                      clearWorkspace();
                      setActiveConfigId(null);
                   });
                }}
                className="w-full text-left text-[13px] text-red-400 hover:text-red-300 transition"
            >
                Reset Workspace Data
            </button>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden relative">
        
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#dcdde1] flex items-center px-6 justify-between flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-bold tracking-[-0.5px]">
              {currentView === 'dashboard' ? "Project Dashboard" :
               currentView === 'execution' ? "Test Results" :
               activeConfigId === null ? "Master Data Validation" : `Editing Config`}
            </h2>
          </div>
          {activeConfig && (
            <div className="flex items-center space-x-4">
              <div className="flex flex-col text-right">
                <input 
                  type="text" 
                  value={activeConfig.name}
                  onChange={(e) => updateConfiguration(activeConfig.id, { name: e.target.value })}
                  className="text-[14px] font-bold border-b border-dashed border-[#dcdde1] focus:border-[#3498db] focus:outline-none pb-[2px] bg-transparent text-[#2f3640]"
                />
              </div>
            </div>
          )}
        </header>

        {/* Views */}
        {currentView === 'dashboard' && <Dashboard workspace={workspace} />}
        {currentView === 'execution' && <ExecutionView workspace={workspace} updateTest={updateTest} />}
        
        {(currentView === 'master' || currentView === 'config') && (
        <main className="flex-1 p-6 flex flex-col gap-5 overflow-hidden">
          
          <div className="flex justify-between items-center text-[13px] text-[#7f8c8d]">
            <div>
              Projects / <strong className="text-[#2f3640]">{workspace.projectName}</strong> / <strong className="text-[#2f3640]">{activeConfigId === null ? "Master Data List" : activeConfig.name}</strong>
            </div>
            {activeConfigId === null && (
               <button 
                  onClick={openNewTestModal}
                  className="bg-[#3498db] text-white px-3 py-1.5 rounded-[4px] font-semibold hover:bg-[#2980b9] shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition flex items-center gap-1.5"
               >
                 <Plus className="w-3.5 h-3.5" /> New Test
               </button>
            )}
          </div>

          {workspace.masterList.length === 0 ? (
            <div className="flex-1 bg-white border border-[#dcdde1] rounded-[8px] flex flex-col items-center justify-center text-[#7f8c8d] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <FileHeart className="w-16 h-16 opacity-30 text-[#3498db]" />
              <div className="text-center">
                <p className="text-[15px] font-bold text-[#2f3640] mb-1">No Tests Loaded</p>
                <p className="text-[13px] max-w-sm mb-4">Import an Excel Master Template using the sidebar to populate the workspace, or create one manually.</p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white hover:bg-gray-50 text-[#2f3640] px-4 py-2 rounded-[4px] text-[13px] font-semibold transition border border-[#dcdde1]"
                  >
                    Import Excel
                  </button>
                  <button 
                    onClick={openNewTestModal}
                    className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-[4px] text-[13px] font-semibold transition border border-[#3498db]"
                  >
                    Create Manual Test
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-[8px] border-[#dcdde1] overflow-hidden flex flex-col flex-1 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              {/* Grid Toolbar */}
              <div className="px-4 py-3 border-b border-[#dcdde1] bg-[#f8f9fa] flex justify-between items-center">
                <div className="text-[14px] font-bold text-[#2f3640]">
                  {activeConfigId === null ? "Editing Master Structure (Sheet 1)" : `Configuration Selection (Active)`}
                </div>
                <div className="text-[12px] text-[#7f8c8d] border border-[#dcdde1] bg-white px-2 py-1 rounded-[3px]">
                   Viewing {filteredMasterList.length} items
                </div>
              </div>

              <div className="overflow-x-auto flex-1 bg-white relative">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead className="sticky top-0 z-10 transition-shadow bg-[#f1f2f6]">
                    <tr>
                      {activeConfigId === null && (
                        <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] w-12 text-center shadow-[0_1px_0_#dcdde1] align-top">
                          Actions
                        </th>
                      )}
                      {activeConfigId && (
                        <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] w-12 text-center shadow-[0_1px_0_#dcdde1] align-top">
                          Active
                        </th>
                      )}
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">TEST_ID</div>
                        <input type="text" value={masterFilters.TestID || ''} onChange={e => setMasterFilters({...masterFilters, TestID: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Requirement Description</div>
                        <input type="text" value={masterFilters.TestName || ''} onChange={e => setMasterFilters({...masterFilters, TestName: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Category</div>
                        <input type="text" value={masterFilters.Category || ''} onChange={e => setMasterFilters({...masterFilters, Category: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">System Level</div>
                        <input type="text" value={masterFilters.ScopeLevel || ''} onChange={e => setMasterFilters({...masterFilters, ScopeLevel: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Verification Method</div>
                        <input type="text" value={masterFilters.DecisionRule || ''} onChange={e => setMasterFilters({...masterFilters, DecisionRule: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Scope Tags</div>
                        <input type="text" value={masterFilters.ScopeTags || ''} onChange={e => setMasterFilters({...masterFilters, ScopeTags: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Priority</div>
                        <input type="text" value={masterFilters.PriorityDefault || ''} onChange={e => setMasterFilters({...masterFilters, PriorityDefault: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                      <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                        <div className="mb-1">Compliance</div>
                        <input type="text" value={masterFilters.SourceRef || ''} onChange={e => setMasterFilters({...masterFilters, SourceRef: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTests.map(({ test, depth, hasChildren }, i) => {
                      const isIncluded = activeConfig ? activeConfig.testIds.includes(test.TestID) : true;
                      
                      return (
                        <tr 
                          key={`${test.TestID}-${i}`} 
                          className={cn(
                            "hover:bg-[#f8f9fa] transition-colors cursor-default border-b border-[#dcdde1]",
                            activeConfig && isIncluded ? "bg-[#f0f9ff]" : "",
                            activeConfig && !isIncluded ? "opacity-50" : ""
                          )}
                          onClick={() => {
                            if (activeConfigId) {
                              toggleTestInConfiguration(activeConfigId, test.TestID);
                            }
                          }}
                        >
                          {activeConfigId === null && (
                            <td className="px-3 py-2.5 border-r border-[#dcdde1] text-center whitespace-nowrap align-top">
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setOriginalTestId(test.TestID);
                                  setEditingTest(test); 
                                  setIsNewTest(false); 
                                }}
                                className="p-1 text-[#3498db] hover:bg-[#3498db]/10 rounded mx-0.5"
                                title="Edit Test"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openNewSubTestModal(test); }}
                                className="p-1 text-[#27ae60] hover:bg-[#27ae60]/10 rounded mx-0.5"
                                title="Add Sub-test"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  confirmAction(`Delete ${test.TestID}?`, () => deleteTest(test.TestID)); 
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded mx-0.5"
                                title="Delete Test"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}

                          {activeConfigId && (
                            <td className="px-4 py-2.5 border-r border-[#dcdde1] text-center align-top">
                              <input 
                                type="checkbox" 
                                checked={isIncluded}
                                readOnly
                                className="w-4 h-4 text-[#3498db] rounded border-[#dcdde1] focus:ring-[#3498db] cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] font-['Courier_New',Courier,monospace] font-bold text-[#3498db] whitespace-nowrap min-w-[100px] text-ellipsis align-top">
                            <div style={{ marginLeft: `${depth * 16}px` }} className="flex items-center gap-1.5">
                              {hasChildren && (
                                <button 
                                  onClick={(e) => toggleCollapse(test.TestID, e)}
                                  className="w-4 h-4 flex items-center justify-center text-[#7f8c8d] hover:text-[#2f3640] hover:bg-black/5 rounded transition-colors"
                                >
                                  {collapsedTests.has(test.TestID) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {!hasChildren && depth > 0 && <span className="text-[#bdc3c7]">└</span>}
                              {test.TestID}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap min-w-[200px] overflow-hidden text-ellipsis align-top" title={test.TestName}>
                            <div className="flex items-center justify-between">
                              <span className="truncate">{test.TestName}</span>
                              <div className="flex items-center flex-shrink-0">
                                {(test.Description || test.DescriptionLink) && (
                                  <span className="inline-flex items-center ml-2 space-x-1 text-[#7f8c8d]">
                                    {test.Description && <FileText className="w-3 h-3" title="Has Description" />}
                                    {test.DescriptionLink && (
                                      <a href={test.DescriptionLink} target="_blank" rel="noopener noreferrer" className="text-[#3498db] hover:text-[#2980b9]" onClick={(e) => e.stopPropagation()} title="Open Description Link">
                                        <LinkIcon className="w-3 h-3" />
                                      </a>
                                    )}
                                  </span>
                                )}
                                {activeConfigId && hasChildren && (
                                  <div className="ml-2 pl-2 border-l border-[#dcdde1] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => handleSelectBranch(test.TestID, e, true)}
                                      className="text-[10px] uppercase font-bold text-[#3498db] hover:bg-[#3498db]/10 px-1.5 py-0.5 rounded flex items-center"
                                      title="Select this and all sub-tests"
                                    >
                                      + Array
                                    </button>
                                    <button 
                                      onClick={(e) => handleSelectBranch(test.TestID, e, false)}
                                      className="text-[10px] uppercase font-bold text-[#e74c3c] hover:bg-[#e74c3c]/10 px-1.5 py-0.5 rounded flex items-center"
                                      title="Deselect this and all sub-tests"
                                    >
                                      - Array
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap align-top">
                            <span className={cn("inline-flex items-center px-2 py-[2px] rounded-[12px] text-[11px] font-bold", getCategoryTagStyle(test.Category))}>
                              {test.Category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap overflow-hidden text-ellipsis align-top">{test.ScopeLevel}</td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap overflow-hidden text-ellipsis align-top">{test.DecisionRule}</td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap overflow-hidden text-ellipsis min-w-[150px] align-top">{test.ScopeTags}</td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap overflow-hidden text-ellipsis align-top">{test.PriorityDefault}</td>
                          <td className="px-4 py-2.5 border-r border-[#dcdde1] whitespace-nowrap overflow-hidden text-ellipsis align-top">{test.SourceRef}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {activeConfig && (
                <div className="bg-[#f8f9fa] border-t border-[#dcdde1] p-2.5 text-[12px] text-[#7f8c8d] flex justify-between items-center px-4">
                  <span>
                    <strong className="text-[#2f3640]">{activeConfig.testIds.length}</strong> tests assigned to <strong className="text-[#2f3640]">{activeConfig.name}</strong> out of {workspace.masterList.length} total.
                  </span>
                </div>
              )}
            </div>
          )}
        </main>
        )}
      </div>

      {/* Editor Modal Overlay */}
      {editingTest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center backdrop-blur-[1px] p-4 text-left">
          <div className="bg-white w-full max-w-2xl rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col max-h-full border border-[#dcdde1]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#dcdde1] bg-[#f8f9fa] rounded-t-[8px]">
              <h3 className="font-bold text-[16px] text-[#2f3640] tracking-[-0.3px]">
                {isNewTest ? "Create New Test Record" : `Editing Test: ${editingTest.TestID}`}
              </h3>
              <button 
                onClick={() => setEditingTest(null)} 
                className="text-[#7f8c8d] hover:text-[#2f3640] hover:bg-gray-200 rounded p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Test ID</label>
                  <input 
                    type="text" 
                    value={editingTest.TestID || ''} 
                    onChange={e => setEditingTest({...editingTest, TestID: e.target.value})}
                    placeholder="E.g., TST-001"
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Parent Test ID</label>
                  <input 
                    type="text" 
                    value={editingTest.ParentTestID || ''} 
                    onChange={e => setEditingTest({...editingTest, ParentTestID: e.target.value})}
                    placeholder="Optional (e.g. parent test id)"
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Category</label>
                  <input 
                    list="category-options"
                    type="text" 
                    value={editingTest.Category || ''} 
                    onChange={e => setEditingTest({...editingTest, Category: e.target.value})}
                    placeholder="E.g., Performance, Safety"
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                  <datalist id="category-options">
                    <option value="Performance" />
                    <option value="Compliance" />
                    <option value="Safety" />
                    <option value="Lifetime/Reliability" />
                    <option value="Environmental" />
                  </datalist>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Requirement / Test Name</label>
                  <input 
                    type="text" 
                    value={editingTest.TestName || ''} 
                    onChange={e => setEditingTest({...editingTest, TestName: e.target.value})}
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Test Description / Method</label>
                  <textarea 
                    value={editingTest.Description || ''} 
                    onChange={e => setEditingTest({...editingTest, Description: e.target.value})}
                    placeholder="Describe the test procedure, conditions, or any detailed instructions..."
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db] min-h-[80px] resize-y"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Test Description Link (External Document/Wiki)</label>
                  <input 
                    type="url" 
                    value={editingTest.DescriptionLink || ''} 
                    onChange={e => setEditingTest({...editingTest, DescriptionLink: e.target.value})}
                    placeholder="https://..."
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Pass/Fail Criteria</label>
                  <textarea 
                    value={editingTest.PassFailCriteria || ''} 
                    onChange={e => setEditingTest({...editingTest, PassFailCriteria: e.target.value})}
                    placeholder="Describe clear pass/fail conditions..."
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#27ae60] min-h-[60px] resize-y bg-green-50/30"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">System Level</label>
                  <input 
                    list="system-level-options"
                    type="text" 
                    value={editingTest.ScopeLevel || ''} 
                    onChange={e => setEditingTest({...editingTest, ScopeLevel: e.target.value})}
                    placeholder="Complete, Sub-system, Component"
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                  <datalist id="system-level-options">
                    <option value="Complete System" />
                    <option value="Sub-system" />
                    <option value="Component" />
                    <option value="Material" />
                  </datalist>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Scope Tags (';' separated)</label>
                  <input 
                    type="text" 
                    value={editingTest.ScopeTags || ''} 
                    onChange={e => setEditingTest({...editingTest, ScopeTags: e.target.value})}
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Verification Method / Rule</label>
                  <input 
                    type="text" 
                    value={editingTest.DecisionRule || ''} 
                    onChange={e => setEditingTest({...editingTest, DecisionRule: e.target.value})}
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Priority</label>
                  <input 
                    list="priority-options"
                    type="text" 
                    value={editingTest.PriorityDefault || ''} 
                    onChange={e => setEditingTest({...editingTest, PriorityDefault: e.target.value})}
                    placeholder="High, Low, Must, Should"
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                  <datalist id="priority-options">
                    <option value="Critical" />
                    <option value="High" />
                    <option value="Medium" />
                    <option value="Low" />
                    <option value="Must" />
                    <option value="Should" />
                  </datalist>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Compliance / Source Ref</label>
                  <input 
                    type="text" 
                    value={editingTest.SourceRef || ''} 
                    onChange={e => setEditingTest({...editingTest, SourceRef: e.target.value})}
                    className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Duration (Value & Unit)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editingTest.RunningTime_Value || ''} 
                      onChange={e => setEditingTest({...editingTest, RunningTime_Value: e.target.value})}
                      placeholder="e.g. 500"
                      className="w-1/2 border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                    />
                    <input 
                      type="text" 
                      value={editingTest.RunningTime_Unit || ''} 
                      onChange={e => setEditingTest({...editingTest, RunningTime_Unit: e.target.value})}
                      placeholder="Hours, Days"
                      className="w-1/2 border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#dcdde1] bg-[#f8f9fa] flex justify-end gap-3 rounded-b-[8px]">
              <button 
                onClick={() => setEditingTest(null)}
                className="px-4 py-2 bg-white border border-[#dcdde1] text-[#2f3640] rounded-[4px] font-semibold text-[13px] hover:bg-gray-50 focus:outline-none transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTest}
                className="px-4 py-2 bg-[#3498db] border border-[#3498db] text-white rounded-[4px] font-semibold text-[13px] hover:bg-[#2980b9] focus:outline-none transition"
              >
                {isNewTest ? "Create Record" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex justify-center items-center backdrop-blur-[1px] p-4 text-left">
          <div className="bg-white w-full max-w-sm rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col border border-[#dcdde1]">
            <div className="p-6">
              <h3 className="font-bold text-[16px] text-[#2f3640] mb-2">Confirm Action</h3>
              <p className="text-[14px] text-[#7f8c8d]">{confirmDialog.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-[#dcdde1] bg-[#f8f9fa] flex justify-end gap-3 rounded-b-[8px]">
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 bg-white border border-[#dcdde1] text-[#2f3640] rounded-[4px] font-semibold text-[13px] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-4 py-2 bg-[#e74c3c] border border-[#e74c3c] text-white rounded-[4px] font-semibold text-[13px] hover:bg-[#c0392b] transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
