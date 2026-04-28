import * as XLSX from 'xlsx';
import { TestRecord, ProjectWorkspace } from '../types';

export const parseExcelFile = async (file: File): Promise<TestRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        // Assume first sheet is the master list
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet);
        
        // Map to TestRecord, handling missing columns gracefully
        const records: TestRecord[] = rawData.map((row: any) => ({
          TestID: (row.TestID || row['Test ID'] || row.testid || row['TestID '])?.toString() || '',
          TestName: row.TestName || row['Test Name'] || '',
          Category: row.Category || '',
          ScopeLevel: row.ScopeLevel || row['Scope Level'] || '',
          ScopeTags: row.ScopeTags || row['Scope Tags'] || '',
          AppliesToPath: row.AppliesToPath || row['Applies To Path'] || '',
          PriorityDefault: row.PriorityDefault || row['Priority Default'] || '',
          ExecutionModeDefault: row.ExecutionModeDefault || row['Execution Mode Default'] || '',
          Status: row.Status || 'Pending',
          ActiveTime_Value: row.ActiveTime_Value || row['ActiveTime_Value'] || row['Active Time Value'] || '',
          RunningTime_Value: row.RunningTime_Value || row['RunningTime_Value'] || row['Running Time Value'] || '',
          RunningTime_Unit: row.RunningTime_Unit || row['RunningTime_Unit'] || row['Running Time Unit'] || '',
          DecisionRule: row.DecisionRule || row['Decision Rule'] || '',
          MinLimit: row.MinLimit || row['Min Limit'] || '',
          MaxLimit: row.MaxLimit || row['Max Limit'] || '',
          TargetValue: row.TargetValue || row['Target Value'] || '',
          AcceptanceUnit: row.AcceptanceUnit || row['Acceptance Unit'] || '',
          AcceptanceSourceType: row.AcceptanceSourceType || row['Acceptance Source Type'] || '',
          SourceRef: row.SourceRef || row['Source Ref'] || '',
          Notes: row.Notes || '',
          ReportLink: row.ReportLink || row['Report Link'] || '',
          ActualTime_Value: row.ActualTime_Value || row['ActualTime_Value'] || row['Actual Time Value'] || '',
          ParentTestID: (row.ParentTestID || row['ParentTestID'] || row['Parent Test ID'] || row['Parent ID'])?.toString() || '',
          Description: row.Description || row['Test Description'] || '',
          DescriptionLink: row.DescriptionLink || row['DescriptionLink'] || row['Description Link'] || '',
          PassFailCriteria: row.PassFailCriteria || row['PassFailCriteria'] || row['Pass Fail Criteria'] || row['Pass/Fail Criteria'] || '',
        }));
        
        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportProjectToExcel = (workspace: ProjectWorkspace) => {
  const workbook = XLSX.utils.book_new();

  // 1. Project Overview
  const projectInfo = [
    { Property: "Project Name", Value: workspace.projectName },
    { Property: "Total Master Tests", Value: workspace.masterList.length },
    { Property: "Total Test Plans", Value: workspace.configurations.length },
    { Property: "Export Date", Value: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() }
  ];
  const infoSheet = XLSX.utils.json_to_sheet(projectInfo);
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Project Overview");

  // 2. Configurations / Plans List
  const configsData = workspace.configurations.map(c => ({
    PlanID: c.id,
    Name: c.name,
    Description: c.description,
    ParentPlanID: c.parentId || 'None',
    AssignedTestsCount: c.testIds.length
  }));
  const configsSheet = XLSX.utils.json_to_sheet(configsData);
  XLSX.utils.book_append_sheet(workbook, configsSheet, "Configurations");

  // 3. Plan Assignments (Combinations)
  const assignments: any[] = [];
  workspace.configurations.forEach(config => {
    config.testIds.forEach(tid => {
      const test = workspace.masterList.find(t => t.TestID === tid);
      assignments.push({
        PlanName: config.name,
        PlanID: config.id,
        TestID: tid,
        TestName: test?.TestName || 'Unknown',
        TestStatus: test?.Status || ''
      });
    });
  });
  if (assignments.length > 0) {
    const assignmentsSheet = XLSX.utils.json_to_sheet(assignments);
    XLSX.utils.book_append_sheet(workbook, assignmentsSheet, "Plan Assignments");
  }

  // 4. Master Data List (Complete list including results/status)
  const masterSheet = XLSX.utils.json_to_sheet(workspace.masterList);
  XLSX.utils.book_append_sheet(workbook, masterSheet, "Master Data List");

  // 5. Create individual sheets for each configuration
  workspace.configurations.forEach(config => {
    // filter records based on selected IDs
    const records = workspace.masterList.filter(record => 
      config.testIds.includes(record.TestID)
    );
    
    // Excel limits sheet names to 31 chars and bans certain characters
    let sheetName = config.name.replace(/[\\/*?:[\]]/g, '').substring(0, 31).trim();
    const reservedNames = ["Master Data List", "Configurations", "Project Overview", "Plan Assignments"];
    if (!sheetName || reservedNames.includes(sheetName)) {
      sheetName = `Plan_${config.id.substring(0, 8)}`;
    }
    
    // Fallback if records are empty
    const configSheet = records.length > 0 ? XLSX.utils.json_to_sheet(records) : XLSX.utils.aoa_to_sheet([["TestID"]]);
    XLSX.utils.book_append_sheet(workbook, configSheet, sheetName);
  });

  const exportName = workspace.projectName 
    ? `${workspace.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_complete_export.xlsx` 
    : `project_complete_export.xlsx`;
  
  // Write and download
  XLSX.writeFile(workbook, exportName);
};
