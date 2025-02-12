import "ag-grid-enterprise";
import "../shared/assets/fonts/fonts.css";
import "./App.css";
import { LicenseManager } from "ag-grid-enterprise";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { routersData } from './data'
import Content from './Content/Content';
import LoadingPage from '../pages/LoadingPage/LoadingPage';
import Page404 from '../pages/errorPages/Page404/Page404';
import KeycloakService from '../KeycloakService';

LicenseManager.setLicenseKey(
  "BOARD4ALL_NDEwMjM1MTIwMDAwMA==8f4481b5cc626ad79fe91bc5f4e52e3d",
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  // const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Симуляция загрузки данных
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Замените на реальный запрос данных

    const initKeycloak = async () => {
      try {
        await KeycloakService.init();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Ошибка инициализации Keycloak:', error);
      }
    };

    initKeycloak();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleFadeOutComplete = () => {
    setShowLoadingScreen(false);
  };

  const getAllRoutes = (routes, basePath = "") => {
    let allRoutes = [];

    routes.forEach((route) => {
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
      {/* <React.StrictMode> */}
      <BrowserRouter>
        {showLoadingScreen && (
          <LoadingPage
            isLoading={isLoading}
            onFadeOutComplete={handleFadeOutComplete}
          />
        )}
        <Routes>
          <Route path="/" element={<Content />}>
            <>
              {allRoutes.map((item, index) => (
                <Route
                  key={`${item.path}-${index}`}
                  path={item.path}
                  element={item.element}
                />
              ))}
              <Route path="*" element={<Page404 />} />
            </>
          </Route>
        </Routes>
      </BrowserRouter>
      {/* </React.StrictMode> */}
    </div>
  );
}
