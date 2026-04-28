import React from 'react';
import { ProjectWorkspace, TestRecord } from '../types';

export default function Dashboard({ workspace }: { workspace: ProjectWorkspace }) {
  // Collect all unique test IDs that are currently assigned to any active plan/configuration
  const activeTestIds = new Set<string>();
  workspace.configurations.forEach(config => {
    config.testIds.forEach(id => activeTestIds.add(id));
  });

  // Only calculate metrics for tests that are part of an active configuration
  const tests = workspace.masterList.filter(t => activeTestIds.has(t.TestID));
  const total = tests.length;
  
  const passed = tests.filter(t => t.Status.toLowerCase() === 'passed').length;
  const failed = tests.filter(t => t.Status.toLowerCase() === 'failed').length;
  const ongoing = tests.filter(t => t.Status.toLowerCase() === 'ongoing').length;
  const pending = tests.filter(t => !t.Status || t.Status.toLowerCase() === 'pending' || t.Status.toLowerCase() === 'waiting').length;
  
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  let totalEstimatedTime = 0;
  tests.forEach(t => {
    const val = parseFloat(t.RunningTime_Value as string);
    if (!isNaN(val)) totalEstimatedTime += val;
  });

  const configHierarchy: { config: import('../types').TestConfiguration, depth: number }[] = [];
  const buildConfigHierarchy = (parentId?: string, depth = 0) => {
    const children = workspace.configurations.filter(c => c.parentId === parentId);
    children.forEach(c => {
      configHierarchy.push({ config: c, depth });
      buildConfigHierarchy(c.id, depth + 1);
    });
  };
  buildConfigHierarchy(undefined, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full p-6 bg-[#f0f2f5] text-[#2f3640]">
      <div className="mb-6">
        <h2 className="text-[22px] font-bold tracking-[-0.5px]">Project Dashboard</h2>
        <p className="text-[14px] text-[#7f8c8d]">Performance and status overview for {workspace.projectName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-[8px] border border-[#dcdde1] shadow-[0_1px_3px_rgba(0,0,0,0.02)]" title="Tests currently included in any active plan">
          <div className="text-[12px] font-bold text-[#7f8c8d] uppercase tracking-[0.5px] whitespace-nowrap">Active Tests</div>
          <div className="text-[32px] font-bold text-[#2f3640]">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-[8px] border border-[#dcdde1] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="text-[12px] font-bold text-[#7f8c8d] uppercase tracking-[0.5px]">Completion %</div>
          <div className="text-[32px] font-bold text-[#3498db]">{passRate}%</div>
        </div>
        <div className="bg-white p-5 rounded-[8px] border border-[#dcdde1] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="text-[12px] font-bold text-[#7f8c8d] uppercase tracking-[0.5px]">Estimated Time</div>
          <div className="text-[32px] font-bold text-[#f39c12]">{totalEstimatedTime} <span className="text-[14px] font-normal text-[#7f8c8d]">units</span></div>
        </div>
        <div className="bg-white p-5 rounded-[8px] border border-[#dcdde1] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="text-[12px] font-bold text-[#7f8c8d] uppercase tracking-[0.5px]">Active Plans</div>
          <div className="text-[32px] font-bold text-[#27ae60]">{workspace.configurations.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-[8px] border-[#dcdde1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h3 className="font-bold text-[16px] mb-4">Status Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="font-semibold text-[#27ae60]">Passed</span>
                <span>{passed} / {total}</span>
              </div>
              <div className="w-full bg-[#f1f2f6] rounded-full h-2">
                <div className="bg-[#27ae60] h-2 rounded-full" style={{ width: `${total > 0 ? (passed/total)*100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="font-semibold text-[#e74c3c]">Failed</span>
                <span>{failed} / {total}</span>
              </div>
              <div className="w-full bg-[#f1f2f6] rounded-full h-2">
                <div className="bg-[#e74c3c] h-2 rounded-full" style={{ width: `${total > 0 ? (failed/total)*100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="font-semibold text-[#f39c12]">Ongoing</span>
                <span>{ongoing} / {total}</span>
              </div>
              <div className="w-full bg-[#f1f2f6] rounded-full h-2">
                <div className="bg-[#f39c12] h-2 rounded-full" style={{ width: `${total > 0 ? (ongoing/total)*100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="font-semibold text-[#7f8c8d]">Pending/Waiting</span>
                <span>{pending} / {total}</span>
              </div>
              <div className="w-full bg-[#f1f2f6] rounded-full h-2">
                <div className="bg-[#7f8c8d] h-2 rounded-full" style={{ width: `${total > 0 ? (pending/total)*100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-[8px] border-[#dcdde1] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h3 className="font-bold text-[16px] mb-4">Sub-Plans (Configurations)</h3>
          {workspace.configurations.length === 0 ? (
            <div className="text-[13px] text-[#7f8c8d]">No active plans created.</div>
          ) : (
            <div className="space-y-3 lg:max-h-[300px] overflow-y-auto pr-2">
              {configHierarchy.map(({ config, depth }) => {
                const planTests = tests.filter(t => config.testIds.includes(t.TestID));
                const planTotal = planTests.length;
                const planPassed = planTests.filter(t => t.Status.toLowerCase() === 'passed').length;
                const planPct = planTotal > 0 ? Math.round((planPassed / planTotal) * 100) : 0;
                
                return (
                  <div key={config.id} className="border border-[#dcdde1] rounded-[4px] p-3" style={{ marginLeft: depth * 16 + 'px' }}>
                    <div className="flex justify-between text-[13px] font-bold mb-2">
                      <span className="flex items-center gap-1.5 text-[#2f3640]">
                        {depth > 0 && <span className="text-[#bdc3c7]">└</span>}
                        {config.name}
                      </span>
                      <span className={planPct === 100 ? "text-[#27ae60]" : "text-[#3498db]"}>{planPct}% complete</span>
                    </div>
                    <div className="w-full bg-[#f1f2f6] rounded-full h-1.5">
                      <div className="bg-[#3498db] h-1.5 rounded-full" style={{ width: `${planPct}%` }}></div>
                    </div>
                    <div className="mt-2 text-[11px] text-[#7f8c8d]">
                      {planPassed} / {planTotal} tests passed
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
