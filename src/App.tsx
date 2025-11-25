import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import ukUA from 'antd/locale/uk_UA';
import { useTranslation } from 'react-i18next';
import { queryClient } from './api/queryClient';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Forms from './pages/Forms';
import Submissions from './pages/Submissions';
import SubmitFormPage from './pages/SubmitFormPage';
import CreateFormPage from './pages/CreateFormPage';
import SuperAdmin from './pages/SuperAdmin';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { i18n } = useTranslation();
  const antdLocale = i18n.language === 'uk' ? ukUA : enUS;

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={antdLocale}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/submit-form/:formId" element={<SubmitFormPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AppLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/forms" />} />
              <Route path="forms" element={<Forms />} />
              <Route path="forms/create" element={<CreateFormPage />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="super-admin" element={<SuperAdmin />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
