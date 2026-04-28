import React, { useState } from 'react';
import { ProjectWorkspace, TestRecord, TestConfiguration } from '../types';
import { cn } from '../lib/utils';
import { FileEdit, X, CheckSquare, Save, PlayCircle, AlertCircle, Link as LinkIcon, FileText, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  workspace: ProjectWorkspace;
  updateTest: (id: string, updates: Partial<TestRecord>) => void;
}

export default function ExecutionView({ workspace, updateTest }: Props) {
  const [selectedConfigId, setSelectedConfigId] = useState<string>('all');
  const [editingResult, setEditingResult] = useState<TestRecord | null>(null);
  const [executionFilters, setExecutionFilters] = useState<Record<string, string>>({});
  const [collapsedTests, setCollapsedTests] = useState<Set<string>>(new Set());

  const toggleCollapse = (testId: string) => {
    setCollapsedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const tests = selectedConfigId === 'all' 
    ? workspace.masterList 
    : workspace.masterList.filter(t => 
        workspace.configurations.find(c => c.id === selectedConfigId)?.testIds.includes(t.TestID)
      );

  const filteredTests = tests.filter(test => {
    if (executionFilters.TestID && !(test.TestID || '').toLowerCase().includes(executionFilters.TestID.toLowerCase())) return false;
    if (executionFilters.TestName && !(test.TestName || '').toLowerCase().includes(executionFilters.TestName.toLowerCase())) return false;
    if (executionFilters.PriorityDefault && !(test.PriorityDefault || '').toLowerCase().includes(executionFilters.PriorityDefault.toLowerCase())) return false;
    if (executionFilters.Status && !(test.Status || '').toLowerCase().includes(executionFilters.Status.toLowerCase())) return false;
    if (executionFilters.ActualTime_Value && !(test.ActualTime_Value?.toString() || '').toLowerCase().includes(executionFilters.ActualTime_Value.toLowerCase())) return false;
    if (executionFilters.ReportLink && !(test.ReportLink || '').toLowerCase().includes(executionFilters.ReportLink.toLowerCase())) return false;
    return true;
  });

  const buildTestHierarchy = (testList: TestRecord[]) => {
    const map = new Map<string, TestRecord[]>();
    const testIds = new Set(testList.map(t => t.TestID));
    
    const roots: TestRecord[] = [];

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
    
    const result: { test: TestRecord, depth: number, hasChildren: boolean }[] = [];
    const added = new Set<string>(); // prevent infinite loops
    
    const traverse = (tests: TestRecord[], depth: number, isVisible: boolean) => {
      tests.forEach(child => {
        if (added.has(child.TestID)) return;
        added.add(child.TestID);
        
        const children = map.get(child.TestID) || [];
        const hasChildren = children.length > 0;
        
        if (isVisible) {
          result.push({ test: child, depth, hasChildren });
        }
        
        const childrenVisible = isVisible && !collapsedTests.has(child.TestID);
        traverse(children, depth + 1, childrenVisible);
      });
    };

    traverse(roots, 0, true);

    // Any tests left over are part of disjoint circular references
    const missed = testList.filter(t => !added.has(t.TestID));
    if (missed.length > 0) {
      traverse(missed, 0, true);
    }
    
    return result;
  };

  const hasFilters = Object.values(executionFilters).some(v => v !== '');
  const displayTests = hasFilters 
    ? filteredTests.map(t => ({ test: t, depth: 0, hasChildren: false }))
    : buildTestHierarchy(filteredTests);

  const handleSaveResult = () => {
    if (!editingResult) return;
    updateTest(editingResult.TestID, {
      Status: editingResult.Status,
      ActualTime_Value: editingResult.ActualTime_Value,
      ReportLink: editingResult.ReportLink,
      Notes: editingResult.Notes
    });
    setEditingResult(null);
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'passed') return "bg-[#27ae60]/10 text-[#27ae60] border border-[#27ae60]/20";
    if (s === 'failed') return "bg-[#e74c3c]/10 text-[#e74c3c] border border-[#e74c3c]/20";
    if (s === 'ongoing') return "bg-[#f39c12]/10 text-[#f39c12] border border-[#f39c12]/20";
    return "bg-[#f1f2f6] text-[#7f8c8d] border border-[#dcdde1]";
  };

  const configHierarchy: { config: TestConfiguration, depth: number }[] = [];
  const buildConfigHierarchy = (parentId?: string, depth = 0) => {
    const children = workspace.configurations.filter(c => c.parentId === parentId);
    children.forEach(c => {
      configHierarchy.push({ config: c, depth });
      buildConfigHierarchy(c.id, depth + 1);
    });
  };
  buildConfigHierarchy(undefined, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-[#f0f2f5] text-[#2f3640]">
      
      <div className="flex justify-between items-center p-6 border-b border-[#dcdde1] bg-white flex-shrink-0">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.5px]">Test Execution & Results</h2>
          <p className="text-[14px] text-[#7f8c8d]">Fill in results and link reports</p>
        </div>
        <div>
          <select 
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="border border-[#dcdde1] rounded-[4px] px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#3498db]"
          >
            <option value="all">All Tests (Master List)</option>
            {configHierarchy.map(({ config, depth }) => (
              <option key={config.id} value={config.id}>
                Plan: {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{config.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="bg-white border rounded-[8px] border-[#dcdde1] overflow-hidden flex flex-col flex-1 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto flex-1 bg-white relative">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 transition-shadow bg-[#f1f2f6]">
                <tr>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">TEST_ID</div>
                    <input type="text" value={executionFilters.TestID || ''} onChange={e => setExecutionFilters({...executionFilters, TestID: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">Requirement / Name</div>
                    <input type="text" value={executionFilters.TestName || ''} onChange={e => setExecutionFilters({...executionFilters, TestName: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">Priority</div>
                    <input type="text" value={executionFilters.PriorityDefault || ''} onChange={e => setExecutionFilters({...executionFilters, PriorityDefault: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">Status</div>
                    <input type="text" value={executionFilters.Status || ''} onChange={e => setExecutionFilters({...executionFilters, Status: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">Actual Time</div>
                    <input type="text" value={executionFilters.ActualTime_Value || ''} onChange={e => setExecutionFilters({...executionFilters, ActualTime_Value: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] whitespace-nowrap shadow-[0_1px_0_#dcdde1] align-top">
                    <div className="mb-1">Report Link</div>
                    <input type="text" value={executionFilters.ReportLink || ''} onChange={e => setExecutionFilters({...executionFilters, ReportLink: e.target.value})} placeholder="Filter..." className="w-full border border-[#dcdde1] rounded px-1.5 py-0.5 text-[11px] font-normal text-[#2f3640] focus:outline-none focus:border-[#3498db]" />
                  </th>
                  <th className="px-4 py-3 border-r border-b border-[#dcdde1] font-semibold text-[#7f8c8d] w-24 text-center shadow-[0_1px_0_#dcdde1] align-top">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayTests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#7f8c8d] italic">No tests found for this selection.</td>
                  </tr>
                ) : (
                  displayTests.map(({ test, depth, hasChildren }, idx) => (
                    <tr key={`${test.TestID}-${idx}`} className="hover:bg-[#f8f9fa] transition-colors cursor-default border-b border-[#dcdde1] last:border-b-0">
                      <td className="px-4 py-3 border-r border-[#dcdde1] font-['Courier_New',Courier,monospace] font-bold text-[#3498db] whitespace-nowrap align-top">
                        <div style={{ marginLeft: `${depth * 16}px` }} className="flex items-center gap-1.5">
                          {hasChildren && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse(test.TestID);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-[#7f8c8d] hover:text-[#2f3640] hover:bg-black/5 rounded transition-colors"
                            >
                              {collapsedTests.has(test.TestID) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!hasChildren && depth > 0 && <span className="text-[#bdc3c7]">└</span>}
                          {test.TestID}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] min-w-[200px] overflow-hidden text-ellipsis align-top" title={test.TestName}>
                        {test.TestName}
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
                      </td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] whitespace-nowrap align-top">{test.PriorityDefault}</td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] whitespace-nowrap align-top">
                        <span className={cn("inline-flex items-center px-2.5 py-[3px] rounded-[4px] text-[11px] font-bold", getStatusStyle(test.Status))}>
                          {test.Status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] whitespace-nowrap align-top">{test.ActualTime_Value ? `${test.ActualTime_Value} ${test.RunningTime_Unit}` : '-'}</td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis align-top">
                        {test.ReportLink ? (
                          <a href={test.ReportLink} target="_blank" rel="noreferrer" className="text-[#3498db] hover:underline flex items-center gap-1">
                            <FileEdit className="w-3 h-3" /> Link
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 border-r border-[#dcdde1] text-center align-top">
                         <button 
                            onClick={() => setEditingResult({...test})}
                            className="bg-white border border-[#dcdde1] text-[#2f3640] px-2 py-1 rounded-[4px] font-semibold hover:bg-gray-50 transition text-[11px] flex items-center mx-auto gap-1"
                         >
                           <CheckSquare className="w-3 h-3" /> Update
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Result Edit Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center backdrop-blur-[1px] p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col border border-[#dcdde1]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#dcdde1] bg-[#f8f9fa] rounded-t-[8px]">
              <h3 className="font-bold text-[16px] text-[#2f3640] tracking-[-0.3px]">
                Log Result: {editingResult.TestID}
              </h3>
              <button 
                onClick={() => setEditingResult(null)} 
                className="text-[#7f8c8d] hover:text-[#2f3640] hover:bg-gray-200 rounded p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 text-[13px] space-y-4">
              
              <div className="bg-[#f8f9fa] border border-[#dcdde1] p-4 rounded-[4px] mb-4">
                <h4 className="font-bold text-[#2f3640] mb-2">{editingResult.TestID} - {editingResult.TestName}</h4>
                <div className="grid grid-cols-2 gap-4 text-[#7f8c8d]">
                  <div><span className="font-semibold text-[#2f3640]">Category:</span> {editingResult.Category || '-'}</div>
                  <div><span className="font-semibold text-[#2f3640]">Priority:</span> {editingResult.PriorityDefault || '-'}</div>
                </div>
                {(editingResult.Description || editingResult.DescriptionLink) && (
                  <div className="mt-3 pt-3 border-t border-[#dcdde1]">
                    {editingResult.Description && (
                      <div className="mb-2">
                        <span className="font-semibold text-[#2f3640] block mb-1">Description / Procedure:</span>
                        <div className="whitespace-pre-wrap text-[#2f3640] text-[12px] bg-white p-2 border border-[#dcdde1] rounded-[4px]">{editingResult.Description}</div>
                      </div>
                    )}
                    {editingResult.DescriptionLink && (
                      <div>
                        <span className="font-semibold text-[#2f3640] block mb-1">External Link:</span>
                        <a href={editingResult.DescriptionLink} target="_blank" rel="noopener noreferrer" className="text-[#3498db] hover:underline flex items-center gap-1 text-[12px]">
                          <LinkIcon className="w-3 h-3" /> {editingResult.DescriptionLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {editingResult.PassFailCriteria && (
                  <div className="mt-3 pt-3 border-t border-[#dcdde1]">
                    <div className="p-3 bg-green-50/50 border border-green-200 rounded-[4px]">
                      <span className="font-bold text-[#27ae60] block mb-1 flex items-center gap-1.5 uppercase text-[11px] tracking-[0.5px]">
                        <CheckSquare className="w-3.5 h-3.5" /> Pass/Fail Criteria
                      </span>
                      <div className="whitespace-pre-wrap text-[#2f3640] text-[12px]">{editingResult.PassFailCriteria}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Execution Status</label>
                <select 
                  value={editingResult.Status || 'Pending'} 
                  onChange={e => setEditingResult({...editingResult, Status: e.target.value})}
                  className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 bg-white focus:outline-none focus:border-[#3498db]"
                >
                  <option value="Pending">Pending / Waiting</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Actual Duration ({editingResult.RunningTime_Unit || 'Units'})</label>
                <input 
                  type="text" 
                  value={editingResult.ActualTime_Value || ''} 
                  onChange={e => setEditingResult({...editingResult, ActualTime_Value: e.target.value})}
                  placeholder="e.g. 5.5"
                  className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Report Link URL</label>
                <input 
                  type="text" 
                  value={editingResult.ReportLink || ''} 
                  onChange={e => setEditingResult({...editingResult, ReportLink: e.target.value})}
                  placeholder="https://docs.google.com/..."
                  className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.5px] font-bold text-[#7f8c8d] mb-1.5">Execution Notes / Bug ID</label>
                <textarea 
                  value={editingResult.Notes || ''} 
                  onChange={e => setEditingResult({...editingResult, Notes: e.target.value})}
                  placeholder="Notes on execution, related bug tickets..."
                  rows={3}
                  className="w-full border border-[#dcdde1] rounded-[4px] px-3 py-2 focus:outline-none focus:border-[#3498db]"
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t border-[#dcdde1] bg-[#f8f9fa] flex justify-end gap-3 rounded-b-[8px]">
              <button 
                onClick={() => setEditingResult(null)}
                className="px-4 py-2 bg-white border border-[#dcdde1] text-[#2f3640] rounded-[4px] font-semibold text-[13px] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveResult}
                className="px-4 py-2 bg-[#27ae60] border border-[#27ae60] text-white rounded-[4px] font-semibold text-[13px] hover:bg-[#219653] transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Result
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
