import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  realm: 'GDU',
  url: 'https://kc.gd-urengoy.gazprom.ru',
  clientId: 'web-client-dev',
});

// Переменная для отслеживания инициализации Keycloak
let keycloakInitialized = false;
// Переменная для хранения таймера автообновления токена
let tokenRefreshInterval;

const KeycloakService = {
  //  Инициализация Keycloak
  init: async () => {
    if (keycloakInitialized) {
      return keycloak.tokenParsed;
    }

    const authenticated = await keycloak.init({
      onLoad: 'check-sso', // Проверяем, вошел ли пользователь (silent check)
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html', // URL для silent SSO
    });

    if (authenticated) {
      keycloakInitialized = true;
      const parsedToken = keycloak.tokenParsed;
      console.log('Содержимое токена:', parsedToken);

      // Устанавливаем обработчик события истечения токена
      keycloak.onTokenExpired = async () => {
        console.log('Токен истёк, попытка обновления...');
        try {
          await KeycloakService.updateToken(30);
          console.log('Токен успешно обновлён!');
        } catch (error) {
          console.error('Не удалось обновить токен, повторная аутентификация:', error);
          keycloak.login();
        }
      };

      // Запускаем автообновление токена
      KeycloakService.startTokenRefresh();

      return parsedToken;
    } else {
      keycloak.login(); // Если не аутентифицирован, выполняем вход
      throw new Error('Не удалось провести аутентификацию.');
    }
  },

  // Выполнить вход
  login: () => {
    keycloak.login();
  },

  // Выполнить выход
  logout: () => {
    KeycloakService.stopTokenRefresh(); // Останавливаем автообновление токена
    keycloak.logout();
  },

  // Получить текущий токен
  getToken: () => {
    return keycloak.token;
  },

  //  Получить refresh-токен
  getRefreshToken: () => {
    return keycloak.refreshToken;
  },

  //  Обновить токен, minValidity Минимальная валидность токена (в секундах)
  updateToken: minValidity => {
    return keycloak.updateToken(minValidity);
  },

  // Проверка токена итечёт ли в течении указанного времени в секундах
  isTokenExpired: expiredTime => {
    return keycloak.isTokenExpired(expiredTime);
  },

  // Получить ФИО пользователя
  getUsername: () => {
    return keycloak.tokenParsed?.full_name;
  },

  // Запустить автообновление токена
  startTokenRefresh: () => {
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }

    // Проверяем токен каждую минуту
    tokenRefreshInterval = setInterval(async () => {
      try {
        const isExpired = await keycloak.isTokenExpired(30); // Проверяем, истечет ли токен в течение 30 секунд
        if (isExpired) {
          console.log('Токен скоро истечет, обновляем...');
          await KeycloakService.updateToken(30);
          console.log('Токен обновлён автоматически.');
        }
      } catch (error) {
        // если не получилось обновить или ошибка логиним по новому
        console.error('Ошибка при проверке/обновлении токена:', error);
        keycloak.login();
      }
    }, 60000);
  },

  // Остановить автообновление токена
  stopTokenRefresh: () => {
    if (tokenRefreshInterval) {
      clearTimeout(tokenRefreshInterval);
      tokenRefreshInterval = null;
    }
  },
};

export default KeycloakService;
