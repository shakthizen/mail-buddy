import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { TemplateList } from './pages/TemplateList';
import { TemplateEditor } from './pages/TemplateEditor';
import { Assets } from './pages/Assets';
import { Suppressions } from './pages/Suppressions';
import { ApiKeys } from './pages/settings/ApiKeys';
import { Smtp } from './pages/settings/Smtp';
import { Storage } from './pages/settings/Storage';
import { Users } from './pages/settings/Users';

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
            <Route path="/settings/smtp" element={<Smtp />} />
            <Route path="/settings/storage" element={<Storage />} />
            <Route path="/settings/api-keys" element={<ApiKeys />} />
            <Route path="/settings/users" element={<Users />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
