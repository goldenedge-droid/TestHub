export interface TestRecord {
  TestID: string;
  TestName: string;
  Category: string;
  ScopeLevel: string;
  ScopeTags: string;
  AppliesToPath: string;
  PriorityDefault: string;
  ExecutionModeDefault: string;
  Status: string; // E.g., Pending, Ongoing, Passed, Failed
  ActiveTime_Value: string | number;
  RunningTime_Value: string | number;
  RunningTime_Unit: string;
  DecisionRule: string;
  MinLimit: string;
  MaxLimit: string;
  TargetValue: string;
  AcceptanceUnit: string;
  AcceptanceSourceType: string;
  SourceRef: string;
  Notes: string;
  ReportLink?: string;
  ActualTime_Value?: string | number;
  ParentTestID?: string;
  Description?: string;
  DescriptionLink?: string;
  PassFailCriteria?: string;
}

export interface TestConfiguration {
  id: string;
  name: string;
  description: string;
  testIds: string[]; // references TestID
  parentId?: string;
}

export interface ProjectWorkspace {
  id: string;
  projectName: string;
  masterList: TestRecord[];
  configurations: TestConfiguration[];
}
