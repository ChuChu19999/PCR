import { BiHelpCircle, BiHomeAlt2, BiFile, BiWrench } from 'react-icons/bi';
import EquipmentPage from '../pages/EquipmentPage/EquipmentPage';
import HelpPage from '../pages/HelpPage/HelpPage';
import MainPage from '../pages/MainPage/MainPage';
import ProtocolsPage from '../pages/ProtocolsPage/ProtocolsPage';

export const routersData = [
  {
    label: 'Главная страница',
    path: '/',
    icon: <BiHomeAlt2 size={20} />,
    element: <MainPage />,
  },
  {
    label: 'Протоколы',
    path: '/protocols',
    icon: <BiFile size={20} />,
    element: <ProtocolsPage />,
  },
  {
    label: 'Приборы',
    path: '/equipment',
    icon: <BiWrench size={20} />,
    element: <EquipmentPage />,
  },
  {
    label: 'Помощь',
    path: '/help',
    icon: <BiHelpCircle size={20} />,
    element: <HelpPage />,
  },
];
