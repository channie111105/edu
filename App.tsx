import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MarketingDashboard from './pages/MarketingDashboard';
import Leads from './pages/Leads';
import MyLeads from './pages/MyLeads'; // New Import
import MyContacts from './pages/MyContacts'; // New Import
import LeadDetailsRouter from './pages/LeadDetailsRouter'; // Smart Router for role-based views
import LeadSLAPage from './pages/LeadSLAPage';
import LeadImport from './pages/LeadImport';
import LeadBatches from './pages/LeadBatches';
import LoginPage from './pages/LoginPage';
import AssignmentRules from './pages/AssignmentRules';
import Pipeline from './pages/Pipeline';
import DealDetails from './pages/DealDetails';
import DuplicateDetection from './pages/DuplicateDetection';
import Campaigns from './pages/Campaigns';
import StudentList from './pages/StudentList';
import StudentProfile from './pages/StudentProfile';
import Contracts from './pages/Contracts';
import ContractDetails from './pages/ContractDetails';
import ContractTemplates from './pages/ContractTemplates';
import ContractApprovalQueue from './pages/ContractApprovalQueue';
import FinanceRefunds from './pages/FinanceRefunds';
import FinancePaymentPlan from './pages/FinancePaymentPlan';
import FinanceNewTransaction from './pages/FinanceNewTransaction';
import FinanceTransactionQueue from './pages/FinanceTransactionQueue';
import FinanceInvoices from './pages/FinanceInvoices';
import FinanceServiceRules from './pages/FinanceServiceRules';
import FinanceGatewayLogs from './pages/FinanceGatewayLogs';
import FinanceMoneyOut from './pages/FinanceMoneyOut';
import FinanceInventory from './pages/FinanceInventory';
import FinancePayroll from './pages/FinancePayroll';
import FinancePeriodClosing from './pages/FinancePeriodClosing';
import FinanceIntegration from './pages/FinanceIntegration';
import TrainingClassList from './pages/TrainingClassList';
import TrainingStudentList from './pages/TrainingStudentList';
import TrainingSchedule from './pages/TrainingSchedule';
import TrainingAttendance from './pages/TrainingAttendance';
import TrainingGradebook from './pages/TrainingGradebook';
import TrainingResources from './pages/TrainingResources';
import TrainingFeedback from './pages/TrainingFeedback';
import TrainingCertificates from './pages/TrainingCertificates';
import TrainingCourses from './pages/TrainingCourses';
import TrainingEnrollment from './pages/TrainingEnrollment';
import TrainingAppProgress from './pages/TrainingAppProgress';
import TeacherDashboard from './pages/TeacherDashboard';
import TrainingAutomation from './pages/TrainingAutomation';
import StudyAbroadDashboard from './pages/StudyAbroadDashboard';
import StudyAbroadPipeline from './pages/StudyAbroadPipeline';
import StudyAbroadCaseDetail from './pages/StudyAbroadCaseDetail';
import StudyAbroadPartners from './pages/StudyAbroadPartners';
import StudyAbroadInterviews from './pages/StudyAbroadInterviews';
import StudyAbroadFinance from './pages/StudyAbroadFinance';
import StudyAbroadServices from './pages/StudyAbroadServices';
import StudyAbroadAgents from './pages/StudyAbroadAgents';
import MarketingEvents from './pages/MarketingEvents';
import AdminIntegration from './pages/AdminIntegration';
import AdminPermissions from './pages/AdminPermissions';
import AdminSystemConfig from './pages/AdminSystemConfig';
import AdminAutomationRules from './pages/AdminAutomationRules';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminTemplates from './pages/AdminTemplates';
import AdminDedupRules from './pages/AdminDedupRules';
import AdminPricingStrategy from './pages/AdminPricingStrategy';
import AdminPaymentTemplates from './pages/AdminPaymentTemplates';
import AdminCustomFields from './pages/AdminCustomFields';
import AdminFormBuilder from './pages/AdminFormBuilder';
import AdminWorkflowBuilder from './pages/AdminWorkflowBuilder';
import SLALeadList from './pages/SLALeadList'; // New Import

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
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Admin Routes */}
          <Route path="admin/users" element={<AdminUserManagement />} />
          <Route path="admin/integrations" element={<AdminIntegration />} />
          <Route path="admin/permissions" element={<AdminPermissions />} />
          <Route path="admin/system-config" element={<AdminSystemConfig />} />
          <Route path="admin/automation" element={<AdminAutomationRules />} />
          <Route path="admin/audit-logs" element={<AdminAuditLogs />} />
          <Route path="admin/templates" element={<AdminTemplates />} />
          <Route path="admin/dedup-rules" element={<AdminDedupRules />} />
          <Route path="admin/pricing" element={<AdminPricingStrategy />} />
          <Route path="admin/payment-templates" element={<AdminPaymentTemplates />} />

          {/* Advanced Admin Features (Phase 2) */}
          <Route path="admin/custom-fields" element={<AdminCustomFields />} />
          <Route path="admin/form-builder" element={<AdminFormBuilder />} />
          <Route path="admin/workflow-builder" element={<AdminWorkflowBuilder />} />

          <Route path="marketing" element={<MarketingDashboard />} />
          <Route path="marketing/events" element={<MarketingEvents />} />
          <Route path="leads" element={<Leads />} />

          {/* SALES SPECIFIC ROUTES */}
          <Route path="sales/my-leads" element={<MyLeads />} />
          <Route path="sales/my-contacts" element={<MyContacts />} />
          <Route path="sales/sla-leads" element={<SLALeadList />} />

          <Route path="leads/import" element={<LeadImport />} />
          <Route path="leads/batches" element={<LeadBatches />} />
          <Route path="leads/deduplication" element={<DuplicateDetection />} />
          <Route path="leads/:id" element={<LeadDetailsRouter />} />
          <Route path="leads/:id/sla" element={<LeadSLAPage />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="pipeline/:id" element={<DealDetails />} />

          {/* Contracts Module */}
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<Contracts />} />
          <Route path="contracts/templates" element={<ContractTemplates />} />
          <Route path="contracts/approvals" element={<ContractApprovalQueue />} />
          <Route path="contracts/:id" element={<ContractDetails />} />

          {/* Student Routes (Sales View) */}
          <Route path="students" element={<StudentList />} />
          <Route path="students/:id" element={<StudentProfile />} />

          {/* Training Routes (New & Enhanced) */}
          <Route path="training/courses" element={<TrainingCourses />} />
          <Route path="training/enrollment" element={<TrainingEnrollment />} />
          <Route path="training/classes" element={<TrainingClassList />} />
          <Route path="training/classes/:id/attendance" element={<TrainingAttendance />} />
          <Route path="training/classes/:id/grades" element={<TrainingGradebook />} />
          <Route path="training/classes/:id/resources" element={<TrainingResources />} />
          <Route path="training/feedback" element={<TrainingFeedback />} />
          <Route path="training/certificates" element={<TrainingCertificates />} />
          <Route path="training/students" element={<TrainingStudentList />} />
          <Route path="training/schedule" element={<TrainingSchedule />} />
          <Route path="training/students/:id/app-progress" element={<TrainingAppProgress />} />
          <Route path="training/automation" element={<TrainingAutomation />} />

          {/* Teacher Portal Routes */}
          <Route path="teacher/classes" element={<TeacherDashboard />} />
          <Route path="teacher/schedule" element={<PlaceholderPage title="Lịch dạy của tôi" sub="Xem lịch dạy cá nhân và lịch nghỉ lễ" />} />

          {/* Study Abroad Routes */}
          <Route path="study-abroad" element={<StudyAbroadDashboard />} />
          <Route path="study-abroad/pipeline" element={<StudyAbroadPipeline />} />
          <Route path="study-abroad/cases/:id" element={<StudyAbroadCaseDetail />} />
          <Route path="study-abroad/partners" element={<StudyAbroadPartners />} />
          <Route path="study-abroad/interviews" element={<StudyAbroadInterviews />} />
          <Route path="study-abroad/finance" element={<StudyAbroadFinance />} />
          <Route path="study-abroad/services" element={<StudyAbroadServices />} />
          <Route path="study-abroad/agents" element={<StudyAbroadAgents />} />

          {/* Finance Routes */}
          <Route path="refunds" element={<FinanceRefunds />} />
          <Route path="finance/transactions" element={<FinanceTransactionQueue />} />
          <Route path="finance/invoices" element={<FinanceInvoices />} />
          <Route path="finance/rules" element={<FinanceServiceRules />} />
          <Route path="finance/gateway-logs" element={<FinanceGatewayLogs />} />
          <Route path="finance/money-out" element={<FinanceMoneyOut />} />
          <Route path="finance/inventory" element={<FinanceInventory />} />
          <Route path="finance/payroll" element={<FinancePayroll />} />
          <Route path="finance/closing" element={<FinancePeriodClosing />} />
          <Route path="finance/integration" element={<FinanceIntegration />} />
          <Route path="payment-plans/:id" element={<FinancePaymentPlan />} />
          <Route path="finance/transaction/new" element={<FinanceNewTransaction />} />

          <Route path="reports" element={<PlaceholderPage title="Advanced Reports" />} />
          <Route path="settings" element={<Navigate to="/settings/assignment-rules" replace />} />
          <Route path="settings/assignment-rules" element={<AssignmentRules />} />
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
