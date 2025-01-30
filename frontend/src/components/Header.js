import React from 'react';
import { AppBar, Toolbar, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';
import { useNavigate } from 'react-router-dom';
import './styles/Header.css';

function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  return (
    <AppBar position="static" className="app-header">
      <Toolbar disableGutters className="header-toolbar">
        <Box
          className="header-content"
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.03)',
              '& .header-icon': {
                color: '#2196f3',
              },
              '& .header-text': {
                background: 'linear-gradient(45deg, #2196f3 30%, #3f51b5 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(33, 150, 243, 0.1)',
              },
            },
          }}
        >
          <FunctionsIcon
            sx={{
              fontSize: isMobile ? 28 : 32,
              color: '#1976d2',
              transition: 'all 0.3s ease-in-out',
            }}
            className="header-icon"
          />
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            component="h1"
            className="header-text"
            sx={{
              color: '#2c3e50',
              fontWeight: 700,
              letterSpacing: '0.3px',
              background: 'linear-gradient(45deg, #1976d2 30%, #2c3e50 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transition: 'all 0.3s ease-in-out',
            }}
          >
            Обработка экспериментальных данных
          </Typography>
        </Box>
        <Typography
          variant={isMobile ? 'subtitle1' : 'h6'}
          component="div"
          className="username"
          sx={{
            marginLeft: 'auto',
            color: '#2c3e50',
            fontWeight: 700,
            letterSpacing: '0.3px',
            background: 'linear-gradient(45deg, #1976d2 30%, #2c3e50 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Хрипушин Данила Павлович
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
