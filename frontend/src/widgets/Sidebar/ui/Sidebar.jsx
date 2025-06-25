import React, { useCallback, useEffect, useRef, useState } from 'react';
import { routersData } from '../../../app/data';
import { useLocation, useNavigate } from 'react-router-dom';
import { BiChevronsRight, BiUser } from 'react-icons/bi';
import SidebarWrapper from './SidebarWrapper';
import { ThemeEnum } from '../../../shared/constants/theme';
import FunctionsIcon from '@mui/icons-material/Functions';

const Sidebar = ({ username }) => {
  const [minimize, setMinimize] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState([]);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const localion = useLocation();

  const openLocationSubmenus = useCallback(() => {
    let previousPath = '';

    const locationSplit = localion.pathname.split('/').filter(item => item.length);

    locationSplit.pop();

    const locationPaths = locationSplit.map(item => {
      previousPath += '/' + item;
      return previousPath;
    });

    locationPaths.forEach((item, index) => toggleSubmenu(item, index));
  }, [localion]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (openSubmenus.length && !buttonRef.current?.contains(event.target)) {
        setOpenSubmenus([]);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openSubmenus.length]);

  const toggleMenu = () => {
    setMinimize(!minimize);
    setOpenSubmenus([]);
  };

  const toggleSubmenu = (path, level = 0) => {
    const isOpen = openSubmenus.includes(path);

    if (level === 0) {
      if (isOpen) {
        setOpenSubmenus([]);
        return;
      }

      setOpenSubmenus([path]);
      return;
    }

    if (isOpen) {
      setOpenSubmenus(prevSubmenus => prevSubmenus.filter(item => !item.startsWith(path)));
      return;
    }

    setOpenSubmenus(prevSubmenus => [...prevSubmenus, path]);
  };

  const onProfileClick = () => {
    navigate('/profile');
  };

  const renderItems = (items, level = 0, parentPath = '') =>
    items.map(item => {
      const currentPath = `${parentPath}${item.path}`;
      const isOpen = openSubmenus.includes(currentPath);
      const isCurrentPath =
        ((!openSubmenus.length || level !== 0) &&
          (localion.pathname === currentPath ||
            (currentPath === '/' &&
              (localion.pathname.startsWith('/laboratory/') ||
                localion.pathname.startsWith('/laboratories/') ||
                localion.pathname.startsWith('/departments/'))))) ||
        isOpen;
      const context = minimize ? item.icon : item.label;

      const openSubmenu = e => {
        e.stopPropagation();
        setMinimize(false);

        if (localion.pathname !== '/' && localion.pathname.startsWith(currentPath)) {
          openLocationSubmenus();
          return;
        }

        toggleSubmenu(currentPath, level);
      };

      const navigateOnClick = () => {
        if (location.pathname === currentPath) return;

        navigate(currentPath || '/');
        setOpenSubmenus([]);
      };

      return (
        <li key={currentPath} className="sidebar-item">
          <div
            ref={buttonRef}
            className={` ${isCurrentPath ? 'menu-item-active' : 'menu-item'} item-level-${level}`}
            onClick={
              item.children?.length && !item.doNotShowChildrenInSidebar
                ? openSubmenu
                : navigateOnClick
            }
            style={{
              transition: '0.3s',
            }}
          >
            {context}
          </div>

          {item.children?.length && !item.doNotShowChildrenInSidebar && isOpen && (
            <ul
              className={`submenu level-${level + 1}`}
              style={minimize && level === 0 ? { marginLeft: 60 } : { marginLeft: 200 }}
            >
              <div className="submenu-title">{item.label}</div>

              {renderItems(item.children, level + 1, currentPath)}
            </ul>
          )}
        </li>
      );
    });

  return (
    <SidebarWrapper ref={buttonRef} collapsed={minimize} themelocal={ThemeEnum.light}>
      <div className="content">
        <div className="logo-container">
          <FunctionsIcon
            sx={{
              fontSize: minimize ? 55 : 75,
              color: '#fff',
              transition: 'all 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
                transform: 'scale(1.03)',
              },
            }}
            onClick={() => navigate('/')}
          />
        </div>

        <ul className="sidebar">{renderItems(routersData)}</ul>
      </div>

      <div className="footer">
        <BiChevronsRight className="arrowButton" size={25} onClick={toggleMenu} />

        <div className="user" onClick={onProfileClick}>
          <BiUser className="user-icon" size={25} />

          {!minimize && username && <p className="user-name">{username}</p>}
        </div>
      </div>
    </SidebarWrapper>
  );
};

export default Sidebar;
