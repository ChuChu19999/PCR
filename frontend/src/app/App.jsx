import 'ag-grid-enterprise';
import '../shared/assets/fonts/fonts.css';
import './App.css';
import { LicenseManager } from 'ag-grid-enterprise';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { routersData } from './data';
import Content from './Content/Content';
import LoadingPage from '../pages/LoadingPage/LoadingPage';
import Page404 from '../pages/errorPages/Page404/Page404';
import KeycloakService from '../KeycloakService';
import LaboratoryPage from '../pages/LaboratoryPage/LaboratoryPage';
import OilProductsPage from '../pages/OilProductsPage/OilProductsPage.jsx';
import ResearchMethodPage from '../pages/ResearchMethodPage/ResearchMethodPage.jsx';
import axios from 'axios';

// Глобальная конфигурация для сообщений
message.config({
  top: 20,
  duration: 3,
  maxCount: 3,
  rtl: false,
  getContainer: () => document.body,
});

LicenseManager.setLicenseKey('BOARD4ALL_NDEwMjM1MTIwMDAwMA==8f4481b5cc626ad79fe91bc5f4e52e3d');

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaff, setIsStaff] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const initializeKeycloak = async () => {
      try {
        const tokenData = await KeycloakService.init();
        setIsAuthenticated(true);
        setUsername(tokenData.fullName);
        console.log('username в App.jsx:', tokenData.fullName);

        // Добавляем интерсептор axios после инициализации Keycloak
        axios.interceptors.request.use(async config => {
          await KeycloakService.updateToken(5);
          const token = KeycloakService.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        });

        // Запрос на получение данных пользователя
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/`);
        setIsStaff(response.data.is_staff);
      } catch (error) {
        console.error('Не удалось инициализировать Keycloak:', error);
      } finally {
        setIsLoading(false);
        setShowLoadingScreen(false);
      }
    };

    initializeKeycloak();
  }, []);

  const getAllRoutes = (routes, basePath = '') => {
    let allRoutes = [];

    routes.forEach(route => {
      const fullPath = `${basePath}${route.path}`;
      allRoutes.push({ path: fullPath, element: route.element });

      if (route.children) {
        allRoutes = allRoutes.concat(getAllRoutes(route.children, fullPath));
      }
    });

    return allRoutes;
  };

  const allRoutes = useMemo(() => getAllRoutes(routersData), [routersData]);

  return (
    <div>
      <BrowserRouter>
        {showLoadingScreen && isLoading && <LoadingPage isLoading={isLoading} />}
        <Routes>
          <Route path="/" element={<Content username={username} />}>
            <Route path="/laboratory/:id" element={<LaboratoryPage />} />
            <Route path="/laboratories/:id/oil-products" element={<OilProductsPage />} />
            <Route path="/departments/:id/oil-products" element={<OilProductsPage />} />
            <Route path="/research-method" element={<ResearchMethodPage />} />
            <>
              {allRoutes.map((item, index) => (
                <Route key={`${item.path}-${index}`} path={item.path} element={item.element} />
              ))}
              <Route path="*" element={<Page404 />} />
            </>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
