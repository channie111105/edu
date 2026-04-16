import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const lazyModules = import.meta.glob<{ default: React.ComponentType<any> }>([
  './components/Layout.tsx',
  './pages/*.tsx',
]);

type LazyModulePath = keyof typeof lazyModules;

const lazyComponentCache = new Map<LazyModulePath, React.LazyExoticComponent<React.ComponentType<any>>>();

const RouteLoader = () => (
  <div className="flex h-full min-h-[240px] items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
    Dang tai...
  </div>
);

type RouteErrorBoundaryProps = {
  path: LazyModulePath;
  children: React.ReactNode;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`Failed to render route ${this.props.path}`, error);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (prevProps.path !== this.props.path && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[320px] items-center justify-center bg-slate-50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-red-200 bg-white p-6 shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Route Error</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Khong the hien thi trang nay</h2>
            <p className="mt-3 text-sm text-slate-600">
              Module <span className="font-semibold text-slate-900">{this.props.path}</span> da gay loi khi render.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
              <p className="font-semibold text-red-300">{this.state.error.message}</p>
              {this.state.error.stack ? (
                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                  {this.state.error.stack}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const getLazyComponent = (path: LazyModulePath) => {
  const cached = lazyComponentCache.get(path);
  if (cached) return cached;

  const loader = lazyModules[path];
  if (!loader) {
    throw new Error(`Missing lazy module: ${path}`);
  }

  const component = React.lazy(loader as () => Promise<{ default: React.ComponentType<any> }>);
  lazyComponentCache.set(path, component);
  return component;
};

const renderLazyRoute = (path: LazyModulePath) => {
  const Component = getLazyComponent(path);

  return (
    <RouteErrorBoundary path={path}>
      <React.Suspense fallback={<RouteLoader />}>
        <Component />
      </React.Suspense>
    </RouteErrorBoundary>
  );
};

// Placeholder components
const PlaceholderPage = ({ title, sub }: { title: string, sub?: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-gray-500">
    <h2 className="text-2xl font-bold mb-2 text-gray-800">{title}</h2>
    <p>{sub || 'Chức năng đang được phát triển.'}</p>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : renderLazyRoute('./pages/LoginPage.tsx')}
      />
      <Route path="/module-selection" element={renderLazyRoute('./pages/ModuleSelectionPage.tsx')} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={renderLazyRoute('./components/Layout.tsx')}>
          <Route index element={renderLazyRoute('./pages/Dashboard.tsx')} />

          {/* Admin Routes */}
          <Route path="admin/users" element={renderLazyRoute('./pages/AdminUserManagement.tsx')} />
          <Route path="admin/integrations" element={renderLazyRoute('./pages/AdminIntegration.tsx')} />
          <Route path="admin/permissions" element={renderLazyRoute('./pages/AdminPermissions.tsx')} />
          <Route path="admin/system-config" element={renderLazyRoute('./pages/AdminSystemConfig.tsx')} />
          <Route path="admin/automation" element={renderLazyRoute('./pages/AdminAutomationRules.tsx')} />
          <Route path="admin/audit-logs" element={renderLazyRoute('./pages/AdminAuditLogs.tsx')} />
          <Route path="admin/templates" element={renderLazyRoute('./pages/AdminTemplates.tsx')} />
          <Route path="admin/dedup-rules" element={renderLazyRoute('./pages/AdminDedupRules.tsx')} />
          <Route path="admin/pricing" element={renderLazyRoute('./pages/AdminPricingStrategy.tsx')} />
          <Route path="admin/payment-templates" element={renderLazyRoute('./pages/AdminPaymentTemplates.tsx')} />

          {/* Advanced Admin Features (Phase 2) */}
          <Route path="admin/custom-fields" element={renderLazyRoute('./pages/AdminCustomFields.tsx')} />
          <Route path="admin/form-builder" element={renderLazyRoute('./pages/AdminFormBuilder.tsx')} />
          <Route path="admin/workflow-builder" element={renderLazyRoute('./pages/AdminWorkflowBuilder.tsx')} />

          <Route path="marketing" element={renderLazyRoute('./pages/MarketingDashboard.tsx')} />
          <Route path="marketing/collaborators" element={renderLazyRoute('./pages/Collaborators.tsx')} />
          <Route path="leads" element={renderLazyRoute('./pages/Leads.tsx')} />

          {/* SALES SPECIFIC ROUTES */}
          <Route path="sales/my-leads" element={renderLazyRoute('./pages/MyLeads.tsx')} />
          <Route path="sales/my-contacts" element={renderLazyRoute('./pages/MyContacts.tsx')} />
          <Route path="sales/meetings" element={renderLazyRoute('./pages/SalesMeetings.tsx')} />
          <Route path="marketing/sla-leads" element={renderLazyRoute('./pages/SLALeadList.tsx')} />
          <Route path="sales/kpis" element={renderLazyRoute('./pages/SalesKPIs.tsx')} />

          <Route path="leads/import" element={renderLazyRoute('./pages/LeadImport.tsx')} />
          <Route path="leads/batches" element={renderLazyRoute('./pages/LeadBatches.tsx')} />
          <Route path="leads/deduplication" element={renderLazyRoute('./pages/DuplicateDetection.tsx')} />
          <Route path="leads/:id" element={renderLazyRoute('./pages/LeadDetailsRouter.tsx')} />
          <Route path="leads/:id/sla" element={renderLazyRoute('./pages/LeadSLAPage.tsx')} />
          <Route path="campaigns" element={renderLazyRoute('./pages/Campaigns.tsx')} />
          <Route path="campaigns/:id" element={renderLazyRoute('./pages/CampaignDetails.tsx')} />
          <Route path="campaigns/:id/evaluation" element={renderLazyRoute('./pages/CampaignEvaluation.tsx')} />
          <Route path="pipeline" element={renderLazyRoute('./pages/Pipeline.tsx')} />
          <Route path="pipeline/:id" element={renderLazyRoute('./pages/DealDetails.tsx')} />

          {/* Contracts Module */}
          <Route path="contracts/dashboard" element={renderLazyRoute('./pages/ContractDashboard.tsx')} />
          <Route path="contracts" element={renderLazyRoute('./pages/Contracts.tsx')} />
          <Route path="contracts/students/:id" element={renderLazyRoute('./pages/ContractStudentDetail.tsx')} />
          <Route path="contracts/contracts-list" element={renderLazyRoute('./pages/EnrollmentContracts.tsx')} />
          <Route path="contracts/quotations" element={renderLazyRoute('./pages/Quotations.tsx')} />
          <Route path="contracts/quotations/:id/contract" element={renderLazyRoute('./pages/ContractPreview.tsx')} />
          <Route path="contracts/quotations/:id" element={renderLazyRoute('./pages/QuotationDetails.tsx')} />
          <Route path="/enrollment/students" element={renderLazyRoute('./pages/Students.tsx')} />
          <Route path="contracts/new" element={renderLazyRoute('./pages/Contracts.tsx')} />
          <Route path="contracts/templates" element={renderLazyRoute('./pages/ContractTemplates.tsx')} />
          <Route path="contracts/approvals" element={renderLazyRoute('./pages/ContractApprovalQueue.tsx')} />
          <Route path="contracts/:id" element={renderLazyRoute('./pages/ContractDetails.tsx')} />

          {/* Student Routes (Sales View) */}
          <Route path="students" element={renderLazyRoute('./pages/StudentList.tsx')} />
          <Route path="students/:id" element={renderLazyRoute('./pages/StudentProfile.tsx')} />

          {/* Training Routes (New & Enhanced) */}
          <Route path="training/classes" element={renderLazyRoute('./pages/TrainingClassList.tsx')} />
          <Route path="training/classes/:id/attendance" element={renderLazyRoute('./pages/TrainingAttendance.tsx')} />
          <Route path="training/classes/:id/grades" element={renderLazyRoute('./pages/TrainingGradebook.tsx')} />
          <Route path="training/classes/:id/resources" element={renderLazyRoute('./pages/TrainingResources.tsx')} />

          <Route path="training/schedule" element={renderLazyRoute('./pages/TrainingSchedule.tsx')} />
          <Route path="training/students/:id/app-progress" element={renderLazyRoute('./pages/TrainingAppProgress.tsx')} />
          <Route path="training/teachers" element={renderLazyRoute('./pages/TrainingTeachers.tsx')} />
          <Route path="training/teachers/:id" element={renderLazyRoute('./pages/TeacherDetails.tsx')} />

          {/* Library (Formerly Teacher Portal) */}
          <Route path="library" element={renderLazyRoute('./pages/DocumentLibrary.tsx')} />

          {/* Study Abroad Routes */}
          <Route path="study-abroad" element={renderLazyRoute('./pages/StudyAbroadDashboard.tsx')} />
          <Route path="study-abroad/pipeline" element={renderLazyRoute('./pages/StudyAbroadPipelineBoard.tsx')} />
          <Route path="study-abroad/cases" element={renderLazyRoute('./pages/StudyAbroadStudentList.tsx')} />
          <Route path="study-abroad/cases/:id" element={renderLazyRoute('./pages/StudyAbroadCaseDetail.tsx')} />
          <Route path="study-abroad/partners" element={renderLazyRoute('./pages/StudyAbroadPartners.tsx')} />
          <Route path="study-abroad/interviews" element={renderLazyRoute('./pages/StudyAbroadInterviews.tsx')} />
          <Route path="study-abroad/students" element={<Navigate to="/study-abroad/cases" replace />} />

          {/* Finance Routes */}
          <Route path="refunds" element={renderLazyRoute('./pages/FinanceRefunds.tsx')} />
          <Route path="refunds/:id" element={renderLazyRoute('./pages/FinanceRefundDetail.tsx')} />
          <Route path="finance/transactions" element={renderLazyRoute('./pages/FinanceTransactions.tsx')} />
          <Route path="finance/invoices" element={renderLazyRoute('./pages/FinanceInvoices.tsx')} />
          <Route path="finance/rules" element={renderLazyRoute('./pages/FinanceServiceRules.tsx')} />
          <Route path="finance/gateway-logs" element={renderLazyRoute('./pages/FinanceGatewayLogs.tsx')} />
          <Route path="finance/money-out" element={renderLazyRoute('./pages/FinanceMoneyOut.tsx')} />
          <Route path="finance/debts" element={renderLazyRoute('./pages/FinanceDebtList.tsx')} />
          <Route path="finance/inventory" element={renderLazyRoute('./pages/FinanceInventory.tsx')} />
          <Route path="finance/payroll" element={renderLazyRoute('./pages/FinancePayroll.tsx')} />
          <Route path="finance/closing" element={renderLazyRoute('./pages/FinancePeriodClosing.tsx')} />
          <Route path="finance/integration" element={renderLazyRoute('./pages/FinanceIntegration.tsx')} />
          <Route path="payment-plans/:id" element={renderLazyRoute('./pages/FinancePaymentPlan.tsx')} />
          <Route path="finance/transaction/new" element={renderLazyRoute('./pages/FinanceNewTransaction.tsx')} />
          <Route path="finance/transactions-list" element={renderLazyRoute('./pages/FinanceMoneyOut.tsx')} />

          <Route path="reports" element={<PlaceholderPage title="Advanced Reports" />} />
          <Route path="settings" element={<Navigate to="/settings/assignment-rules" replace />} />
          <Route path="settings/assignment-rules" element={renderLazyRoute('./pages/AssignmentRules.tsx')} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
