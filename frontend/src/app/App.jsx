import 'ag-grid-enterprise';
import '../shared/assets/fonts/fonts.css';
import './App.css';
import { LicenseManager } from 'ag-grid-enterprise';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { routersData } from './data';
import Content from './Content/Content';
import LoadingPage from '../pages/LoadingPage/LoadingPage';
import Page404 from '../pages/errorPages/Page404/Page404';
import KeycloakService from '../KeycloakService';
import LaboratoryPage from '../pages/LaboratoryPage/LaboratoryPage';

LicenseManager.setLicenseKey('BOARD4ALL_NDEwMjM1MTIwMDAwMA==8f4481b5cc626ad79fe91bc5f4e52e3d');

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaff, setIsStaff] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    const initializeKeycloak = async () => {
      try {
        const tokenData = await KeycloakService.init();
        setIsAuthenticated(true);
        setUsername(tokenData.fullName);

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
      }
    };

    initializeKeycloak();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleFadeOutComplete = () => {
    setShowLoadingScreen(false);
  };

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
        {showLoadingScreen && (
          <LoadingPage isLoading={isLoading} onFadeOutComplete={handleFadeOutComplete} />
        )}
        <Routes>
          <Route path="/" element={<Content />}>
            <Route path="/laboratory/:id" element={<LaboratoryPage />} />
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
