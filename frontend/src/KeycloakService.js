import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  realm: 'GDU',
  url: 'https://kc.gd-urengoy.gazprom.ru',
  clientId: 'web-client',
});

let keycloakInitialized = false;

const KeycloakService = {
  init: async () => {
    if (keycloakInitialized) {
      return keycloak.tokenParsed;
    }
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    });
    if (authenticated) {
      keycloakInitialized = true;
      const parsedToken = keycloak.tokenParsed;
      console.log('Содержимое токена:', parsedToken);

      // обработчик события истечения токена
      keycloak.onTokenExpired = async () => {
        console.log('Токен истёк, попытка обновления...');
        try {
          await keycloak.updateToken(5);
          console.log('Токен успешно обновлён!');
        } catch (error) {
          console.error('Не удалось обновить токен, повторная аутентификация:', error);
          keycloak.login();
        }
      };
      return parsedToken;
    } else {
      keycloak.login();
      throw new Error('Не удалось провести аутентификацию.');
    }
  },

  login: () => {
    keycloak.login();
  },

  logout: () => {
    keycloak.logout();
  },

  getToken: () => {
    return keycloak.token;
  },

  getRefreshToken: () => {
    return keycloak.refreshToken;
  },

  updateToken: minValidity => {
    return keycloak.updateToken(minValidity);
  },

  getTokenParsed: () => {
    return keycloak.tokenParsed;
  },

  getUsername: () => {
    return keycloak.tokenParsed?.fullName;
  },
};

export default KeycloakService;
