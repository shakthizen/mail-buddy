import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { TemplateList } from './pages/TemplateList';
import { TemplateEditor } from './pages/TemplateEditor';
import { Assets } from './pages/Assets';
import { Suppressions } from './pages/Suppressions';
import { ApiKeys } from './pages/settings/ApiKeys';
import { SmtpStorage } from './pages/settings/SmtpStorage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/templates" replace />} />
            <Route path="/templates" element={<TemplateList />} />
            <Route path="/templates/new" element={<TemplateEditor />} />
            <Route path="/templates/:id" element={<TemplateEditor />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/suppressions" element={<Suppressions />} />
            <Route path="/settings/api-keys" element={<ApiKeys />} />
            <Route path="/settings/smtp" element={<SmtpStorage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
